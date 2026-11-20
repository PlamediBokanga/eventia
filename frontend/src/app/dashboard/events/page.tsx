"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { TinyMceEditor } from "@/components/ui/TinyMceEditor";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventCoOrganizer,
  type EventItem
} from "@/lib/dashboard";
import { sanitizeInvitationHtml } from "@/lib/invitationSanitizer";
import { normalizePublicUrl } from "@/lib/url";

const INVITATION_TEMPLATES = [
  {
    id: "wedding",
    label: "Mariage élégant",
    html: `<h2>Invitation</h2><p>Chers invités,</p><p>Nous avons l'honneur de vous convier à notre célébration.</p><ul><li>Accueil des invités</li><li>Cérémonie</li><li>Réception</li></ul><p>Votre présence rendra ce moment inoubliable.</p>`
  },
  {
    id: "birthday",
    label: "Anniversaire chic",
    html: `<h2>Invitation à un anniversaire</h2><p>Bonjour,</p><p>Vous êtes cordialement invité(e) à partager un moment festif.</p><p><strong>Tenue :</strong> élégante et colorée.</p><p>Merci de confirmer votre présence.</p>`
  },
  {
    id: "corporate",
    label: "Événement professionnel",
    html: `<h2>Invitation professionnelle</h2><p>Madame, Monsieur,</p><p>Nous avons le plaisir de vous inviter à cet événement.</p><ul><li>Rencontres professionnelles</li><li>Présentation</li><li>Cocktail</li></ul><p>Nous serions ravis de vous compter parmi nous.</p>`
  }
];

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventSearch, setEventSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"details" | "invitation" | "program" | "layout" | "design">("details");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { pushToast } = useToast();

  const [name, setName] = useState("");
  const [type, setType] = useState("mariage");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [program, setProgram] = useState("");
  const [programItems, setProgramItems] = useState<
    Array<{ id?: number; timeLabel: string; title: string; description?: string }>
  >([]);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("wedding");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [hostNames, setHostNames] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [themePreset, setThemePreset] = useState("classic");
  const [primaryColor, setPrimaryColor] = useState("#0B1C2C");
  const [accentColor, setAccentColor] = useState("#9B6B2F");
  const [fontFamily, setFontFamily] = useState("Inter, system-ui, sans-serif");
  const [animationStyle, setAnimationStyle] = useState("soft");
  const [tableCount, setTableCount] = useState(10);
  const [capacityPerTable, setCapacityPerTable] = useState(8);
  const [seatingMode, setSeatingMode] = useState<"TABLE" | "ZONE" | "NONE">("TABLE");
  const [coOrganizerEmail, setCoOrganizerEmail] = useState("");
  const [coOrganizers, setCoOrganizers] = useState<EventCoOrganizer[]>([]);
  const [coOrganizerInvites, setCoOrganizerInvites] = useState<
    Array<{ id: number; email: string; createdAt: string; inviteLink: string }>
  >([]);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [ownerIdentity, setOwnerIdentity] = useState<{ email: string; name?: string | null } | null>(null);
  const [canManageCoHosts, setCanManageCoHosts] = useState(false);
  const [coHostLoading, setCoHostLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [coOrganizerToRemove, setCoOrganizerToRemove] = useState<EventCoOrganizer | null>(null);
  const [inviteToRemove, setInviteToRemove] = useState<{ id: number; email: string } | null>(null);
  const [coHostDeleteLoading, setCoHostDeleteLoading] = useState(false);

  const visibleEvents = useMemo(() => {
    const query = eventSearch.trim().toLocaleLowerCase("fr");
    if (!query) return events;
    return events.filter(event => `${event.name} ${event.type} ${event.location}`.toLocaleLowerCase("fr").includes(query));
  }, [events, eventSearch]);

  async function loadEvents() {
    let res: Response;
    try {
      res = await authFetch("/events");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Le serveur ne répond pas.";
      setLoadError(message);
      setActionError(null);
      pushToast(`Chargement des événements impossible. ${message}`, "error");
      return;
    }
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      let message = raw.trim();
      try {
        const parsed = raw ? (JSON.parse(raw) as { message?: string }) : null;
        message = parsed?.message || message;
      } catch {
        // ignore non-JSON error bodies
      }
      const friendlyMessage = message || "Impossible de charger les événements.";
      setLoadError(friendlyMessage);
      setActionError(null);
      console.error("GET /events failed", { status: res.status, message: friendlyMessage, raw });
      pushToast(friendlyMessage + " (HTTP " + res.status + ").", "error");
      return;
    }
    const data = (await res.json()) as EventItem[];
    setLoadError(null);
    setActionError(null);
    setEvents(data);
    if (data.length > 0) {
      const savedId = getSelectedEventId();
      const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
      setSelectedEvent(chosen);
      setSelectedEventId(chosen.id);
    } else {
      setSelectedEvent(null);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        await loadEvents();
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    if (!selectedEvent) {
      setCoOrganizers([]);
      setOwnerIdentity(null);
      setCanManageCoHosts(false);
      return;
    }
    setName(selectedEvent.name);
    setType(selectedEvent.type);
    setDateTime(selectedEvent.dateTime.slice(0, 16));
    setLocation(selectedEvent.location);
    setAddress(selectedEvent.address ?? "");
    setDetails(selectedEvent.details ?? "");
    setProgram(selectedEvent.program ?? "");
    setProgramItems(
      (selectedEvent.programItems ?? []).map(item => ({
        id: item.id,
        timeLabel: item.timeLabel,
        title: item.title,
        description: item.description ?? ""
      }))
    );
    setInvitationMessage(selectedEvent.invitationMessage ?? "");
    setCoverImageUrl(selectedEvent.coverImageUrl ?? "");
    setHostNames(selectedEvent.hostNames ?? "");
    setLogoUrl(selectedEvent.logoUrl ?? "");
    setThemePreset(selectedEvent.themePreset ?? "classic");
    setPrimaryColor(selectedEvent.primaryColor ?? "#0B1C2C");
    setAccentColor(selectedEvent.accentColor ?? "#9B6B2F");
    setFontFamily(selectedEvent.fontFamily ?? "Inter, system-ui, sans-serif");
    setAnimationStyle(selectedEvent.animationStyle ?? "soft");
    setTableCount(selectedEvent.tableCount ?? 0);
    setCapacityPerTable(selectedEvent.capacityPerTable ?? 0);
    setSeatingMode(selectedEvent.seatingMode ?? "TABLE");
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent) return;
    void loadCoOrganizers(selectedEvent.id);
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (seatingMode === "NONE") {
      setTableCount(0);
      setCapacityPerTable(0);
    }
  }, [seatingMode]);

  function clearFormForCreate() {
    setActiveSection("details");
    setName("");
    setType("mariage");
    setDateTime("");
    setLocation("");
    setAddress("");
    setDetails("");
    setInvitationMessage("");
    setProgram("");
    setProgramItems([]);
    setCoverImageUrl("");
    setHostNames("");
    setLogoUrl("");
    setThemePreset("classic");
    setPrimaryColor("#0B1C2C");
    setAccentColor("#9B6B2F");
    setFontFamily("Inter, system-ui, sans-serif");
    setAnimationStyle("soft");
    setTableCount(10);
    setCapacityPerTable(8);
    setSeatingMode("TABLE");
    setCoOrganizerEmail("");
    setCoOrganizers([]);
    setOwnerIdentity(null);
    setCanManageCoHosts(false);
    setSelectedEvent(null);
    window.localStorage.removeItem("eventia_selected_event_id");
  }

  async function loadCoOrganizers(eventId: number) {
    setCoHostLoading(true);
    try {
      const res = await authFetch(`/events/${eventId}/co-organizers`);
      if (!res.ok) {
        setCoOrganizers([]);
        setOwnerIdentity(null);
        setCanManageCoHosts(false);
        return;
      }
      const payload = (await res.json()) as {
        owner: { email: string; name?: string | null } | null;
        coOrganizers: EventCoOrganizer[];
        canManage: boolean;
      };
      setOwnerIdentity(payload.owner);
      setCoOrganizers(payload.coOrganizers);
      setCanManageCoHosts(payload.canManage);
      const inviteRes = await authFetch(`/events/${eventId}/co-organizers/invites`);
      if (inviteRes.ok) {
        setCoOrganizerInvites(await inviteRes.json());
      }
    } finally {
      setCoHostLoading(false);
    }
  }

  async function addCoOrganizer() {
    if (!selectedEvent || !coOrganizerEmail.trim()) return;
    setLastInviteLink(null);
    const res = await authFetch(`/events/${selectedEvent.id}/co-organizers/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: coOrganizerEmail.trim() })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Ajout impossible.", "error");
      return;
    }
    const payload = (await res.json().catch(() => null)) as { inviteLink?: string } | null;
    setCoOrganizerEmail("");
    if (payload?.inviteLink) {
      setLastInviteLink(payload.inviteLink);
      pushToast("Invitation créée.");
    } else {
      pushToast("Co-organisateur ajouté.");
    }
    await loadCoOrganizers(selectedEvent.id);
    await loadEvents();
  }

  async function removeCoOrganizer(coOrganizerId: number) {
    if (!selectedEvent) return;
    setCoHostDeleteLoading(true);
    const res = await authFetch(`/events/${selectedEvent.id}/co-organizers/${coOrganizerId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Suppression impossible.", "error");
      setCoHostDeleteLoading(false);
      return;
    }
    pushToast("Co-organisateur retiré.");
    await loadCoOrganizers(selectedEvent.id);
    await loadEvents();
    setCoHostDeleteLoading(false);
  }

  async function removeInvite(inviteId: number) {
    if (!selectedEvent) return;
    setCoHostDeleteLoading(true);
    const res = await authFetch(`/events/${selectedEvent.id}/co-organizers/invites/${inviteId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Suppression impossible.", "error");
      setCoHostDeleteLoading(false);
      return;
    }
    pushToast("Invitation retirée.");
    await loadCoOrganizers(selectedEvent.id);
    setCoHostDeleteLoading(false);
  }

  function askRemoveCoOrganizer(item: EventCoOrganizer) {
    setCoOrganizerToRemove(item);
  }

  function askRemoveInvite(invite: { id: number; email: string }) {
    setInviteToRemove(invite);
  }

  async function confirmRemoveCoOrganizer() {
    if (!coOrganizerToRemove) return;
    const target = coOrganizerToRemove;
    setCoOrganizerToRemove(null);
    await removeCoOrganizer(target.id);
  }

  async function confirmRemoveInvite() {
    if (!inviteToRemove) return;
    const target = inviteToRemove;
    setInviteToRemove(null);
    await removeInvite(target.id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !type.trim() || !dateTime || !location.trim()) {
      setActiveSection("details");
      pushToast("Nom, type, date et lieu sont obligatoires.", "error");
      return;
    }
    setActionError(null);
    setCreating(true);
    try {
      const cleanedInvitation = sanitizeInvitationHtml(invitationMessage);
      const res = await authFetch("/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          dateTime,
          location,
          address,
          details,
          program,
          programItems,
          invitationMessage: cleanedInvitation,
          coverImageUrl,
          hostNames,
          seatingMode,
          logoUrl,
          themePreset,
          primaryColor,
          accentColor,
          fontFamily,
          animationStyle,
          tableCount,
          capacityPerTable
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string; details?: string } | null;
        const detail = payload?.details ? ` Detail: ${payload.details}` : payload?.message ? ` ${payload.message}` : "";
        const message = `Création impossible (HTTP ${res.status}).${detail}`;
        pushToast(message, "error");
        return;
      }

      const created = (await res.json()) as EventItem;
      setActionError(null);
      pushToast("Événement créé.");
      await loadEvents();
      setSelectedEvent(created);
      setSelectedEventId(created.id);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!name.trim() || !type.trim() || !dateTime || !location.trim()) {
      setActiveSection("details");
      pushToast("Renseignez le nom, le type, la date et le lieu avant d’enregistrer.", "error");
      return;
    }
    setActionError(null);
    setSaving(true);
    try {
      const cleanedInvitation = sanitizeInvitationHtml(invitationMessage);
      const res = await authFetch(`/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          dateTime,
          location,
          address,
          details,
          program,
          programItems,
          invitationMessage: cleanedInvitation,
          coverImageUrl,
          hostNames,
          seatingMode,
          logoUrl,
          themePreset,
          primaryColor,
          accentColor,
          fontFamily,
          animationStyle,
          tableCount,
          capacityPerTable
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string; details?: string } | null;
        const detail = payload?.details ? ` Detail: ${payload.details}` : payload?.message ? ` ${payload.message}` : "";
        const message = `Mise à jour impossible (HTTP ${res.status}).${detail}`;
        pushToast(message, "error");
        return;
      }
      setActionError(null);
      pushToast("Événement mis à jour.");
      await loadEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        pushToast("Suppression impossible.", "error");
        return;
      }
      pushToast("Événement supprimé.");
      await loadEvents();
      clearFormForCreate();
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm() {
    if (!selectedEvent) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteEvent() {
    if (!selectedEvent) return;
    setDeleteConfirmOpen(false);
    await handleDelete();
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
        reader.readAsDataURL(file);
      });

      const res = await authFetch("/events/upload-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, dataUrl })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Upload image impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { url: string };
      setCoverImageUrl(payload.url);
      pushToast("Photo téléversée.");
    } catch {
      pushToast("Upload image impossible.", "error");
    } finally {
      setUploadingImage(false);
    }
  }

  function applyTemplate() {
    const tpl = INVITATION_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    if (invitationMessage.trim()) {
      setTemplateConfirmOpen(true);
      return;
    }
    setInvitationMessage(tpl.html);
  }

  function confirmTemplateApply() {
    const tpl = INVITATION_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    setTemplateConfirmOpen(false);
    setInvitationMessage(tpl.html);
  }

  const previewCoverImageUrl = normalizePublicUrl(coverImageUrl);

  const editorSections = [
    { id: "details", label: "Informations", helper: "Nom, date et lieu" },
    { id: "invitation", label: "Invitation", helper: "Message et aperçu" },
    { id: "program", label: "Programme", helper: "Étapes et horaires" },
    { id: "layout", label: "Placement", helper: "Tables et capacité" },
    { id: "design", label: "Apparence", helper: "Thème et identité" }
  ] as const;

  return (
    <main className="space-y-6 pb-8 font-sans">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gestion de vos activités</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Événements</h1>
          <p className="mt-1 text-sm text-slate-600">Créez et gérez les informations, invitations et paramètres de chaque événement.</p>
        </div>
        <Button type="button" className="min-h-11 rounded-xl px-4 py-2.5 text-sm" onClick={clearFormForCreate}>
          + Nouvel événement
        </Button>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.8fr)]">
        <section aria-labelledby="events-list-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="events-list-title" className="text-base font-semibold text-slate-950">Vos événements</h2>
              <p className="mt-1 text-xs text-slate-500">{loading ? "Chargement…" : "Sélectionnez un événement à modifier"}</p>
              {!loading ? <span className="mt-2 inline-flex rounded-full bg-[#edf2ee] px-2.5 py-1 text-xs font-semibold text-[#43584b]">{events.length} {events.length > 1 ? "événements" : "événement"}</span> : null}
            </div>
          </div>
          {!loading && events.length > 0 ? (
            <label className="mt-4 block">
              <span className="sr-only">Rechercher un événement</span>
              <Input value={eventSearch} onChange={event => setEventSearch(event.target.value)} placeholder="Rechercher un événement" className="min-h-10 rounded-xl text-sm" />
            </label>
          ) : null}
          {loading ? (
            <div className="mt-4 space-y-3" aria-label="Chargement des événements">
              {[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : loadError ? (
            <div role="alert" className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-semibold">Impossible de charger les événements</p>
              <p className="break-words">{loadError}</p>
              <Button type="button" variant="ghost" className="min-h-10 rounded-lg bg-white px-3 py-2 text-sm text-rose-900" onClick={() => void loadEvents()}>
                Réessayer
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Aucun événement</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Créez votre premier événement pour commencer à gérer les invitations.</p>
              <Button type="button" className="mt-4 min-h-10 rounded-lg px-3 text-sm" onClick={clearFormForCreate}>Créer un événement</Button>
            </div>
          ) : (
            <div className="mt-3 max-h-[min(64vh,620px)] space-y-2 overflow-y-auto pr-1">
              {visibleEvents.length ? visibleEvents.map(event => {
                const active = selectedEvent?.id === event.id;
                const eventDate = new Date(event.dateTime);
                const validDate = Number.isFinite(eventDate.getTime());
                return <button key={event.id} type="button" aria-pressed={active} onClick={() => { setSelectedEvent(event); setSelectedEventId(event.id); setActiveSection("details"); }} className={`group w-full rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#526b5c] ${active ? "border-[#9caf9f] bg-[#f3f6f3] shadow-sm ring-1 ring-[#cbd8cf]" : "border-slate-200 bg-white hover:border-[#cbd8cf] hover:bg-[#f8faf8]"}`}>
                  <span className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 content-center justify-items-center rounded-xl ${active ? "bg-[#526b5c] text-white" : "bg-[#edf2ee] text-[#43584b]"}`}>
                      <span className="text-base font-semibold leading-none">{validDate ? eventDate.toLocaleDateString("fr-FR", { day: "2-digit", timeZone: "Africa/Kinshasa" }) : "—"}</span>
                      <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide">{validDate ? eventDate.toLocaleDateString("fr-FR", { month: "short", timeZone: "Africa/Kinshasa" }).replace(".", "") : "Date"}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{event.name}</span>
                        {active ? <span className="shrink-0 rounded-full bg-[#e2ebe4] px-2 py-0.5 text-[10px] font-semibold text-[#43584b]">Sélectionné</span> : null}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{event.type || "Événement"}{validDate ? ` · ${eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kinshasa" })}` : ""}</span>
                      <span className="mt-1 block truncate text-xs text-slate-600">{event.location || "Lieu à renseigner"}</span>
                    </span>
                  </span>
                </button>;
              }) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"><p>Aucun résultat pour « {eventSearch} ».</p><button type="button" className="mt-2 font-semibold text-[#43584b] underline underline-offset-4" onClick={() => setEventSearch("")}>Effacer la recherche</button></div>}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{selectedEvent ? "Événement sélectionné" : "Nouvel événement"}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedEvent ? `Modifier ${selectedEvent.name}` : "Créer un événement"}</h2>
                <p className="mt-1 text-sm text-slate-600">Les champs marqués comme requis doivent être renseignés.</p>
              </div>
              {selectedEvent ? <Button type="button" variant="ghost" className="min-h-10 rounded-lg px-3 text-sm text-rose-700 hover:bg-rose-50" onClick={openDeleteConfirm}>Supprimer</Button> : null}
            </div>
          </div>
          {actionError ? (
            <div className="mb-3 rounded-3xl border-2 border-red-300 bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 px-4 py-3 text-[12px] leading-6 text-white shadow-2xl shadow-red-950/35 ring-1 ring-red-200/40" role="alert" aria-live="assertive">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-200">Dernière erreur</p>
              <p className="break-words font-semibold text-white">{actionError}</p>
            </div>
          ) : null}
          <form onSubmit={selectedEvent ? handleUpdate : handleCreate} className="text-sm">
            <nav aria-label="Sections du formulaire événement" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2 sm:px-5">
              {editorSections.map(section => <button key={section.id} type="button" aria-pressed={activeSection === section.id} onClick={() => setActiveSection(section.id)} className={`shrink-0 rounded-lg px-3 py-2 text-left transition ${activeSection === section.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                <span className="block text-sm font-semibold">{section.label}</span><span className={`hidden text-[11px] sm:block ${activeSection === section.id ? "text-white/70" : "text-slate-500"}`}>{section.helper}</span>
              </button>)}
            </nav>
            <div className="min-h-[350px] p-4 sm:p-6">
            {activeSection === "details" ? <section aria-label="Informations de l’événement" className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="event-name" className="block text-sm font-medium text-slate-700">Nom de l’événement <span className="text-rose-700">*</span></label>
              <Input id="event-name" value={name} onChange={e => setName(e.target.value)} required className="min-h-11 rounded-lg bg-white text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="event-type" className="block text-sm font-medium text-slate-700">Type <span className="text-rose-700">*</span></label>
                <Input id="event-type" value={type} onChange={e => setType(e.target.value)} required className="min-h-11 rounded-lg bg-white text-sm" />
              </div>
              <div className="space-y-1">
                <label htmlFor="event-datetime" className="block text-sm font-medium text-slate-700">Date et heure <span className="text-rose-700">*</span></label>
                <Input id="event-datetime" type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required className="min-h-11 rounded-lg bg-white text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="event-location" className="block text-sm font-medium text-slate-700">Lieu <span className="text-rose-700">*</span></label>
              <Input id="event-location" value={location} onChange={e => setLocation(e.target.value)} required className="min-h-11 rounded-lg bg-white text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-small">Adresse complète (optionnel)</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-small">Photo de l’activité (optionnel)</label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
                <Input
                  value={coverImageUrl}
                  onChange={e => setCoverImageUrl(e.target.value)}
                  placeholder="URL image ou upload depuis votre appareil"
                />
                <label className="btn-ghost px-3 py-2 text-xs cursor-pointer text-center">
                  {uploadingImage ? "Téléversement…" : "Choisir une photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {coverImageUrl ? (
                <img
                  src={previewCoverImageUrl}
                  alt="Aperçu de la couverture"
                  className="mt-1 h-28 w-full rounded-xl object-cover border border-primary/10"
                />
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-small">Noms des hôtes (optionnel)</label>
              <Input
                value={hostNames}
                onChange={e => setHostNames(e.target.value)}
                placeholder="Ex: Jean & Marie"
              />
            </div>
            <div className="space-y-1">
              <label className="text-small">Logo de l’événement (optionnel)</label>
              <Input
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="URL du logo de l’événement"
              />
            </div>
            </section> : null}
            {activeSection === "design" ? <section aria-label="Apparence de l’événement" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-base font-semibold text-slate-900">Personnalisation visuelle</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-small">Thème</label>
                  <select
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                    value={themePreset}
                    onChange={e => setThemePreset(e.target.value)}
                  >
                    <option value="classic">Classique</option>
                    <option value="elegant">Élégant</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="minimal">Minimaliste</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-small">Animation de la page</label>
                  <select
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                    value={animationStyle}
                    onChange={e => setAnimationStyle(e.target.value)}
                  >
                    <option value="none">Aucune</option>
                    <option value="soft">Apparition douce</option>
                    <option value="float">Flottement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-small">Couleur primaire</label>
                  <Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-small">Couleur accent</label>
                  <Input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1 mt-2">
              <label className="text-small">Typographie</label>
                <Input
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  placeholder="Ex: Georgia, serif"
                />
              </div>
            </div>
            </section> : null}
            {activeSection === "invitation" ? <section aria-label="Message d’invitation" className="space-y-4">
            <div className="space-y-1">
              <label className="text-small">Message d'invitation (optionnel)</label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
                <select
                  className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                >
                  {INVITATION_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={applyTemplate}>
                  Appliquer template
                </Button>
              </div>
              <TinyMceEditor value={invitationMessage} onChange={setInvitationMessage} />
              {invitationMessage.trim() ? (
                <div className="rounded-xl border border-primary/10 bg-background/60 px-3 py-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-text/60">Apercu</p>
                  <div className="text-body-muted">
                    <SafeHtml html={sanitizeInvitationHtml(invitationMessage)} />
                  </div>
                </div>
              ) : null}
            </div>
            </section> : null}
            {activeSection === "program" ? <section aria-label="Programme de l’événement" className="space-y-4">
            <div className="space-y-1">
              <label className="text-small">Details de l'activite (optionnel)</label>
              <textarea
                className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={4}
                placeholder="Informations utiles, dress code, consignes..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-small">Programme detaille (par horaires)</label>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-1 text-[11px]"
                  onClick={() =>
                    setProgramItems(prev => [...prev, { timeLabel: "16:00", title: "", description: "" }])
                  }
                >
                  Ajouter une ligne
                </Button>
              </div>
              {programItems.length === 0 ? (
                <p className="text-small text-textMuted">
                  Aucun programme detaille. Ajoutez des lignes si vous souhaitez afficher les horaires.
                </p>
              ) : (
                <div className="space-y-2">
                  {programItems.map((item, index) => (
                    <div key={`${item.id ?? "new"}-${index}`} className="grid grid-cols-1 md:grid-cols-[110px,1fr,auto] gap-2">
                      <Input
                        value={item.timeLabel}
                        onChange={e =>
                          setProgramItems(prev =>
                            prev.map((row, i) => (i === index ? { ...row, timeLabel: e.target.value } : row))
                          )
                        }
                        placeholder="16:00"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={item.title}
                          onChange={e =>
                            setProgramItems(prev =>
                              prev.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                            )
                          }
                          placeholder="Ceremonie"
                        />
                        <Input
                          value={item.description ?? ""}
                          onChange={e =>
                            setProgramItems(prev =>
                              prev.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                            )
                          }
                          placeholder="Salle principale"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-2 text-[11px]"
                        onClick={() => setProgramItems(prev => prev.filter((_, i) => i !== index))}
                      >
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-small">Programme / deroulement (optionnel)</label>
              <textarea
                className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                value={program}
                onChange={e => setProgram(e.target.value)}
                rows={4}
                placeholder="Ex: 16h Accueil, 17h Ceremonie, 19h Soiree dansante..."
              />
            </div>
            </section> : null}
            {activeSection === "layout" ? <section aria-label="Placement des invités" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-small">Mode d'organisation</label>
                <select
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                  value={seatingMode}
                  onChange={e => setSeatingMode(e.target.value as "TABLE" | "ZONE" | "NONE")}
                >
                  <option value="TABLE">Tables</option>
                  <option value="ZONE">Zones / Sections</option>
                  <option value="NONE">Sans tables/sections</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-small">
                  {seatingMode === "TABLE" ? "Nombre de tables" : "Nombre de zones/sections"}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={tableCount}
                  onChange={e => setTableCount(Number(e.target.value))}
                  disabled={seatingMode === "NONE"}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-small">
                {seatingMode === "TABLE" ? "Capacite par table" : "Capacite par zone/section"}
              </label>
              <Input
                type="number"
                min={0}
                value={capacityPerTable}
                onChange={e => setCapacityPerTable(Number(e.target.value))}
                disabled={seatingMode === "NONE"}
              />
            </div>
            {seatingMode === "NONE" ? (
              <div className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-small">
                Aucun placement n'est requis pour ce type d'activite.
              </div>
            ) : null}
            </section> : null}
            </div>
            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">Les modifications ne sont enregistrées qu’après validation.</p>
              <Button type="submit" className="min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold" disabled={saving || creating || uploadingImage}>
                {selectedEvent ? (saving ? "Enregistrement…" : "Enregistrer les modifications") : creating ? "Création…" : "Créer l’événement"}
              </Button>
            </div>
          </form>

          {selectedEvent ? <div className="border-t border-slate-200 p-4 sm:p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="title-4">Co-organisateurs</p>
                <p className="text-small">Invitez des collaborateurs pour gerer l'evenement avec vous.</p>
              </div>
              {ownerIdentity ? (
                <div className="text-right">
                  <p className="text-small">{ownerIdentity.name || "Owner"}</p>
                  <p className="text-[10px] text-textMuted">{ownerIdentity.email}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-primary/10 bg-background/60 p-3 space-y-2">
              <p className="text-small font-medium">Inviter un co-organisateur</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2">
                <Input
                  placeholder="email@exemple.com"
                  value={coOrganizerEmail}
                  onChange={e => setCoOrganizerEmail(e.target.value)}
                />
                <Button
                  type="button"
                  className="px-4 py-2 text-xs"
                  onClick={addCoOrganizer}
                  disabled={!canManageCoHosts || !coOrganizerEmail.trim()}
                >
                  Envoyer
                </Button>
              </div>
              {!canManageCoHosts ? (
                <p className="text-small">Vous n'avez pas l'autorisation d'inviter des co-organisateurs.</p>
              ) : null}
              {lastInviteLink ? (
                <div className="rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-small break-all">
                  Lien d'invitation genere: {lastInviteLink}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-small">
              <p className="font-medium">Co-organisateurs actifs</p>
              {coHostLoading ? (
                <p className="text-small">Chargement...</p>
              ) : coOrganizers.length === 0 ? (
                <p className="text-small">Aucun co-organisateur.</p>
              ) : (
                <div className="space-y-2">
                  {coOrganizers.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.organizer.name || "Organisateur"}</p>
                        <p className="text-[10px] text-textMuted">{item.organizer.email}</p>
                      </div>
                      {canManageCoHosts ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-1 text-xs"
                          onClick={() => askRemoveCoOrganizer(item)}
                        >
                          Retirer
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-small">
              <p className="font-medium">Invitations en attente</p>
              {coOrganizerInvites.length === 0 ? (
                <p className="text-small">Aucune invitation.</p>
              ) : (
                <div className="space-y-2">
                  {coOrganizerInvites.map(invite => (
                    <div key={invite.id} className="flex flex-col gap-1 border-b border-primary/10 pb-2">
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-[10px] text-textMuted">
                        Cree le {new Date(invite.createdAt).toLocaleString("fr-FR")}
                      </p>
                      <p className="text-[10px] text-textMuted break-all">{invite.inviteLink}</p>
                      {canManageCoHosts ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-fit px-3 py-1 text-xs"
                          onClick={() => askRemoveInvite({ id: invite.id, email: invite.email })}
                        >
                          Supprimer
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div> : null}
        </section>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Supprimer l'activite"
        description="Cette action supprimera l'activite et toutes ses donnees associees. Elle ne peut pas etre annulee."
        confirmLabel="Supprimer"
        variant="danger"
        loading={saving}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteEvent}
      />

      <ConfirmDialog
        open={templateConfirmOpen}
        title="Remplacer le message"
        description="Le message actuel sera remplace par le template selectionne."
        confirmLabel="Remplacer"
        variant="warning"
        onClose={() => setTemplateConfirmOpen(false)}
        onConfirm={confirmTemplateApply}
      />

      <ConfirmDialog
        open={Boolean(coOrganizerToRemove)}
        title="Retirer le co-organisateur"
        description={
          coOrganizerToRemove ? (
            <>
              Le compte <span className="font-semibold text-slate-950">{coOrganizerToRemove.organizer.email}</span>{" "}
              ne pourra plus gerer cet evenement.
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Retirer"
        variant="danger"
        loading={coHostDeleteLoading}
        onClose={() => setCoOrganizerToRemove(null)}
        onConfirm={confirmRemoveCoOrganizer}
      />

      <ConfirmDialog
        open={Boolean(inviteToRemove)}
        title="Supprimer l'invitation"
        description={
          inviteToRemove ? (
            <>
              L'invitation envoyee a <span className="font-semibold text-slate-950">{inviteToRemove.email}</span> sera
              supprimee.
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Supprimer"
        variant="warning"
        loading={coHostDeleteLoading}
        onClose={() => setInviteToRemove(null)}
        onConfirm={confirmRemoveInvite}
      />
    </main>
  );
}

