"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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

const INVITATION_TEMPLATES = [
  {
    id: "wedding",
    label: "Mariage Elegant",
    html: `<h2>Invitation</h2><p>Chers invites,</p><p>Nous avons l'honneur de vous convier a notre celebration.</p><ul><li>Accueil des invites</li><li>Ceremonie</li><li>Reception</li></ul><p>Votre presence rendra ce moment inoubliable.</p>`
  },
  {
    id: "birthday",
    label: "Anniversaire Chic",
    html: `<h2>Invitation Anniversaire</h2><p>Bonjour,</p><p>Vous etes cordialement invite(e) a partager un moment festif.</p><p><strong>Dress code:</strong> elegant et colore.</p><p>Merci de confirmer votre presence.</p>`
  },
  {
    id: "corporate",
    label: "Evenement Corporate",
    html: `<h2>Invitation Professionnelle</h2><p>Madame, Monsieur,</p><p>Nous avons le plaisir de vous inviter a cet evenement.</p><ul><li>Networking</li><li>Presentation</li><li>Cocktail</li></ul><p>Nous serions ravis de vous compter parmi nous.</p>`
  }
];

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
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

  async function loadEvents() {
    const res = await authFetch("/events");
    if (!res.ok) {
      setEvents([]);
      setSelectedEvent(null);
      return;
    }
    const data = (await res.json()) as EventItem[];
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
      pushToast("Invitation creee.");
    } else {
      pushToast("Co-organisateur ajoute.");
    }
    await loadCoOrganizers(selectedEvent.id);
    await loadEvents();
  }

  async function removeCoOrganizer(coOrganizerId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/co-organizers/${coOrganizerId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Suppression impossible.", "error");
      return;
    }
    pushToast("Co-organisateur retire.");
    await loadCoOrganizers(selectedEvent.id);
    await loadEvents();
  }

  async function removeInvite(inviteId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/co-organizers/invites/${inviteId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Suppression impossible.", "error");
      return;
    }
    pushToast("Invitation retiree.");
    await loadCoOrganizers(selectedEvent.id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !type.trim() || !dateTime || !location.trim()) {
      pushToast("Nom, type, date et lieu sont obligatoires.", "error");
      return;
    }
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
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        const detail = payload?.message ? ` ${payload.message}` : "";
        pushToast(`Creation impossible (HTTP ${res.status}).${detail}`, "error");
        return;
      }

      const created = (await res.json()) as EventItem;
      pushToast("Evenement cree.");
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
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        const detail = payload?.message ? ` ${payload.message}` : "";
        pushToast(`Mise a jour impossible (HTTP ${res.status}).${detail}`, "error");
        return;
      }
      pushToast("Evenement mis a jour.");
      await loadEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    if (!window.confirm("Supprimer cet evenement ?")) return;
    setSaving(true);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        pushToast("Suppression impossible.", "error");
        return;
      }
      pushToast("Evenement supprime.");
      await loadEvents();
      clearFormForCreate();
    } finally {
      setSaving(false);
    }
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
      pushToast("Photo telechargee.");
    } catch {
      pushToast("Upload image impossible.", "error");
    } finally {
      setUploadingImage(false);
    }
  }

  function applyTemplate() {
    const tpl = INVITATION_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    if (invitationMessage.trim() && !window.confirm("Remplacer le message actuel par le template ?")) {
      return;
    }
    setInvitationMessage(tpl.html);
  }

  return (
    <main className="space-y-4">
      <Header title="Gestion Evenements" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="title-4">Mes activites</h2>
            <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={clearFormForCreate}>
              Nouvelle activite
            </Button>
          </div>
          {loading ? (
            <p className="text-small">Chargement...</p>
          ) : events.length === 0 ? (
            <EmptyState
              title="Aucun evenement"
              description="Creez votre premiere activite depuis le formulaire a droite."
            />
          ) : (
            <EventPicker
              events={events}
              selectedEventId={selectedEvent?.id}
              onSelect={event => {
                setSelectedEvent(event);
                setSelectedEventId(event.id);
              }}
            />
          )}
        </section>

        <section className="card p-4">
          <h2 className="title-4 mb-3">
            {selectedEvent ? "Modifier l'activite et l'invitation" : "Creer une activite et son invitation"}
          </h2>
          <form onSubmit={selectedEvent ? handleUpdate : handleCreate} className="grid gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-small">Nom de l'activite</label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-small">Type</label>
                <Input value={type} onChange={e => setType(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-small">Date et heure</label>
                <Input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-small">Lieu</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-small">Adresse complete (optionnel)</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-small">Photo de l'activite (optionnel)</label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
                <Input
                  value={coverImageUrl}
                  onChange={e => setCoverImageUrl(e.target.value)}
                  placeholder="URL image ou upload depuis votre appareil"
                />
                <label className="btn-ghost px-3 py-2 text-xs cursor-pointer text-center">
                  {uploadingImage ? "Upload..." : "Telecharger"}
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
                  src={coverImageUrl}
                  alt="Apercu couverture"
                  className="mt-1 h-28 w-full rounded-xl object-cover border border-primary/10"
                />
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-small">Noms des proprietaires / hotes (optionnel)</label>
              <Input
                value={hostNames}
                onChange={e => setHostNames(e.target.value)}
                placeholder="Ex: Jean & Marie"
              />
            </div>
            <div className="space-y-1">
              <label className="text-small">Logo (optionnel)</label>
              <Input
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="URL du logo de l'evenement"
              />
            </div>
            <div className="space-y-1 rounded-xl border border-primary/10 bg-background/60 p-3">
              <p className="text-small font-medium">Personnalisation visuelle</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-small">Theme</label>
                  <select
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                    value={themePreset}
                    onChange={e => setThemePreset(e.target.value)}
                  >
                    <option value="classic">Classic</option>
                    <option value="elegant">Elegant</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-small">Animation</label>
                  <select
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                    value={animationStyle}
                    onChange={e => setAnimationStyle(e.target.value)}
                  >
                    <option value="none">Aucune</option>
                    <option value="soft">Soft reveal</option>
                    <option value="float">Float</option>
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
                <label className="text-small">Police principale</label>
                <Input
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  placeholder="Ex: Georgia, serif"
                />
              </div>
            </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" className="px-5 py-2 text-xs" disabled={saving || creating}>
                {selectedEvent ? (saving ? "Sauvegarde..." : "Mettre a jour") : creating ? "Creation..." : "Creer"}
              </Button>
              {selectedEvent ? (
                <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={handleDelete}>
                  Supprimer
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 space-y-3">
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
                          onClick={() => removeCoOrganizer(item.id)}
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
                          onClick={() => removeInvite(invite.id)}
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
        </section>
      </div>
    </main>
  );
}
