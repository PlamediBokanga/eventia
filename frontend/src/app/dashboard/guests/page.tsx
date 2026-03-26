"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem, type GuestItem } from "@/lib/dashboard";
import { API_URL } from "@/lib/config";

type TableItem = { id: number; label: string };

function statusLabel(status: GuestItem["status"]) {
  if (status === "CONFIRMED") return "Confirme";
  if (status === "CANCELED") return "Annule";
  return "En attente";
}

function statusClass(status: GuestItem["status"]) {
  if (status === "CONFIRMED") return "bg-green-100 text-green-700";
  if (status === "CANCELED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

const CATEGORY_OPTIONS = ["Famille", "Amis", "Collegues", "VIP", "Autre"];

function guestTypeLabel(type?: GuestItem["guestType"] | null) {
  if (type === "COUPLE") return "Couple";
  if (type === "MR") return "Mr";
  if (type === "MME") return "Mme";
  if (type === "MLLE") return "Mlle";
  return "";
}

function displayGuestName(guest: GuestItem) {
  const label = guestTypeLabel(guest.guestType);
  const parts = [label, guest.lastName, guest.middleName, guest.firstName]
    .map(value => (value ?? "").toString().trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : guest.fullName;
}

export default function DashboardGuestsPage() {
  type ShareChannel = "WHATSAPP" | "SMS" | "EMAIL";
  type ReminderPreview = {
    candidatesCount: number;
    totalGuests: number;
    candidates: Array<{
      guestId: number;
      fullName: string;
      phone?: string | null;
      invitationUrl: string;
      message: string;
    }>;
    skipped: {
      missingInvitation: number;
      neverSent: number;
      sentTooRecently: number;
      alreadyOpened: number;
    };
  };

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELED">("ALL");
  const [tableFilter, setTableFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "status">("name");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [addLastName, setAddLastName] = useState("");
  const [addMiddleName, setAddMiddleName] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addSex, setAddSex] = useState<"M" | "F">("M");
  const [addCategory, setAddCategory] = useState("Famille");
  const [addCategoryCustom, setAddCategoryCustom] = useState("");
  const [addGuestType, setAddGuestType] = useState<"COUPLE" | "MR" | "MME" | "MLLE">("MR");
  const [addTableId, setAddTableId] = useState<string>("");
  const [addPersons, setAddPersons] = useState(1);
  const [addError, setAddError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareChannel, setShareChannel] = useState<ShareChannel>("WHATSAPP");
  const [shareGuest, setShareGuest] = useState<GuestItem | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<ShareChannel>("WHATSAPP");
  const [bulkPendingOnly, setBulkPendingOnly] = useState(true);
  const [bulkMessageTemplate, setBulkMessageTemplate] = useState(
    "Bonjour {name}, vous etes invite(e) a {event} le {date}. Voici votre lien personnel: {link}"
  );
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<ShareChannel>("WHATSAPP");
  const [reminderOnlyNotOpened, setReminderOnlyNotOpened] = useState(false);
  const [reminderMinHoursSinceSent, setReminderMinHoursSinceSent] = useState(24);
  const [reminderMaxRecipients, setReminderMaxRecipients] = useState(50);
  const [reminderTemplate, setReminderTemplate] = useState(
    "Rappel RSVP - Bonjour {name}, merci de confirmer votre presence pour {event} ({date}). Lien: {link}"
  );
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editGuestId, setEditGuestId] = useState<number | null>(null);
  const [editLastName, setEditLastName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSex, setEditSex] = useState<"M" | "F">("M");
  const [editCategory, setEditCategory] = useState(CATEGORY_OPTIONS[0] ?? "Famille");
  const [editCategoryCustom, setEditCategoryCustom] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editGuestType, setEditGuestType] = useState<"COUPLE" | "MR" | "MME" | "MLLE">("MR");
  const [editTableId, setEditTableId] = useState<string>("");
  const [editPersons, setEditPersons] = useState(1);
  const [editError, setEditError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const { pushToast } = useToast();

  function seatingLabel(mode: "TABLE" | "ZONE" | "NONE") {
    if (mode === "ZONE") return "Mode: Zones/Sections";
    if (mode === "NONE") return "Mode: Sans tables/sections";
    return "Mode: Tables";
  }

  async function copyInvitation(url?: string | null) {
    if (!url) {
      pushToast("Lien d'invitation indisponible.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      pushToast("Lien copie.");
    } catch {
      pushToast("Impossible de copier le lien.", "error");
    }
  }

  function normalizePhoneForWhatsApp(phone?: string | null) {
    if (!phone) return null;
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (!cleaned) return null;
    return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  }

  function buildInviteMessage(guestName: string, invitationUrl: string) {
    const eventName = selectedEvent?.name ?? "notre evenement";
    const eventDate = selectedEvent?.dateTime
      ? new Date(selectedEvent.dateTime).toLocaleString("fr-FR")
      : "";
    return `Bonjour ${guestName}, vous etes invite(e) a ${eventName}${eventDate ? ` le ${eventDate}` : ""}. Voici votre lien personnel: ${invitationUrl}`;
  }

  function startShare(guest: GuestItem, channel: ShareChannel) {
    const invitationUrl = guest.invitationUrl;
    if (!invitationUrl) {
      pushToast("Lien d'invitation indisponible.", "error");
      return;
    }
    if (channel === "WHATSAPP" || channel === "SMS") {
      const normalizedPhone = normalizePhoneForWhatsApp(guest.phone);
      if (!normalizedPhone) {
        pushToast("Numero de telephone manquant ou invalide.", "error");
        return;
      }
    }
    setShareChannel(channel);
    setShareGuest(guest);
    setShareMessage(buildInviteMessage(displayGuestName(guest), invitationUrl));
    setShareOpen(true);
  }

  function sendShare() {
    if (!shareGuest || !shareGuest.invitationUrl) return;
    const text = encodeURIComponent(shareMessage);

    if (shareChannel === "WHATSAPP") {
      const normalizedPhone = normalizePhoneForWhatsApp(shareGuest.phone);
      if (!normalizedPhone) {
        pushToast("Numero de telephone manquant ou invalide.", "error");
        return;
      }
      const url = `https://wa.me/${normalizedPhone}?text=${text}`;
      window.open(url, "_blank", "noopener,noreferrer");
      void markInvitationSent(shareGuest.id);
      setShareOpen(false);
      return;
    }

    if (shareChannel === "SMS") {
      const normalizedPhone = normalizePhoneForWhatsApp(shareGuest.phone);
      if (!normalizedPhone) {
        pushToast("Numero de telephone manquant ou invalide.", "error");
        return;
      }
      window.open(`sms:${normalizedPhone}?body=${text}`, "_blank", "noopener,noreferrer");
      void markInvitationSent(shareGuest.id);
      setShareOpen(false);
      return;
    }

    const eventName = selectedEvent?.name ?? "Evenement";
    const subject = encodeURIComponent(`Invitation - ${eventName}`);
    window.open(`mailto:?subject=${subject}&body=${text}`, "_blank", "noopener,noreferrer");
    void markInvitationSent(shareGuest.id);
    setShareOpen(false);
  }

  function toggleMenu(guestId: number) {
    setMenuOpenId(prev => (prev === guestId ? null : guestId));
  }

  function extractInvitationToken(invitationUrl?: string | null) {
    if (!invitationUrl) return null;
    const match = invitationUrl.match(/\/invitation\/([a-f0-9]{32})/i);
    return match?.[1] ?? null;
  }

  function getGuestQrUrl(guest: GuestItem) {
    const token = extractInvitationToken(guest.invitationUrl);
    if (!token) return null;
    return `${API_URL}/invitations/${token}/pdf`;
  }

  function escapeCsv(value: string) {
    const needsQuote = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, "\"\"");
    return needsQuote ? `"${escaped}"` : escaped;
  }

  function downloadGuestsCsv() {
    if (!selectedEvent) return;
    const headers = [
      "Type",
      "Nom",
      "Postnom",
      "Prenom",
      "Nom complet",
      "Telephone",
      "Email",
      "Sexe",
      "Categorie",
      "Table",
      "Nombre personnes",
      "Statut"
    ];
    const rows = sortedGuests.map(guest => [
      guestTypeLabel(guest.guestType),
      guest.lastName ?? "",
      guest.middleName ?? "",
      guest.firstName ?? "",
      displayGuestName(guest),
      guest.phone ?? "",
      guest.email ?? "",
      guest.sex ?? "",
      guest.category ?? "",
      guest.table?.label ?? "",
      String(guest.plusOneCount ?? 0),
      statusLabel(guest.status)
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(value => escapeCsv(String(value))).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invites-${selectedEvent.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadGuestsTemplate() {
    const headers = ["Nom", "Telephone", "Table"];
    const sample = ["Jean Mukendi", "+243000000000", "Table 1"];
    const csv = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-invites.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function hexToRgb(hex?: string | null) {
    if (!hex) return null;
    const normalized = hex.replace("#", "").trim();
    if (![3, 6].includes(normalized.length)) return null;
    const full = normalized.length === 3
      ? normalized.split("").map(ch => ch + ch).join("")
      : normalized;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some(v => Number.isNaN(v))) return null;
    return [r, g, b] as const;
  }

  async function downloadGuestsPdf() {
    if (!selectedEvent) return;
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable")
    ]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryRgb = hexToRgb(selectedEvent.primaryColor) ?? [30, 41, 59];
    const accentRgb = ([...(hexToRgb(selectedEvent.accentColor) ?? [59, 130, 246])] as [
      number,
      number,
      number
    ]);
    const title = `Liste des invites`;
    const subtitle = selectedEvent.name;
    const dateLine = selectedEvent.dateTime
      ? new Date(selectedEvent.dateTime).toLocaleString("fr-FR")
      : "";

    doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.rect(0, 0, pageWidth, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(title, 40, 28);
    doc.setFontSize(12);
    doc.text(subtitle, 40, 48);
    if (dateLine) {
      doc.setFontSize(9);
      doc.text(dateLine, pageWidth - 40, 48, { align: "right" });
    }
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);

    const head = [[
      "Nom",
      "Table",
      "Telephone",
      "Email",
      "Categorie",
      "Personnes",
      "Statut"
    ]];
    const body = sortedGuests.map(guest => [
      displayGuestName(guest),
      guest.table?.label ?? (selectedEvent.seatingMode === "NONE" ? "Sans placement" : "-"),
      guest.phone ?? "",
      guest.email ?? "",
      guest.category ?? "",
      String(guest.plusOneCount ?? 0),
      statusLabel(guest.status)
    ]);

    autoTable(doc, {
      startY: 80,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: accentRgb },
      columnStyles: {
        0: { cellWidth: 180 },
        1: { cellWidth: 90 },
        2: { cellWidth: 110 },
        3: { cellWidth: 140 },
        4: { cellWidth: 100 },
        5: { cellWidth: 60 },
        6: { cellWidth: 70 }
      }
    });

    doc.save(`invites-${selectedEvent.id}.pdf`);
  }

  function openWhatsApp(guest: GuestItem) {
    startShare(guest, "WHATSAPP");
  }

  function openSms(guest: GuestItem) {
    startShare(guest, "SMS");
  }

  function openEmail(guest: GuestItem) {
    startShare(guest, "EMAIL");
  }

  function shareLabel(channel: ShareChannel) {
    if (channel === "SMS") return "SMS";
    if (channel === "EMAIL") return "Email";
    return "WhatsApp";
  }

  function channelHint(channel: ShareChannel) {
    if (channel === "SMS") return "Le message sera ouvert dans votre application SMS.";
    if (channel === "EMAIL") return "Le message sera ouvert dans votre client email.";
    return "Le message sera ouvert dans WhatsApp.";
  }

  function openBulkShare() {
    setBulkOpen(true);
  }

  function openReminder() {
    setReminderResult(null);
    setReminderOpen(true);
  }

  function renderBulkMessage(template: string, guest: GuestItem) {
    const eventName = selectedEvent?.name ?? "notre evenement";
    const eventDate = selectedEvent?.dateTime
      ? new Date(selectedEvent.dateTime).toLocaleString("fr-FR")
      : "";
    return template
      .replaceAll("{name}", displayGuestName(guest))
      .replaceAll("{event}", eventName)
      .replaceAll("{date}", eventDate)
      .replaceAll("{link}", guest.invitationUrl ?? "");
  }

  function sendBulkShare() {
    const candidates = filtered.filter(g => {
      if (!g.invitationUrl) return false;
      if (!bulkPendingOnly) return true;
      return g.status === "PENDING";
    });
    if (candidates.length === 0) {
      pushToast("Aucun invite avec lien d'invitation.", "error");
      return;
    }

    let launched = 0;
    candidates.forEach((guest, index) => {
      const message = encodeURIComponent(renderBulkMessage(bulkMessageTemplate, guest));
      if (bulkChannel === "WHATSAPP") {
        const normalizedPhone = normalizePhoneForWhatsApp(guest.phone);
        if (!normalizedPhone) return;
        window.setTimeout(() => {
          window.open(`https://wa.me/${normalizedPhone}?text=${message}`, "_blank", "noopener,noreferrer");
        }, index * 350);
        void markInvitationSent(guest.id);
        launched += 1;
        return;
      }
      if (bulkChannel === "SMS") {
        const normalizedPhone = normalizePhoneForWhatsApp(guest.phone);
        if (!normalizedPhone) return;
        window.setTimeout(() => {
          window.open(`sms:${normalizedPhone}?body=${message}`, "_blank", "noopener,noreferrer");
        }, index * 350);
        void markInvitationSent(guest.id);
        launched += 1;
        return;
      }
      window.setTimeout(() => {
        const subject = encodeURIComponent(`Invitation - ${selectedEvent?.name ?? "Evenement"}`);
        window.open(`mailto:?subject=${subject}&body=${message}`, "_blank", "noopener,noreferrer");
      }, index * 350);
      void markInvitationSent(guest.id);
      launched += 1;
    });

    setBulkOpen(false);
    if (launched === 0) {
      pushToast("Aucun numero valide pour l'envoi global.", "error");
    } else {
      pushToast(`Envoi lance pour ${launched} invite(s).`);
    }
  }

  async function launchReminderCampaign() {
    if (!selectedEvent) return;
    setReminderLoading(true);
    setReminderResult(null);
    try {
      const res = await authFetch(`/guests/events/${selectedEvent.id}/reminders/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingOnly: true,
          onlyNotOpened: reminderOnlyNotOpened,
          minHoursSinceSent: reminderMinHoursSinceSent,
          maxRecipients: reminderMaxRecipients,
          messageTemplate: reminderTemplate
        })
      });
      if (!res.ok) {
        pushToast("Preparation des rappels impossible.", "error");
        return;
      }

      const payload = (await res.json()) as ReminderPreview;
      if (payload.candidates.length === 0) {
        setReminderResult("Aucun invite cible pour ce rappel.");
        return;
      }

      let launched = 0;
      payload.candidates.forEach((candidate, index) => {
        const text = encodeURIComponent(candidate.message);
        if (reminderChannel === "WHATSAPP") {
          const normalizedPhone = normalizePhoneForWhatsApp(candidate.phone);
          if (!normalizedPhone) return;
          window.setTimeout(() => {
            window.open(`https://wa.me/${normalizedPhone}?text=${text}`, "_blank", "noopener,noreferrer");
          }, index * 350);
          void markInvitationSent(candidate.guestId);
          launched += 1;
          return;
        }
        if (reminderChannel === "SMS") {
          const normalizedPhone = normalizePhoneForWhatsApp(candidate.phone);
          if (!normalizedPhone) return;
          window.setTimeout(() => {
            window.open(`sms:${normalizedPhone}?body=${text}`, "_blank", "noopener,noreferrer");
          }, index * 350);
          void markInvitationSent(candidate.guestId);
          launched += 1;
          return;
        }
        window.setTimeout(() => {
          const subject = encodeURIComponent(`Rappel RSVP - ${selectedEvent.name}`);
          window.open(`mailto:?subject=${subject}&body=${text}`, "_blank", "noopener,noreferrer");
        }, index * 350);
        void markInvitationSent(candidate.guestId);
        launched += 1;
      });

      if (launched === 0) {
        setReminderResult("Aucun contact valide pour le canal choisi.");
      } else {
        setReminderResult(
          `Rappels lances: ${launched}. Cibles calculees: ${payload.candidatesCount}/${payload.totalGuests}.`
        );
        pushToast(`Rappel RSVP lance pour ${launched} invite(s).`);
      }
    } finally {
      setReminderLoading(false);
    }
  }

  async function loadEvents() {
    const res = await authFetch("/events");
    if (!res.ok) return;
    const data = (await res.json()) as EventItem[];
    setEvents(data);
    if (data.length > 0) {
      const savedId = getSelectedEventId();
      const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
      setSelectedEvent(chosen);
      setSelectedEventId(chosen.id);
    }
  }

  async function loadEventData(eventId: number) {
    const guestRes = await authFetch(`/guests/by-event/${eventId}`);
    if (guestRes.ok) setGuests((await guestRes.json()) as GuestItem[]);
    if (selectedEvent?.seatingMode !== "NONE") {
      const tableRes = await authFetch(`/events/${eventId}/tables`);
      if (tableRes.ok) setTables((await tableRes.json()) as TableItem[]);
    } else {
      setTables([]);
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
    if (!selectedEvent) return;
    void loadEventData(selectedEvent.id);
  }, [selectedEvent?.id]);

  function openAdd() {
    setAddLastName("");
    setAddMiddleName("");
    setAddFirstName("");
    setAddPhone("");
    setAddEmail("");
    setAddSex("M");
    setAddCategory(CATEGORY_OPTIONS[0] ?? "Famille");
    setAddCategoryCustom("");
    setAddGuestType("MR");
    setAddTableId("");
    setAddPersons(1);
    setAddError(null);
    setAddOpen(true);
  }

  async function addGuest() {
    if (!selectedEvent) return;
    const lastName = addLastName.trim();
    const middleName = addMiddleName.trim();
    const firstName = addFirstName.trim();
    const phone = addPhone.trim();
    const email = addEmail.trim();
    const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = !phone || /^[+\d][\d\s().-]{5,20}$/.test(phone);

    if (!lastName || !middleName || !firstName) {
      setAddError("Nom, postnom et prenom sont obligatoires.");
      return;
    }
    const categoryValue =
      addCategory === "Autre" ? addCategoryCustom.trim() : addCategory.trim();
    if (!categoryValue) {
      setAddError("La categorie est obligatoire.");
      return;
    }
    if (!phoneOk) {
      setAddError("Numero de telephone invalide.");
      return;
    }
    if (!emailOk) {
      setAddError("Email invalide.");
      return;
    }
    if (addPersons < 1) {
      setAddError("Le nombre de personnes est obligatoire.");
      return;
    }

    const res = await authFetch("/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEvent.id,
        lastName,
        middleName,
        firstName,
        sex: addSex,
        category: categoryValue,
        guestType: addGuestType,
        phone: phone || null,
        email: email || null,
        plusOneCount: Math.max(1, Number(addPersons) || 1),
        tableId: addTableId ? Number(addTableId) : null
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setAddError(payload?.message ?? "Ajout invite impossible.");
      pushToast(payload?.message ?? "Ajout invite impossible.", "error");
      return;
    }
    setAddOpen(false);
    pushToast("Invite ajoute.");
    await loadEventData(selectedEvent.id);
  }

  async function importGuestsFromRows(rows: Array<{ fullName: string; phone?: string; table?: string }>) {
    if (!selectedEvent) return;
    if (rows.length === 0) {
      pushToast("Aucune ligne valide dans le fichier.", "error");
      return;
    }
    let created = 0;
    for (const row of rows) {
      const fullName = row.fullName.trim();
      if (!fullName) continue;
      const phone = row.phone?.trim() ?? "";
      const tableLabel = row.table?.trim() ?? "";
      const parts = fullName.split(/\s+/).filter(Boolean);
      const lastName = parts[0] || fullName;
      const middleName = parts[1] || parts[0] || fullName;
      const firstName = parts.slice(2).join(" ") || parts[0] || fullName;
      const matchingTable = tables.find(t => t.label.toLowerCase() === tableLabel.toLowerCase());

      const res = await authFetch("/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          lastName,
          middleName,
          firstName,
          sex: "M",
          category: "Import",
          guestType: "MR",
          phone: phone || null,
          email: null,
          plusOneCount: 1,
          tableId: matchingTable?.id ?? null
        })
      });
      if (res.ok) created += 1;
    }

    if (created > 0) {
      pushToast(`${created} invite(s) importes.`);
      await loadEventData(selectedEvent.id);
    } else {
      pushToast("Aucun invite importe.", "error");
    }
  }

  async function importGuestsFromCsv(file: File) {
    if (!selectedEvent) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map(row => row.trim())
        .filter(Boolean);
      if (rows.length === 0) {
        pushToast("Fichier vide.", "error");
        return;
      }
      const delimiter = rows[0].includes(";") ? ";" : ",";
      const startIndex = /nom|telephone|table/i.test(rows[0]) ? 1 : 0;
      const parsed = rows.slice(startIndex).map(row => {
        const cols = row.split(delimiter).map(col => col.trim());
        return {
          fullName: cols[0] || "",
          phone: cols[1] || "",
          table: cols[2] || ""
        };
      });
      await importGuestsFromRows(parsed);
    } finally {
      setImporting(false);
    }
  }

  async function importGuestsFromExcel(file: File) {
    if (!selectedEvent) return;
    setImporting(true);
    try {
      const xlsx = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        pushToast("Aucune feuille detectee.", "error");
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<unknown>>;
      const rows = json.slice(1).map(row => ({
        fullName: String(row[0] ?? "").trim(),
        phone: String(row[1] ?? "").trim(),
        table: String(row[2] ?? "").trim()
      }));
      await importGuestsFromRows(rows.filter(row => row.fullName));
    } catch (error) {
      pushToast("Impossible d'importer ce fichier Excel.", "error");
    } finally {
      setImporting(false);
    }
  }

  async function assignTable(guestId: number, tableId: number | null) {
    const res = await authFetch(`/guests/${guestId}/table`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId })
    });
    if (!res.ok || !selectedEvent) return;
    await loadEventData(selectedEvent.id);
  }

  async function markInvitationSent(guestId: number) {
    const res = await authFetch(`/guests/${guestId}/invitation/sent`, { method: "POST" });
    if (!res.ok) return;
    const payload = (await res.json().catch(() => null)) as { sentAt?: string } | null;
    const sentAt = payload?.sentAt ?? new Date().toISOString();
    setGuests(prev =>
      prev.map(g => (g.id === guestId ? { ...g, invitationSentAt: sentAt } : g))
    );
  }

  function openEdit(guest: GuestItem) {
    setEditGuestId(guest.id);
    setEditLastName(guest.lastName ?? "");
    setEditMiddleName(guest.middleName ?? "");
    setEditFirstName(guest.firstName ?? "");
    setEditPhone(guest.phone ?? "");
    setEditEmail(guest.email ?? "");
    setEditSex(guest.sex === "F" ? "F" : "M");
    const category = guest.category ?? "";
    const isKnownCategory = CATEGORY_OPTIONS.includes(category);
    setEditCategory(isKnownCategory ? category : "Autre");
    setEditCategoryCustom(isKnownCategory ? "" : category);
    setEditGuestType(guest.guestType ?? "MR");
    setEditTableId(guest.table?.id ? String(guest.table.id) : "");
    setEditPersons(Math.max(1, guest.plusOneCount ?? 1));
    setEditError(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editGuestId) return;
    const lastName = editLastName.trim();
    const middleName = editMiddleName.trim();
    const firstName = editFirstName.trim();
    const trimmedPhone = editPhone.trim();
    const trimmedEmail = editEmail.trim();
    const phoneOk = !trimmedPhone || /^[+\d][\d\s().-]{5,20}$/.test(trimmedPhone);
    const emailOk = !trimmedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!lastName || !middleName || !firstName) {
      setEditError("Nom, postnom et prenom sont obligatoires.");
      return;
    }
    if (!phoneOk) {
      setEditError("Numero de telephone invalide.");
      return;
    }
    if (trimmedPhone.length > 40) {
      setEditError("Le telephone est trop long (40 caracteres max).");
      return;
    }
    const editCategoryValue =
      editCategory === "Autre" ? editCategoryCustom.trim() : editCategory.trim();
    if (!editCategoryValue) {
      setEditError("La categorie est obligatoire.");
      return;
    }
    if (!emailOk) {
      setEditError("Email invalide.");
      return;
    }
    if (trimmedEmail.length > 120) {
      setEditError("Email trop long (120 caracteres max).");
      return;
    }
    if (editPersons < 1) {
      setEditError("Le nombre de personnes est obligatoire.");
      return;
    }
    const res = await authFetch(`/guests/${editGuestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastName,
        middleName,
        firstName,
        sex: editSex,
        category: editCategoryValue,
        guestType: editGuestType,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
        plusOneCount: Math.max(1, Number(editPersons) || 1)
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setEditError(payload?.message ?? "Mise a jour impossible.");
      pushToast(payload?.message ?? "Mise a jour impossible.", "error");
      return;
    }
    if (selectedEvent) {
      const nextTableId = editTableId ? Number(editTableId) : null;
      const currentGuest = guests.find(g => g.id === editGuestId);
      const currentTableId = currentGuest?.table?.id ?? null;
      if (nextTableId !== currentTableId) {
        await assignTable(editGuestId, nextTableId);
      }
    }
    pushToast("Invite mis a jour.");
    setEditOpen(false);
    if (selectedEvent) await loadEventData(selectedEvent.id);
  }

  async function deleteGuest(guestId: number) {
    if (!selectedEvent) return;
    if (!window.confirm("Supprimer cet invite ?")) return;
    const res = await authFetch(`/guests/${guestId}`, { method: "DELETE" });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Suppression impossible.", "error");
      return;
    }
    pushToast("Invite supprime.");
    await loadEventData(selectedEvent.id);
  }

  const filtered = useMemo(() => {
    return guests.filter(g => {
      const byStatus = status === "ALL" || g.status === status;
      const byTable =
        tableFilter === "ALL" ||
        (tableFilter === "NONE" && !g.table?.id) ||
        (tableFilter !== "ALL" && tableFilter !== "NONE" && String(g.table?.id) === tableFilter);
      const q = search.trim().toLowerCase();
      const byText =
        !q ||
        displayGuestName(g).toLowerCase().includes(q) ||
        (g.fullName ?? "").toLowerCase().includes(q) ||
        (g.phone ?? "").toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        (g.table?.label ?? "").toLowerCase().includes(q);
      return byStatus && byTable && byText;
    });
  }, [guests, search, status, tableFilter]);

  const sortedGuests = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "status") {
      list.sort((a, b) => statusLabel(a.status).localeCompare(statusLabel(b.status)));
    } else {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    return list;
  }, [filtered, sortBy]);

  const pageCount = Math.max(1, Math.ceil(sortedGuests.length / pageSize));
  const pagedGuests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedGuests.slice(start, start + pageSize);
  }, [sortedGuests, page, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter(g => g.status === "CONFIRMED").length;
    const pending = guests.filter(g => g.status === "PENDING").length;
    const canceled = guests.filter(g => g.status === "CANCELED").length;
    return { total, confirmed, pending, canceled };
  }, [guests]);

  return (
    <main className="space-y-4">
      <Header title="Invites" />
      <div className="grid gap-4">
        <section className="card p-4 space-y-3">
          {!selectedEvent ? (
            <p className="text-small">Selectionnez un evenement.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="title-4">Invites</h2>
                  <p className="text-small text-textSecondary">Gerez vos invites, statuts et tables.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {loading ? (
                    <div className="min-w-[220px] rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px] text-text/60">
                      Chargement des evenements...
                    </div>
                  ) : events.length === 0 ? (
                    <div className="min-w-[220px] rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px] text-text/60">
                      Aucun evenement disponible
                    </div>
                  ) : (
                    <select
                      className="min-w-[220px] rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs"
                      value={selectedEvent?.id ?? ""}
                      onChange={e => {
                        const value = Number(e.target.value);
                        const event = events.find(item => item.id === value);
                        if (!event) return;
                        setSelectedEvent(event);
                        setSelectedEventId(event.id);
                      }}
                    >
                      {events.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button type="button" className="px-4 py-2 text-xs" onClick={openAdd}>
                    + Ajouter un invite
                  </Button>
                  <label className="btn-ghost px-3 py-2 text-xs cursor-pointer">
                    {importing ? "Import..." : "Importer (CSV/Excel)"}
                    <input
                      type="file"
                      accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.name.toLowerCase().endsWith(".xlsx")) {
                          void importGuestsFromExcel(file);
                        } else {
                          void importGuestsFromCsv(file);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-2 text-xs"
                    onClick={downloadGuestsTemplate}
                  >
                    Modele CSV
                  </Button>
                  <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={downloadGuestsPdf}>
                    Exporter PDF
                  </Button>
                  <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={downloadGuestsCsv}>
                    Exporter CSV
                  </Button>
                  <div className="flex items-center gap-1 rounded-full border border-primary/10 bg-background/70 px-1 py-1">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        viewMode === "table" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                      }`}
                      onClick={() => setViewMode("table")}
                    >
                      Tableau
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        viewMode === "cards" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                      }`}
                      onClick={() => setViewMode("cards")}
                    >
                      Cartes
                    </button>
                  </div>
                </div>
              </div>

              {selectedEvent ? (
                <p className="text-[11px] text-text/60">{seatingLabel(selectedEvent.seatingMode ?? "TABLE")}</p>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-primary/10 bg-background/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Total</p>
                  <p className="mt-1 text-lg font-semibold">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-green-700">Confirmes</p>
                  <p className="mt-1 text-lg font-semibold text-green-700">{stats.confirmed}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">En attente</p>
                  <p className="mt-1 text-lg font-semibold text-amber-700">{stats.pending}</p>
                </div>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-700">Annules</p>
                  <p className="mt-1 text-lg font-semibold text-red-700">{stats.canceled}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr,1fr,auto] gap-2 text-xs">
                <Input
                  placeholder="Rechercher un invite..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                  value={status}
                  onChange={e => {
                    setStatus(e.target.value as typeof status);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="CONFIRMED">Confirmes</option>
                  <option value="PENDING">En attente</option>
                  <option value="CANCELED">Annules</option>
                </select>
                <select
                  className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                  value={tableFilter}
                  onChange={e => {
                    setTableFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Toutes les tables</option>
                  {(selectedEvent?.seatingMode ?? "TABLE") === "NONE" ? (
                    <option value="NONE">Sans placement</option>
                  ) : null}
                  {tables.map(table => (
                    <option key={table.id} value={String(table.id)}>
                      {table.label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                </select>
              </div>
              <div className="rounded-xl border border-primary/10 overflow-x-auto">
                {loading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`guest-skeleton-${index}`}
                        className="h-8 rounded-lg bg-primary/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : sortedGuests.length === 0 ? (
                  <div className="p-3">
                    <EmptyState
                      title="Aucun invite trouve"
                      description="Ajoute un invite ou ajuste les filtres pour voir les resultats."
                    />
                  </div>
                ) : (
                  <>
                    <table
                      className={`w-full min-w-[760px] text-[11px] sm:text-xs ${
                        viewMode === "cards" ? "hidden" : "hidden md:table"
                      }`}
                    >
                      <thead className="bg-background/70 text-text/60">
                        <tr>
                          <th className="text-left px-3 py-2">Nom</th>
                          <th className="text-left px-3 py-2">Telephone</th>
                          <th className="text-left px-3 py-2">
                            {(selectedEvent?.seatingMode ?? "TABLE") === "ZONE" ? "Zone" : "Table"}
                          </th>
                          <th className="text-left px-3 py-2">Statut</th>
                          <th className="text-left px-3 py-2">QR Code</th>
                          <th className="text-left px-3 py-2">Partager</th>
                          <th className="text-right px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/10">
                        {pagedGuests.map(guest => (
                          <tr key={guest.id} className="hover:bg-primary/5">
                            <td className="px-3 py-2">{displayGuestName(guest)}</td>
                            <td className="px-3 py-2">{guest.phone ?? "-"}</td>
                            <td className="px-3 py-2">
                              {(selectedEvent?.seatingMode ?? "TABLE") === "NONE" ? (
                                <span className="text-[10px] text-text/60">Sans placement</span>
                              ) : (
                                <span className="text-small">{guest.table?.label || "-"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${statusClass(guest.status)}`}>
                                {statusLabel(guest.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {getGuestQrUrl(guest) ? (
                                <a
                                  className="rounded-full border border-primary/20 px-2 py-1 text-[10px] hover:bg-primary/5"
                                  href={getGuestQrUrl(guest) ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Telecharger
                                </a>
                              ) : (
                                <span className="text-[10px] text-text/60">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  className="rounded-full border border-primary/20 px-2 py-1 text-[10px] hover:bg-primary/5"
                                  onClick={() => toggleMenu(guest.id)}
                                >
                                  Partager
                                </button>
                                  {menuOpenId === guest.id ? (
                                    <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-primary/10 bg-background/95 shadow-lg backdrop-blur">
                                      <div className="flex flex-col p-1 text-[10px]">
                                        {guest.invitationUrl ? (
                                          <>
                                            <a
                                              href={guest.invitationUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="rounded-lg px-2 py-1 hover:bg-primary/5"
                                            >
                                              Ouvrir invitation
                                            </a>
                                            <button
                                              type="button"
                                              className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                              onClick={() => {
                                                void copyInvitation(guest.invitationUrl);
                                                setMenuOpenId(null);
                                              }}
                                            >
                                              Copier le lien
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                              onClick={() => {
                                                openWhatsApp(guest);
                                                setMenuOpenId(null);
                                              }}
                                            >
                                              WhatsApp
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                              onClick={() => {
                                                openSms(guest);
                                                setMenuOpenId(null);
                                              }}
                                            >
                                              SMS
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                              onClick={() => {
                                                openEmail(guest);
                                                setMenuOpenId(null);
                                              }}
                                            >
                                              Email
                                            </button>
                                          </>
                                        ) : (
                                          <span className="px-2 py-1 text-text/60">Aucun lien</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="rounded-full border border-primary/20 px-2 py-1 text-[10px] hover:bg-primary/5"
                                  onClick={() => openEdit(guest)}
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-primary/20 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
                                  onClick={() => deleteGuest(guest.id)}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div
                      className={`divide-y divide-primary/10 ${
                        viewMode === "cards" ? "block" : "md:hidden"
                      }`}
                    >
                      {pagedGuests.map(guest => (
                        <div
                          key={guest.id}
                          className="mx-2 my-2 rounded-2xl border border-primary/10 bg-background/70 px-3 py-3 shadow-sm space-y-2 text-[12px]"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{displayGuestName(guest)}</p>
                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${statusClass(guest.status)}`}>
                              {statusLabel(guest.status)}
                            </span>
                          </div>
                          <div className="text-small text-text/70">{guest.phone ?? "-"}</div>
                          <div className="grid grid-cols-2 gap-2 text-small">
                            <p>{(selectedEvent?.seatingMode ?? "TABLE") === "ZONE" ? "Zone" : "Table"}</p>
                            <div className="text-right">
                              {(selectedEvent?.seatingMode ?? "TABLE") === "NONE" ? (
                                <span>Sans placement</span>
                              ) : (
                                <span>{guest.table?.label || "-"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-text/60">
                            <span>QR Code</span>
                            {getGuestQrUrl(guest) ? (
                              <a
                                className="rounded-full border border-primary/20 px-2 py-1 text-[10px] hover:bg-primary/5"
                                href={getGuestQrUrl(guest) ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Telecharger
                              </a>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <div className="relative inline-block">
                              <button
                                type="button"
                                className="rounded-full border border-primary/20 px-2 py-1 text-[10px] hover:bg-primary/5"
                                onClick={() => toggleMenu(guest.id)}
                              >
                                Partager
                              </button>
                              {menuOpenId === guest.id ? (
                                <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-primary/10 bg-background/95 shadow-lg backdrop-blur">
                                  <div className="flex flex-col p-1 text-[10px]">
                                    {guest.invitationUrl ? (
                                      <>
                                        <a
                                          href={guest.invitationUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="rounded-lg px-2 py-1 hover:bg-primary/5"
                                        >
                                          Ouvrir invitation
                                        </a>
                                        <button
                                          type="button"
                                          className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                          onClick={() => {
                                            void copyInvitation(guest.invitationUrl);
                                            setMenuOpenId(null);
                                          }}
                                        >
                                          Copier le lien
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                          onClick={() => {
                                            openWhatsApp(guest);
                                            setMenuOpenId(null);
                                          }}
                                        >
                                          WhatsApp
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                          onClick={() => {
                                            openSms(guest);
                                            setMenuOpenId(null);
                                          }}
                                        >
                                          SMS
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                                          onClick={() => {
                                            openEmail(guest);
                                            setMenuOpenId(null);
                                          }}
                                        >
                                          Email
                                        </button>
                                      </>
                                    ) : (
                                      <span className="px-2 py-1 text-text/60">Aucun lien</span>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="rounded-full border border-primary/20 px-2 py-1 text-[10px] hover:bg-primary/5"
                              onClick={() => openEdit(guest)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-primary/20 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
                              onClick={() => deleteGuest(guest.id)}
                            >
                              Supprimer
                            </button>
                          </div>
                          <div className="text-[10px] text-text/60">
                            {guest.invitationSentAt
                              ? `Invite le ${new Date(guest.invitationSentAt).toLocaleString("fr-FR")}`
                              : "Jamais invite"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-text/60">
                <span>
                  Page {page} / {pageCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1 text-[11px]"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Precedent
                  </Button>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: pageCount }).map((_, index) => {
                      const value = index + 1;
                      if (pageCount > 7 && Math.abs(value - page) > 2 && value !== 1 && value !== pageCount) {
                        if (value === 2 || value === pageCount - 1) {
                          return (
                            <span key={`ellipsis-${value}`} className="px-2 text-text/40">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }
                      return (
                        <button
                          key={`page-${value}`}
                          type="button"
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            value === page
                              ? "bg-primary/10 text-text"
                              : "text-text/60 hover:bg-primary/5"
                          }`}
                          onClick={() => setPage(value)}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1 text-[11px]"
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={shareOpen}
        title={`Previsualiser le message (${shareLabel(shareChannel)})`}
      >
        <div className="space-y-3">
          <p className="text-small">{channelHint(shareChannel)}</p>
          <textarea
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            rows={6}
            value={shareMessage}
            onChange={e => setShareMessage(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShareOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" className="w-full" onClick={sendShare}>
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={bulkOpen} title="Envoyer a tous les invites filtres">
        <div className="space-y-3">
          <p className="text-small">
            Canal et message global. Variables disponibles: {"{name}"}, {"{event}"}, {"{date}"}, {"{link}"}.
          </p>
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
            value={bulkChannel}
            onChange={e => setBulkChannel(e.target.value as ShareChannel)}
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
          <textarea
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            rows={6}
            value={bulkMessageTemplate}
            onChange={e => setBulkMessageTemplate(e.target.value)}
          />
          <label className="flex items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={bulkPendingOnly}
              onChange={e => setBulkPendingOnly(e.target.checked)}
            />
            Envoyer seulement aux invites en attente (PENDING)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setBulkOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="w-full" onClick={sendBulkShare}>
              Lancer l'envoi
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={reminderOpen} title="Rappel RSVP automatique">
        <div className="space-y-3">
          <p className="text-small">
            Cible automatique: invites en attente, deja envoyes, et non repondus recemment.
          </p>
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
            value={reminderChannel}
            onChange={e => setReminderChannel(e.target.value as ShareChannel)}
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              value={String(reminderMinHoursSinceSent)}
              onChange={e => setReminderMinHoursSinceSent(Math.max(1, Number(e.target.value) || 1))}
              placeholder="Heures mini depuis dernier envoi"
            />
            <Input
              type="number"
              min={1}
              max={250}
              value={String(reminderMaxRecipients)}
              onChange={e => setReminderMaxRecipients(Math.min(250, Math.max(1, Number(e.target.value) || 1)))}
              placeholder="Max invites"
            />
          </div>
          <label className="flex items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={reminderOnlyNotOpened}
              onChange={e => setReminderOnlyNotOpened(e.target.checked)}
            />
            Cibler uniquement les invitations jamais ouvertes
          </label>
          <textarea
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            rows={6}
            value={reminderTemplate}
            onChange={e => setReminderTemplate(e.target.value)}
          />
          {reminderResult ? <p className="text-small">{reminderResult}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setReminderOpen(false)}>
              Fermer
            </Button>
            <Button type="button" className="w-full" onClick={launchReminderCampaign} disabled={reminderLoading}>
              {reminderLoading ? "Preparation..." : "Lancer les rappels"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={addOpen} title="Ajouter un invite">
        <div className="space-y-3">
          <Input
            placeholder="Nom"
            value={addLastName}
            onChange={e => setAddLastName(e.target.value)}
          />
          <Input
            placeholder="Postnom"
            value={addMiddleName}
            onChange={e => setAddMiddleName(e.target.value)}
          />
          <Input
            placeholder="Prenom"
            value={addFirstName}
            onChange={e => setAddFirstName(e.target.value)}
          />
          <Input
            placeholder="Telephone"
            value={addPhone}
            onChange={e => setAddPhone(e.target.value)}
          />
          <Input
            placeholder="Email (facultatif)"
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={addSex}
              onChange={e => setAddSex(e.target.value as "M" | "F")}
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
            <select
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={addGuestType}
              onChange={e => setAddGuestType(e.target.value as typeof addGuestType)}
            >
              <option value="COUPLE">Couple</option>
              <option value="MR">Mr</option>
              <option value="MME">Mme</option>
              <option value="MLLE">Mlle</option>
            </select>
          </div>
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
            value={addCategory}
            onChange={e => setAddCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {addCategory === "Autre" ? (
            <Input
              placeholder="Categorie personnalisee"
              value={addCategoryCustom}
              onChange={e => setAddCategoryCustom(e.target.value)}
            />
          ) : null}
          {(selectedEvent?.seatingMode ?? "TABLE") === "NONE" ? null : (
            <select
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={addTableId}
              onChange={e => setAddTableId(e.target.value)}
            >
              <option value="">- Selectionner une table</option>
              {tables.map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <Input
            type="number"
            min={1}
            placeholder="Nombre de personnes"
            value={String(addPersons)}
            onChange={e => setAddPersons(Math.max(1, Number(e.target.value) || 1))}
          />
          {addError ? <p className="text-xs text-red-600">{addError}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setAddOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="w-full" onClick={addGuest}>
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} title="Modifier l'invite">
        <div className="space-y-3">
          <Input
            placeholder="Nom"
            value={editLastName}
            onChange={e => setEditLastName(e.target.value)}
          />
          <Input
            placeholder="Postnom"
            value={editMiddleName}
            onChange={e => setEditMiddleName(e.target.value)}
          />
          <Input
            placeholder="Prenom"
            value={editFirstName}
            onChange={e => setEditFirstName(e.target.value)}
          />
          <Input
            placeholder="Telephone"
            value={editPhone}
            onChange={e => setEditPhone(e.target.value)}
          />
          <Input
            placeholder="Email (facultatif)"
            value={editEmail}
            onChange={e => setEditEmail(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={editSex}
              onChange={e => setEditSex(e.target.value as "M" | "F")}
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
            <select
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={editGuestType}
              onChange={e => setEditGuestType(e.target.value as typeof editGuestType)}
            >
              <option value="COUPLE">Couple</option>
              <option value="MR">Mr</option>
              <option value="MME">Mme</option>
              <option value="MLLE">Mlle</option>
            </select>
          </div>
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
            value={editCategory}
            onChange={e => setEditCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {editCategory === "Autre" ? (
            <Input
              placeholder="Categorie personnalisee"
              value={editCategoryCustom}
              onChange={e => setEditCategoryCustom(e.target.value)}
            />
          ) : null}
          {(selectedEvent?.seatingMode ?? "TABLE") === "NONE" ? null : (
            <select
              className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={editTableId}
              onChange={e => setEditTableId(e.target.value)}
            >
              <option value="">- Selectionner une table</option>
              {tables.map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <Input
            type="number"
            min={1}
            placeholder="Nombre de personnes"
            value={String(editPersons)}
            onChange={e => setEditPersons(Math.max(1, Number(e.target.value) || 1))}
          />
          {editError ? <p className="text-xs text-red-600">{editError}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="w-full" onClick={saveEdit}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

