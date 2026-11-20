"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem,
  type GuestItem
} from "@/lib/dashboard";

type TableItem = {
  id: number;
  label: string;
  capacity: number;
  location?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  guests: Array<{ id: number; fullName: string }>;
};

type TableLayout = {
  id: number;
  name: string;
};

function seatingLabel(mode: "TABLE" | "ZONE" | "NONE") {
  if (mode === "ZONE") return "Mode: Zones/Sections";
  if (mode === "NONE") return "Mode: Sans tables/sections";
  return "Mode: Tables";
}

export default function DashboardTablesPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoResult, setAutoResult] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "occupancy">("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState(8);
  const [newLocation, setNewLocation] = useState("");
  const [newUnlimited, setNewUnlimited] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCapacity, setEditCapacity] = useState(0);
  const [editLocation, setEditLocation] = useState("");
  const [editUnlimited, setEditUnlimited] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [dragOverTableId, setDragOverTableId] = useState<number | null>(null);
  const [roomMode, setRoomMode] = useState<"grid" | "plan">("grid");
  const [layoutLock, setLayoutLock] = useState(true);
  const [layouts, setLayouts] = useState<TableLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);
  const [createLayoutOpen, setCreateLayoutOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [renameLayoutOpen, setRenameLayoutOpen] = useState(false);
  const [renameLayoutName, setRenameLayoutName] = useState("");
  const dragGuardRef = useRef(false);
  const [tableToDelete, setTableToDelete] = useState<TableItem | null>(null);
  const [layoutToDelete, setLayoutToDelete] = useState<TableLayout | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { pushToast } = useToast();

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

  async function refreshTables(eventId: number) {
    const res = await authFetch(`/events/${eventId}/tables`);
    if (!res.ok) {
      setTables([]);
      return;
    }
    setTables((await res.json()) as TableItem[]);
  }

  async function refreshGuests(eventId: number) {
    const res = await authFetch(`/guests/by-event/${eventId}`);
    if (!res.ok) {
      setGuests([]);
      return;
    }
    setGuests((await res.json()) as GuestItem[]);
  }

  async function refreshLayouts(eventId: number) {
    const res = await authFetch(`/events/${eventId}/table-layouts`);
    if (!res.ok) {
      setLayouts([]);
      setActiveLayoutId(null);
      return;
    }
    const payload = (await res.json()) as { activeLayoutId: number | null; layouts: TableLayout[] };
    setLayouts(payload.layouts);
    setActiveLayoutId(payload.activeLayoutId);
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
      setTables([]);
      setGuests([]);
      setLayouts([]);
      setActiveLayoutId(null);
      return;
    }
    void refreshTables(selectedEvent.id);
    void refreshGuests(selectedEvent.id);
    void refreshLayouts(selectedEvent.id);
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedTable) return;
    const updated = tables.find(table => table.id === selectedTable.id);
    if (updated) {
      setSelectedTable(updated);
    }
  }, [tables, selectedTable?.id]);

  const tableOverview = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tables.filter(table => {
      if (!term) return true;
      return (
        table.label.toLowerCase().includes(term) ||
        (table.location ?? "").toLowerCase().includes(term)
      );
    });
    if (sortBy === "occupancy") {
      return [...filtered].sort((a, b) => b.guests.length - a.guests.length);
    }
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label));
  }, [tables, search, sortBy]);

  const totalGuests = tables.reduce((sum, t) => sum + t.guests.length, 0);
  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity > 0 ? t.capacity : 0), 0);
  const hasUnlimited = tables.some(t => t.capacity === 0);
  const remainingSeats = hasUnlimited ? null : Math.max(totalCapacity - totalGuests, 0);
  const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((totalGuests / totalCapacity) * 100)) : 0;
  const pageCount = Math.max(1, Math.ceil(tableOverview.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pagedTables = tableOverview.slice(start, start + pageSize);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !newLabel.trim()) return;
    setSaving(true);
    try {
      const payload = {
        label: newLabel.trim(),
        capacity: newUnlimited ? 0 : Math.max(0, Number(newCapacity) || 0),
        location: newLocation.trim() || null
      };
      const res = await authFetch(`/events/${selectedEvent.id}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(error?.message ?? "Creation impossible.", "error");
        return;
      }
      setNewLabel("");
      setNewLocation("");
      pushToast("Table ajoutee.");
      await refreshTables(selectedEvent.id);
      setCreateOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function openDetails(table: TableItem) {
    setSelectedTable(table);
    setEditLabel(table.label);
    setEditCapacity(table.capacity);
    setEditLocation(table.location ?? "");
    setEditUnlimited(table.capacity === 0);
    setGuestSearch("");
    setDetailOpen(true);
  }

  async function updateTable(id: number, label: string, capacity: number, location: string | null) {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, capacity, location })
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(error?.message ?? "Mise a jour impossible.", "error");
        return;
      }
      pushToast("Table mise a jour.");
      await refreshTables(selectedEvent.id);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTable(id: number) {
    if (!selectedEvent) return;
    setDeleting(true);
    setSaving(true);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}/tables/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(error?.message ?? "Suppression impossible.", "error");
        setDeleting(false);
        return;
      }
      pushToast("Table supprimee.");
      await refreshTables(selectedEvent.id);
      setSelectedTable(null);
      setDetailOpen(false);
    } finally {
      setSaving(false);
      setDeleting(false);
    }
  }

  function openTableDelete(table: TableItem) {
    setTableToDelete(table);
  }

  async function confirmDeleteTable() {
    if (!tableToDelete) return;
    const tableId = tableToDelete.id;
    setTableToDelete(null);
    await deleteTable(tableId);
  }

  async function saveEdit() {
    if (!selectedTable || !editLabel.trim()) return;
    const capacity = editUnlimited ? 0 : Math.max(0, Number(editCapacity) || 0);
    await updateTable(selectedTable.id, editLabel.trim(), capacity, editLocation.trim() || null);
    setDetailOpen(false);
  }

  async function saveTablePosition(tableId: number, positionX: number, positionY: number) {
    if (!selectedEvent) return;
    if (activeLayoutId) {
      await authFetch(`/events/${selectedEvent.id}/table-layouts/${activeLayoutId}/positions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, positionX, positionY })
      });
      return;
    }
    await authFetch(`/events/${selectedEvent.id}/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionX, positionY })
    });
  }

  async function assignGuestToTable(guestId: number, tableId: number | null) {
    if (!selectedEvent) return;
    const res = await authFetch(`/guests/${guestId}/table`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId })
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(error?.message ?? "Assignation impossible.", "error");
      return;
    }
    await refreshTables(selectedEvent.id);
    await refreshGuests(selectedEvent.id);
  }

  function handleDragStart(guestId: number) {
    return (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData("text/plain", String(guestId));
      event.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDrop(tableId: number) {
    return (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const guestId = Number(event.dataTransfer.getData("text/plain"));
      if (!guestId) return;
      const guest = guests.find(item => item.id === guestId);
      if (guest?.table?.id === tableId) return;
      void assignGuestToTable(guestId, tableId);
      setDragOverTableId(null);
    };
  }

  async function autoAssignGuests() {
    if (!selectedEvent) return;
    setAutoAssigning(true);
    setAutoResult(null);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}/tables/auto-assign`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Repartition impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { assigned: number; remaining: number };
      setAutoResult(`Repartition terminee: ${payload.assigned} assigne(s), ${payload.remaining} restant(s).`);
      pushToast("R?partition auto terminee.");
      await refreshTables(selectedEvent.id);
      await refreshGuests(selectedEvent.id);
    } finally {
      setAutoAssigning(false);
    }
  }

  async function createLayout() {
    if (!selectedEvent) return;
    const name = newLayoutName.trim();
    if (!name) return;
    const res = await authFetch(`/events/${selectedEvent.id}/table-layouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(error?.message ?? "Creation impossible.", "error");
      return;
    }
    setNewLayoutName("");
    setCreateLayoutOpen(false);
    await refreshLayouts(selectedEvent.id);
    await refreshTables(selectedEvent.id);
  }

  async function selectLayout(layoutId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/table-layouts/${layoutId}/select`, {
      method: "PATCH"
    });
    if (!res.ok) {
      pushToast("Selection impossible.", "error");
      return;
    }
    setActiveLayoutId(layoutId);
    await refreshTables(selectedEvent.id);
  }

  async function duplicateLayout(layoutId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/table-layouts/${layoutId}/duplicate`, {
      method: "POST"
    });
    if (!res.ok) {
      pushToast("Duplication impossible.", "error");
      return;
    }
    await refreshLayouts(selectedEvent.id);
  }

  async function deleteLayout(layoutId: number) {
    if (!selectedEvent) return;
    setDeleting(true);
    const res = await authFetch(`/events/${selectedEvent.id}/table-layouts/${layoutId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Suppression impossible.", "error");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    await refreshLayouts(selectedEvent.id);
  }

  function openLayoutDelete(layout: TableLayout) {
    setLayoutToDelete(layout);
  }

  async function confirmDeleteLayout() {
    if (!layoutToDelete) return;
    const layoutId = layoutToDelete.id;
    setLayoutToDelete(null);
    await deleteLayout(layoutId);
  }

  async function renameLayout(layoutId: number) {
    if (!selectedEvent) return;
    const name = renameLayoutName.trim();
    if (!name) return;
    const res = await authFetch(`/events/${selectedEvent.id}/table-layouts/${layoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Renommage impossible.", "error");
      return;
    }
    setRenameLayoutOpen(false);
    setRenameLayoutName("");
    await refreshLayouts(selectedEvent.id);
  }

  return (
    <main className="space-y-6 pb-8 font-sans">
      <Header title="Plan de salle" description="Organisez les tables ou les zones, suivez leur capacité et répartissez les invités." />
      <section className="card space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Organisation de la salle</p>
            <h2 className="mt-1 title-4">Tables et zones</h2>
            <p className="mt-1 text-small text-textSecondary">Suivez les places, répartissez les invités et préparez votre plan de salle.</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-2xl">
            {loading ? (
              <div className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2.5 text-xs text-text/60">
                Chargement des evenements...
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2.5 text-xs text-text/60">
                Aucun evenement disponible
              </div>
            ) : (
              <label className="space-y-1.5 text-xs font-medium text-text/70">
                <span>Evenement</span>
                <select
                aria-label="Choisir un evenement"
                className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
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
              </label>
            )}
            <div className="relative space-y-1.5 text-xs font-medium text-text/70">
              <label htmlFor="active-table-layout">Plan actif</label>
              <select
                id="active-table-layout"
                aria-label="Choisir le plan de salle"
                className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2.5 pr-10 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                value={activeLayoutId ?? ""}
                onChange={e => {
                  const value = Number(e.target.value);
                  if (!value) return;
                  void selectLayout(value);
                }}
                disabled={layouts.length === 0}
              >
                {layouts.length === 0 ? (
                  <option value="">Plan par defaut</option>
                ) : (
                  layouts.map(layout => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                aria-label="Actions du plan"
                aria-expanded={layoutMenuOpen}
                className="absolute right-1 top-7 rounded-lg px-2 py-1.5 text-xs text-text/60 hover:bg-primary/5 disabled:opacity-40"
                onClick={() => setLayoutMenuOpen(prev => !prev)}
                disabled={layouts.length === 0}
              >
                ⋯
              </button>
              {layoutMenuOpen && activeLayoutId ? (
                <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-primary/10 bg-background/95 shadow-lg backdrop-blur">
                  <div className="flex flex-col p-1 text-[11px]">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                      onClick={() => {
                        void duplicateLayout(activeLayoutId);
                        setLayoutMenuOpen(false);
                      }}
                    >
                      Dupliquer
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-left hover:bg-primary/5"
                      onClick={() => {
                        const current = layouts.find(item => item.id === activeLayoutId);
                        setRenameLayoutName(current?.name ?? "");
                        setRenameLayoutOpen(true);
                        setLayoutMenuOpen(false);
                      }}
                    >
                      Renommer
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-left text-red-600 hover:bg-red-50"
                      onClick={() => {
                        const current = layouts.find(item => item.id === activeLayoutId);
                        if (current) setLayoutToDelete(current);
                        setLayoutMenuOpen(false);
                      }}
                      disabled={layouts.length <= 1}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="px-4 py-2.5 text-xs"
              onClick={() => setCreateLayoutOpen(true)}
            >
              Cr?er un plan
            </Button>
            <Button type="button" className="px-4 py-2.5 text-xs" onClick={() => setCreateOpen(true)}>
              Ajouter une table ou zone
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-4 py-2.5 text-xs"
              onClick={autoAssignGuests}
              disabled={autoAssigning}
            >
              {autoAssigning ? "Repartition..." : "Repartition automatique"}
            </Button>
          </div>
          {selectedEvent ? <span className="w-fit rounded-full bg-primary/5 px-3 py-1.5 text-xs font-medium text-text/70">{seatingLabel(selectedEvent.seatingMode ?? "TABLE")}</span> : null}
        </div>

        {(() => {
          const mode = selectedEvent?.seatingMode ?? "TABLE";
          if (!selectedEvent) {
            return <p className="text-small">Selectionnez un evenement.</p>;
          }
          if (mode === "NONE") {
            return (
              <EmptyState
                title="Mode sans tables/sections"
                description="Cet evenement est configure sans tables ni zones. Change le mode d'organisation si besoin."
              />
            );
          }
          return (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text/55">Tables / zones</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{tables.length}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text/55">Capacite configuree</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{hasUnlimited ? "Illimitee" : totalCapacity}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800">Invites places</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-900">{totalGuests}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text/55">Occupation</p>
                    <span className="text-xs font-semibold tabular-nums text-text/70">{hasUnlimited ? "--" : `${occupancyRate}%`}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10" role="progressbar" aria-label="Taux d'occupation" aria-valuenow={hasUnlimited ? undefined : occupancyRate} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${hasUnlimited ? 0 : occupancyRate}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">Places disponibles</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-950">{remainingSeats === null ? "Illimitees" : remainingSeats}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-primary/10 bg-background/40 p-3 text-xs sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr),180px,auto] xl:items-end">
                <label className="space-y-1.5 font-medium text-text/70">
                  <span>Rechercher</span>
                <Input
                  placeholder="Nom de table, zone ou emplacement"
                  aria-label="Rechercher une table, zone ou emplacement"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                </label>
                <label className="space-y-1.5 font-medium text-text/70">
                  <span>Ordre d'affichage</span>
                <select
                  className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2.5 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  value={sortBy}
                  onChange={e => {
                    setSortBy(e.target.value as "name" | "occupancy");
                    setPage(1);
                  }}
                >
                  <option value="name">Nom (A a Z)</option>
                  <option value="occupancy">Occupation (plus remplie)</option>
                </select>
                </label>
                <div className="flex flex-wrap items-end justify-between gap-3 sm:col-span-2 xl:col-span-1 xl:justify-end">
                  <label className="space-y-1.5 font-medium text-text/70">
                    <span>Tables par page</span>
                  <select
                    aria-label="Nombre de tables par page"
                    className="block rounded-xl border border-primary/20 bg-background px-3 py-2.5 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={4}>4</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                  </select>
                  </label>
                  <div role="group" aria-label="Mode d'affichage" className="flex items-center gap-1 rounded-xl border border-primary/10 bg-background/70 p-1">
                    <button
                      type="button"
                      aria-pressed={roomMode === "grid"}
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        roomMode === "grid" ? "bg-primary text-white shadow-sm" : "text-text/65 hover:bg-primary/5"
                      }`}
                      onClick={() => setRoomMode("grid")}
                    >
                      Grille
                    </button>
                    <button
                      type="button"
                      aria-pressed={roomMode === "plan"}
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        roomMode === "plan" ? "bg-primary text-white shadow-sm" : "text-text/65 hover:bg-primary/5"
                      }`}
                      onClick={() => setRoomMode("plan")}
                    >
                      Plan
                    </button>
                  </div>
                </div>
              </div>

              {autoResult ? <p className="text-small">{autoResult}</p> : null}

              {tableOverview.length === 0 ? (
                <EmptyState
                  title={tables.length === 0 ? "Aucune table configuree" : "Aucun resultat"}
                  description={
                    tables.length > 0
                      ? "Aucune table ou zone ne correspond a votre recherche. Modifiez le terme saisi."
                      : mode === "ZONE"
                      ? "Ajoute ou configure des zones pour attribuer les invites."
                      : "Ajoute ou configure des tables dans ton evenement pour attribuer les invites."
                  }
                />
              ) : (
                <>
                  {roomMode === "plan" ? (
                    <div className="rounded-3xl border border-primary/10 bg-background/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-text/60">Plan de salle (glisser-deposer)</div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text/60">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Complete
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Presque complete
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Disponible
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Vide
                          </span>
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 text-[11px] ${
                              layoutLock ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                            }`}
                            onClick={() => setLayoutLock(prev => !prev)}
                          >
                            {layoutLock ? "Verrouille" : "Edition libre"}
                          </button>
                        </div>
                      </div>
                      <div className="relative mt-4 h-[360px] w-full overflow-hidden rounded-2xl border border-primary/10 bg-white/60">
                        {pagedTables.map((table, index) => {
                          const isUnlimited = table.capacity === 0;
                          const occupancy = table.capacity > 0 ? table.guests.length / table.capacity : 0;
                          const indicator =
                            table.guests.length === 0
                              ? "bg-slate-400"
                              : isUnlimited
                                ? "bg-primary"
                                : occupancy >= 1
                                  ? "bg-red-500"
                                  : occupancy >= 0.7
                                    ? "bg-amber-500"
                                    : "bg-green-500";
                          const col = index % 4;
                          const row = Math.floor(index / 4);
                          const defaultLeft = 6 + col * 24;
                          const defaultTop = 8 + row * 30;
                          const left = table.positionX ?? defaultLeft;
                          const top = table.positionY ?? defaultTop;
                          return (
                        <button
                          key={table.id}
                          type="button"
                          className={`absolute w-[120px] rounded-2xl border bg-white/90 px-3 py-2 text-left shadow-sm ${
                            dragOverTableId === table.id
                              ? "border-accent ring-1 ring-accent/40"
                              : "border-primary/10 hover:border-primary/30"
                          }`}
                          style={{ left: `${left}%`, top: `${top}%` }}
                          onClick={() => {
                            if (dragGuardRef.current) {
                              dragGuardRef.current = false;
                              return;
                            }
                            openDetails(table);
                          }}
                              onMouseDown={event => {
                                if (!roomMode || roomMode !== "plan") return;
                                if (layoutLock) return;
                                const target = event.currentTarget;
                                const parent = target.parentElement;
                                if (!parent) return;
                                event.preventDefault();
                                dragGuardRef.current = false;
                                const rect = parent.getBoundingClientRect();
                                const startX = event.clientX;
                                const startY = event.clientY;
                                const initialLeft = left;
                                const initialTop = top;
                                function onMove(moveEvent: MouseEvent) {
                                  const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
                                  const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
                                  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                                    dragGuardRef.current = true;
                                  }
                                  const nextLeft = Math.max(0, Math.min(88, initialLeft + dx));
                                  const nextTop = Math.max(0, Math.min(88, initialTop + dy));
                                  target.style.left = `${nextLeft}%`;
                                  target.style.top = `${nextTop}%`;
                                }
                                async function onUp(upEvent: MouseEvent) {
                                  window.removeEventListener("mousemove", onMove);
                                  window.removeEventListener("mouseup", onUp);
                                  const dx = ((upEvent.clientX - startX) / rect.width) * 100;
                                  const dy = ((upEvent.clientY - startY) / rect.height) * 100;
                                  const nextLeft = Math.max(0, Math.min(88, initialLeft + dx));
                                  const nextTop = Math.max(0, Math.min(88, initialTop + dy));
                                  await saveTablePosition(table.id, Number(nextLeft.toFixed(2)), Number(nextTop.toFixed(2)));
                                  if (selectedEvent) {
                                    await refreshTables(selectedEvent.id);
                                  }
                                }
                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                              onDragOver={event => {
                                event.preventDefault();
                                setDragOverTableId(table.id);
                              }}
                              onDragLeave={() => setDragOverTableId(null)}
                              onDrop={handleDrop(table.id)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold truncate">{table.label}</span>
                                <span className={`h-2 w-2 rounded-full ${indicator}`} />
                              </div>
                              <div className="text-[10px] text-text/60">
                                {table.guests.length}/{isUnlimited ? "∞" : table.capacity}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {pagedTables.map(table => {
                        const isUnlimited = table.capacity === 0;
                        const occupancy = table.capacity > 0 ? table.guests.length / table.capacity : 0;
                        const indicator =
                          table.guests.length === 0
                            ? "bg-slate-400"
                            : isUnlimited
                              ? "bg-primary"
                              : occupancy >= 1
                                ? "bg-red-500"
                                : occupancy >= 0.7
                                  ? "bg-amber-500"
                                  : "bg-green-500";
                        return (
                          <button
                            key={table.id}
                            type="button"
                            className={`group text-left rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                              dragOverTableId === table.id
                                ? "border-accent ring-1 ring-accent/40"
                                : "border-primary/10 hover:border-primary/30"
                            }`}
                            onClick={() => openDetails(table)}
                            onDragOver={event => {
                              event.preventDefault();
                              setDragOverTableId(table.id);
                            }}
                            onDragLeave={() => setDragOverTableId(null)}
                            onDrop={handleDrop(table.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-text">{table.label}</p>
                                <p className="mt-1 truncate text-xs text-text/55">{table.location || (mode === "ZONE" ? "Emplacement non precise" : "Aucun emplacement renseigne")}</p>
                              </div>
                              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${indicator}`} aria-hidden="true" />
                            </div>
                            <div className="mt-4 flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-text">
                                <span className="text-lg font-semibold tabular-nums">{table.guests.length}</span>
                                <span className="text-text/55"> / {isUnlimited ? "Illimite" : table.capacity} places</span>
                              </p>
                              <span className="text-[10px] font-medium text-text/55">{isUnlimited ? "Capacite libre" : table.guests.length === 0 ? "Inoccupee" : occupancy >= 1 ? "Complete" : occupancy >= 0.7 ? "Presque complete" : "Disponible"}</span>
                            </div>
                            {!isUnlimited ? (
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10" aria-hidden="true">
                                <div className={`h-full rounded-full ${indicator}`} style={{ width: `${Math.min(100, Math.round(occupancy * 100))}%` }} />
                              </div>
                            ) : null}
                            <div className="mt-3 flex min-h-6 flex-wrap gap-1 text-[10px] text-text/70">
                              {table.guests.slice(0, 6).map(guest => (
                                <div
                                  key={guest.id}
                                  draggable
                                  onDragStart={handleDragStart(guest.id)}
                                  className="rounded-full border border-primary/10 bg-background/80 px-2 py-1"
                                  title="Glisser vers une autre table"
                                >
                                  {guest.fullName}
                                </div>
                              ))}
                              {table.guests.length > 6 ? (
                                <span className="text-[10px] text-text/50">+ {table.guests.length - 6}</span>
                              ) : null}
                              {table.guests.length === 0 ? <span className="text-[10px] text-text/45">Glissez un invite ici pour l'affecter</span> : null}
                            </div>
                            <span className="mt-3 block border-t border-primary/10 pt-2 text-[11px] font-medium text-primary opacity-80 group-hover:opacity-100">Voir les invites et gerer la table</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-small">
                    <span>
                      Page {currentPage} / {pageCount}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-[11px]"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                      >
                        Precedent
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-[11px]"
                        onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                        disabled={currentPage >= pageCount}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </section>

      <Modal open={createOpen} title={`Ajouter ${selectedEvent?.seatingMode === "ZONE" ? "une zone" : "une table"}`}>
        <form onSubmit={createTable} className="space-y-3">
          <Input
            placeholder={selectedEvent?.seatingMode === "ZONE" ? "Nom de la zone" : "Nom de la table"}
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="Capacite"
            value={String(newCapacity)}
            onChange={e => setNewCapacity(Math.max(0, Number(e.target.value) || 0))}
            disabled={newUnlimited}
          />
          <Input
            placeholder="Emplacement"
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
          />
          <label className="flex items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={newUnlimited}
              onChange={e => setNewUnlimited(e.target.checked)}
            />
            Capacite illimitee
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className="w-full" disabled={saving}>
              Creer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailOpen}
        title={selectedTable ? `Details - ${selectedTable.label}` : "Details table"}
      >
        {selectedTable ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Nom"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                placeholder="Capacite"
                value={String(editCapacity)}
                onChange={e => setEditCapacity(Math.max(0, Number(e.target.value) || 0))}
                disabled={editUnlimited}
              />
              <Input
                placeholder="Emplacement"
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
              />
              <label className="flex items-center gap-2 text-small">
                <input
                  type="checkbox"
                  checked={editUnlimited}
                  onChange={e => setEditUnlimited(e.target.checked)}
                />
                Capacite illimitee
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-small font-semibold">Invites assignes</p>
              {selectedTable.guests.length === 0 ? (
                <p className="text-small text-text/60">Aucun invite attribue pour l'instant.</p>
              ) : (
                <div className="space-y-2">
                  {selectedTable.guests.map(guest => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-xs"
                      draggable
                      onDragStart={handleDragStart(guest.id)}
                    >
                      <span>{guest.fullName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-[10px]"
                        onClick={() => assignGuestToTable(guest.id, null)}
                      >
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-small font-semibold">Ajouter un invite</p>
              <Input
                placeholder="Rechercher un invite..."
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
              />
              <div className="space-y-2">
                {guests
                  .filter(g => !selectedTable.guests.some(tg => tg.id === g.id))
                  .filter(g => g.fullName.toLowerCase().includes(guestSearch.trim().toLowerCase()))
                  .slice(0, 6)
                  .map(guest => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-xs"
                    >
                      <span>{guest.fullName}</span>
                      <Button
                        type="button"
                        className="px-2 py-1 text-[10px]"
                        onClick={() => assignGuestToTable(guest.id, selectedTable.id)}
                      >
                        Ajouter
                      </Button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" className="w-full" onClick={() => setDetailOpen(false)}>
                Fermer
              </Button>
              <Button type="button" className="w-full" onClick={saveEdit} disabled={saving}>
                Sauvegarder
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-red-600"
              onClick={() => selectedTable && openTableDelete(selectedTable)}
              disabled={saving}
            >
              Supprimer la table
            </Button>
          </div>
        ) : null}
      </Modal>
      <Modal open={createLayoutOpen} title="Nouveau plan de salle">
        <div className="space-y-3">
          <Input
            placeholder="Nom du plan"
            value={newLayoutName}
            onChange={e => setNewLayoutName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setCreateLayoutOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="w-full" onClick={createLayout}>
              Creer
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={renameLayoutOpen} title="Renommer le plan">
        <div className="space-y-3">
          <Input
            placeholder="Nom du plan"
            value={renameLayoutName}
            onChange={e => setRenameLayoutName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setRenameLayoutOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={() => activeLayoutId && renameLayout(activeLayoutId)}
            >
              Renommer
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(tableToDelete)}
        title="Supprimer la table"
        description={
          tableToDelete ? (
            <>
              La table <span className="font-semibold text-slate-950">{tableToDelete.label}</span> sera supprimee.
              Les affectations liees seront egalement retirees.
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleting}
        onClose={() => setTableToDelete(null)}
        onConfirm={confirmDeleteTable}
      />

      <ConfirmDialog
        open={Boolean(layoutToDelete)}
        title="Supprimer le plan"
        description={
          layoutToDelete ? (
            <>
              Le plan <span className="font-semibold text-slate-950">{layoutToDelete.name}</span> sera supprime.
              Cette action est irreversible.
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Supprimer"
        variant="warning"
        loading={deleting}
        onClose={() => setLayoutToDelete(null)}
        onConfirm={confirmDeleteLayout}
      />
    </main>
  );
}
