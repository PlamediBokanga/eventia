"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type DrinkOption,
  type EventItem,
  type EventStats
} from "@/lib/dashboard";

export default function DashboardDrinksPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [drinks, setDrinks] = useState<DrinkOption[]>([]);
  const [drinkChoices, setDrinkChoices] = useState<
    Array<{
      id: number;
      guestId: number;
      guestName: string;
      drinkOptionId: number;
      drinkName: string;
      category: "ALCOHOLIC" | "SOFT";
      quantity: number;
    }>
  >([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [drinksEnabled, setDrinksEnabled] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDrinkId, setEditDrinkId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DrinkOption["category"]>("SOFT");
  const [availableQuantity, setAvailableQuantity] = useState("");
  const [maxPerGuest, setMaxPerGuest] = useState("");

  const [choiceQuery, setChoiceQuery] = useState("");
  const [choiceDrinkId, setChoiceDrinkId] = useState<string>("");
  const [choiceSort, setChoiceSort] = useState<"guest" | "drink" | "category" | "quantity">("guest");
  const [choiceSortDir, setChoiceSortDir] = useState<"asc" | "desc">("asc");
  const [choicePage, setChoicePage] = useState(1);
  const [choicePageSize, setChoicePageSize] = useState(10);

  const [drinkSort, setDrinkSort] = useState<"name" | "category" | "choices">("name");
  const [drinkSortDir, setDrinkSortDir] = useState<"asc" | "desc">("asc");
  const [drinkPage, setDrinkPage] = useState(1);
  const [drinkPageSize, setDrinkPageSize] = useState(6);
  const [drinkCategoryFilter, setDrinkCategoryFilter] = useState<"ALL" | "SOFT" | "ALCOHOLIC">("ALL");
  const [drinkView, setDrinkView] = useState<"cards" | "table">("cards");
  const [drinkStockFilter, setDrinkStockFilter] = useState<"ALL" | "LOW" | "LIMITED">("ALL");
  const [drinkToDelete, setDrinkToDelete] = useState<DrinkOption | null>(null);
  const [deletingDrink, setDeletingDrink] = useState(false);

  const { pushToast } = useToast();

  useEffect(() => {
    async function init() {
      try {
        const res = await authFetch("/events");
        if (!res.ok) {
          setEventsError(true);
          return;
        }
        const data = (await res.json()) as EventItem[];
        setEvents(data);
        if (data.length > 0) {
          const savedId = getSelectedEventId();
          const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
          setSelectedEvent(chosen);
          setSelectedEventId(chosen.id);
        }
      } catch {
        setEventsError(true);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  async function loadData(eventId: number) {
    setDataLoading(true);
    setDataError(false);
    setDrinks([]);
    setStats(null);
    setDrinkChoices([]);
    try {
      const [detailsRes, statsRes, choicesRes] = await Promise.all([
        authFetch(`/events/${eventId}`),
        authFetch(`/events/${eventId}/stats`),
        authFetch(`/events/${eventId}/drinks/choices`)
      ]);
      if (detailsRes.ok) {
        const details = (await detailsRes.json()) as EventItem & { drinks?: DrinkOption[] };
        setDrinks(details.drinks ?? []);
        setDrinksEnabled(details.drinksEnabled ?? true);
      }
      if (statsRes.ok) setStats((await statsRes.json()) as EventStats);
      if (choicesRes.ok) setDrinkChoices(await choicesRes.json());
      if (!detailsRes.ok || !statsRes.ok || !choicesRes.ok) setDataError(true);
    } catch {
      setDataError(true);
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedEvent) return;
    void loadData(selectedEvent.id);
  }, [selectedEvent?.id]);

  const filteredChoices = drinkChoices.filter(choice => {
    const q = choiceQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      choice.guestName.toLowerCase().includes(q) ||
      choice.drinkName.toLowerCase().includes(q);
    const matchesDrink = !choiceDrinkId || String(choice.drinkOptionId) === choiceDrinkId;
    return matchesQuery && matchesDrink;
  });

  const sortedChoices = useMemo(() => {
    const list = [...filteredChoices];
    list.sort((a, b) => {
      const dir = choiceSortDir === "asc" ? 1 : -1;
      if (choiceSort === "guest") return a.guestName.localeCompare(b.guestName) * dir;
      if (choiceSort === "drink") return a.drinkName.localeCompare(b.drinkName) * dir;
      if (choiceSort === "category") return a.category.localeCompare(b.category) * dir;
      return (a.quantity - b.quantity) * dir;
    });
    return list;
  }, [filteredChoices, choiceSort, choiceSortDir]);

  const choicePageCount = Math.max(1, Math.ceil(sortedChoices.length / choicePageSize));
  const choicePageSafe = Math.min(choicePage, choicePageCount);
  const pagedChoices = useMemo(() => {
    const start = (choicePageSafe - 1) * choicePageSize;
    return sortedChoices.slice(start, start + choicePageSize);
  }, [sortedChoices, choicePageSafe, choicePageSize]);

  const guestsChosen = useMemo(() => {
    return new Set(drinkChoices.map(choice => choice.guestId)).size;
  }, [drinkChoices]);

  const topDrink = useMemo(() => {
    if (!stats?.drinks || stats.drinks.length === 0) return null;
    return [...stats.drinks].sort((a, b) => (b.totalQuantity ?? 0) - (a.totalQuantity ?? 0))[0];
  }, [stats?.drinks]);

  const drinkStatsMap = useMemo(() => {
    const map = new Map<number, number>();
    stats?.drinks.forEach(item => {
      map.set(item.id, item.totalQuantity ?? 0);
    });
    return map;
  }, [stats?.drinks]);

  const sortedDrinks = useMemo(() => {
    const list = drinks.filter(drink => {
      if (drinkCategoryFilter !== "ALL" && drink.category !== drinkCategoryFilter) return false;
      if (drinkStockFilter === "LOW") {
        if (drink.availableQuantity == null) return false;
        return drink.availableQuantity <= 10;
      }
      if (drinkStockFilter === "LIMITED") {
        return drink.maxPerGuest != null;
      }
      return true;
    });
    const dir = drinkSortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (drinkSort === "name") return a.name.localeCompare(b.name) * dir;
      if (drinkSort === "category") return a.category.localeCompare(b.category) * dir;
      const aCount = drinkStatsMap.get(a.id) ?? 0;
      const bCount = drinkStatsMap.get(b.id) ?? 0;
      return (aCount - bCount) * dir;
    });
    return list;
  }, [drinks, drinkSort, drinkSortDir, drinkStatsMap, drinkCategoryFilter, drinkStockFilter]);

  function downloadDrinksCsv() {
    const headers = ["Boisson", "Categorie", "Choix", "Stock", "Limite par invite"];
    const rows = sortedDrinks.map(drink => {
      const total = drinkStatsMap.get(drink.id) ?? 0;
      return [
        drink.name,
        drink.category === "ALCOHOLIC" ? "Alcool" : "Soft",
        String(total),
        drink.availableQuantity != null ? String(drink.availableQuantity) : "",
        drink.maxPerGuest != null ? String(drink.maxPerGuest) : ""
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/\"/g, "\"\"")}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boissons.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const drinkPageCount = Math.max(1, Math.ceil(sortedDrinks.length / drinkPageSize));
  const drinkPageSafe = Math.min(drinkPage, drinkPageCount);
  const pagedDrinks = useMemo(() => {
    const start = (drinkPageSafe - 1) * drinkPageSize;
    return sortedDrinks.slice(start, start + drinkPageSize);
  }, [sortedDrinks, drinkPageSafe, drinkPageSize]);

  function parseOptionalInt(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
  }

  async function addDrink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !name.trim()) return;
    const res = await authFetch(`/events/${selectedEvent.id}/drinks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        availableQuantity: parseOptionalInt(availableQuantity),
        maxPerGuest: parseOptionalInt(maxPerGuest)
      })
    });
    if (!res.ok) {
      pushToast("Ajout boisson impossible.", "error");
      return;
    }
    setName("");
    setAvailableQuantity("");
    setMaxPerGuest("");
    pushToast("Boisson ajoutee.");
    await loadData(selectedEvent.id);
    setCreateOpen(false);
  }

  function openEdit(drink: DrinkOption) {
    setEditDrinkId(drink.id);
    setName(drink.name);
    setCategory(drink.category);
    setAvailableQuantity(drink.availableQuantity != null ? String(drink.availableQuantity) : "");
    setMaxPerGuest(drink.maxPerGuest != null ? String(drink.maxPerGuest) : "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!selectedEvent || !editDrinkId || !name.trim()) return;
    const res = await authFetch(`/events/${selectedEvent.id}/drinks/${editDrinkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        availableQuantity: parseOptionalInt(availableQuantity),
        maxPerGuest: parseOptionalInt(maxPerGuest)
      })
    });
    if (!res.ok) {
      pushToast("Mise a jour impossible.", "error");
      return;
    }
    pushToast("Boisson mise a jour.");
    setEditOpen(false);
    await loadData(selectedEvent.id);
  }

  async function deleteDrink(drinkId: number) {
    if (!selectedEvent) return;
    setDeletingDrink(true);
    const res = await authFetch(`/events/${selectedEvent.id}/drinks/${drinkId}`, { method: "DELETE" });
    if (!res.ok) {
      pushToast("Suppression impossible.", "error");
      setDeletingDrink(false);
      return;
    }
    setDeletingDrink(false);
    pushToast("Boisson supprimee.");
    await loadData(selectedEvent.id);
  }

  function openDrinkDelete(drink: DrinkOption) {
    setDrinkToDelete(drink);
  }

  async function confirmDeleteDrink() {
    if (!drinkToDelete) return;
    const next = drinkToDelete;
    setDrinkToDelete(null);
    await deleteDrink(next.id);
  }

  async function toggleDrinksEnabled() {
    if (!selectedEvent) return;
    const next = !drinksEnabled;
    const res = await authFetch(`/events/${selectedEvent.id}/drinks/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drinksEnabled: next })
    });
    if (!res.ok) {
      pushToast("Mise a jour impossible.", "error");
      return;
    }
    setDrinksEnabled(next);
  }

  const totalGuests = stats?.guests.total ?? 0;

  return (
    <main className="space-y-6 pb-8 font-sans">
      <Header title="Boissons" description="Configurez les choix proposés aux invités et suivez les quantités prévues." />
      <section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Événement actif</p>
            <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-900">{selectedEvent?.name ?? "Choisissez un événement"}</h2>
            <p className="mt-1 text-sm text-slate-600">Configurez les choix disponibles et consultez les réponses des invités.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <div className="min-h-10 min-w-[220px] rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600" role="status">
                Chargement des événements...
              </div>
            ) : events.length === 0 ? (
              <div className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Aucun événement disponible
              </div>
            ) : (
              <select
                aria-label="Sélectionner un événement"
                className="min-h-11 min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
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
            <button
              type="button"
              aria-pressed={drinksEnabled}
              disabled={!selectedEvent || loading}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                drinksEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-slate-100 text-slate-700"
              }`}
              onClick={toggleDrinksEnabled}
            >
              Choix des invités : {drinksEnabled ? "Activés" : "Désactivés"}
            </button>
            <Button type="button" className="min-h-11 px-4 py-2 text-sm" onClick={() => setCreateOpen(true)} disabled={!selectedEvent || loading}>
              Ajouter une boisson
            </Button>
          </div>
        </div>

        {!selectedEvent ? (
          <EmptyState title={eventsError ? "Événements indisponibles" : "Sélection requise"} description={eventsError ? "Impossible de récupérer les événements. Actualisez la page pour réessayer." : "Sélectionnez un événement pour gérer les boissons et les réponses."} />
        ) : (
          <>
            {dataError ? (
              <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <p className="text-sm font-medium text-rose-900">Certaines données de boissons n’ont pas pu être chargées.</p>
                <Button type="button" variant="ghost" className="min-h-10" onClick={() => void loadData(selectedEvent.id)}>
                  Réessayer
                </Button>
              </div>
            ) : null}
            {dataLoading ? <p className="text-sm text-slate-500" role="status">Mise a jour des donnees...</p> : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invités</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{totalGuests}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Invités ayant répondu</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-950">{guestsChosen}</p>
                <p className="mt-1 text-xs text-emerald-800">{totalGuests ? Math.round((guestsChosen / totalGuests) * 100) : 0}% des invités</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">La plus demandée</p>
                <p className="mt-2 truncate text-lg font-semibold text-amber-950" title={topDrink?.name ?? undefined}>{topDrink?.name ?? "Aucune reponse"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Options de boissons</h3>
                  <p className="text-sm text-slate-600">Gérez le catalogue, les stocks et les limites par invité.</p>
                </div>
                <span className="text-sm text-slate-500">{drinks.length} option(s)</span>
              </div>
              {dataLoading ? (
                <div className="animate-pulse rounded-xl bg-slate-100 px-4 py-8 text-center text-sm text-slate-600" role="status">Chargement du catalogue…</div>
              ) : drinks.length === 0 ? (
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <EmptyState title="Aucune boisson" description="Ajoutez des options pour permettre aux invités de faire leur choix." />
                  <Button type="button" className="min-h-11" onClick={() => setCreateOpen(true)}>Ajouter une boisson</Button>
                </div>
              ) : sortedDrinks.length === 0 ? (
                <EmptyState title="Aucun resultat" description="Aucune boisson ne correspond aux filtres selectionnes." />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <select
                      aria-label="Trier les boissons"
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={drinkSort}
                      onChange={e => { setDrinkSort(e.target.value as typeof drinkSort); setDrinkPage(1); }}
                    >
                      <option value="name">Trier: Nom</option>
                      <option value="category">Trier : catégorie</option>
                      <option value="choices">Trier : choix</option>
                    </select>
                    <select
                      aria-label="Filtrer par categorie"
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={drinkCategoryFilter}
                      onChange={e => { setDrinkCategoryFilter(e.target.value as typeof drinkCategoryFilter); setDrinkPage(1); }}
                    >
                      <option value="ALL">Toutes</option>
                      <option value="SOFT">Soft</option>
                      <option value="ALCOHOLIC">Alcoolisée</option>
                    </select>
                    <select
                      aria-label="Filtrer par stock"
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={drinkStockFilter}
                      onChange={e => { setDrinkStockFilter(e.target.value as typeof drinkStockFilter); setDrinkPage(1); }}
                    >
                      <option value="ALL">Tous stocks</option>
                      <option value="LOW">Stock faible</option>
                      <option value="LIMITED">Limite definie</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Ordre ${drinkSortDir === "asc" ? "croissant" : "decroissant"}`}
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      onClick={() => setDrinkSortDir(prev => (prev === "asc" ? "desc" : "asc"))}
                    >
                      {drinkSortDir === "asc" ? "Asc" : "Desc"}
                    </button>
                    <select
                      aria-label="Nombre de boissons par page"
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={drinkPageSize}
                      onChange={e => {
                        setDrinkPageSize(Number(e.target.value));
                        setDrinkPage(1);
                      }}
                    >
                      <option value={4}>4</option>
                      <option value={6}>6</option>
                      <option value={9}>9</option>
                      <option value={12}>12</option>
                    </select>
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          drinkView === "cards" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => setDrinkView("cards")}
                      >
                        Cartes
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          drinkView === "table" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => setDrinkView("table")}
                      >
                        Tableau
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-10 px-3 py-2 text-sm"
                      onClick={downloadDrinksCsv}
                    >
                      Export CSV
                    </Button>
                  </div>
                  {drinkView === "table" ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[620px] text-xs">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="text-left px-3 py-2">Boisson</th>
                            <th className="text-left px-3 py-2">Catégorie</th>
                            <th className="text-right px-3 py-2">Choix</th>
                            <th className="text-right px-3 py-2">Stock</th>
                            <th className="text-right px-3 py-2">Limite</th>
                            <th className="text-right px-3 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagedDrinks.map(drink => {
                            const total = drinkStatsMap.get(drink.id) ?? 0;
                            return (
                              <tr key={drink.id}>
                                <td className="px-3 py-2">{drink.name}</td>
                                <td className="px-3 py-2 text-textSecondary">
                                  {drink.category === "ALCOHOLIC" ? "Alcool" : "Soft"}
                                </td>
                                <td className="px-3 py-2 text-right">{total}</td>
                                <td className="px-3 py-2 text-right">{drink.availableQuantity ?? "-"}</td>
                                <td className="px-3 py-2 text-right">{drink.maxPerGuest ?? "-"}</td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="px-3 py-1 text-[11px]"
                                      onClick={() => openEdit(drink)}
                                    >
                                      Modifier
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="px-3 py-1 text-[11px] text-red-600"
                                      onClick={() => openDrinkDelete(drink)}
                                    >
                                      Supprimer
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {pagedDrinks.map(drink => {
                        const total = drinkStatsMap.get(drink.id) ?? 0;
                        const progress = totalGuests > 0 ? Math.min((total / totalGuests) * 100, 100) : 0;
                        return (
                          <div key={drink.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{drink.name}</p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {drink.category === "ALCOHOLIC" ? "Alcool" : "Soft"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">Choisie par {total} invités</p>
                            <div className="mt-3 h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Demandes pour ${drink.name}`}>
                              <div className="h-2 rounded-full bg-slate-800 transition-[width]" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>Stock: {drink.availableQuantity ?? "-"}</span>
                              <span>Limite/invite: {drink.maxPerGuest ?? "-"}</span>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                className="px-3 py-1 text-[11px]"
                                onClick={() => openEdit(drink)}
                              >
                                Modifier
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="px-3 py-1 text-[11px] text-red-600"
                                onClick={() => openDrinkDelete(drink)}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-text/60">
                    <span>
                      Page {drinkPageSafe} / {drinkPageCount}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-[11px]"
                        onClick={() => setDrinkPage(p => Math.max(1, p - 1))}
                        disabled={drinkPageSafe <= 1}
                      >
                        Precedent
                      </Button>
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: drinkPageCount }).map((_, index) => {
                          const value = index + 1;
                          if (drinkPageCount > 7 && Math.abs(value - drinkPageSafe) > 2 && value !== 1 && value !== drinkPageCount) {
                            if (value === 2 || value === drinkPageCount - 1) {
                              return (
                                <span key={`drink-ellipsis-${value}`} className="px-2 text-text/40">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }
                          return (
                            <button
                              key={`drink-page-${value}`}
                              type="button"
                              className={`rounded-full px-2 py-1 text-[11px] ${
                                value === drinkPageSafe
                                  ? "bg-primary/10 text-text"
                                  : "text-text/60 hover:bg-primary/5"
                              }`}
                              onClick={() => setDrinkPage(value)}
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
                        onClick={() => setDrinkPage(p => Math.min(drinkPageCount, p + 1))}
                        disabled={drinkPageSafe >= drinkPageCount}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <section className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Réponses des invités</h3>
                <p className="text-sm text-slate-600">Boissons sélectionnées et quantités demandées.</p>
              </div>
              <span className="text-sm text-slate-500">{drinkChoices.length} choix</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {dataLoading ? (
                <div className="animate-pulse rounded-xl bg-slate-100 px-4 py-8 text-center text-sm text-slate-600" role="status">Chargement des réponses…</div>
              ) : drinkChoices.length === 0 ? (
                <div className="p-3">
                  <EmptyState
                    title="Aucun choix enregistré"
                    description="Les invites n'ont pas encore selectionne leurs boissons."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-3 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_minmax(160px,1fr)_auto]">
                      <Input
                        placeholder="Rechercher invite ou boisson..."
                        value={choiceQuery}
                        onChange={e => { setChoiceQuery(e.target.value); setChoicePage(1); }}
                      />
                      <select
                        aria-label="Filtrer par boisson"
                        className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                        value={choiceDrinkId}
                        onChange={e => { setChoiceDrinkId(e.target.value); setChoicePage(1); }}
                      >
                        <option value="">Toutes les boissons</option>
                        {drinks.map(drink => (
                          <option key={drink.id} value={String(drink.id)}>
                            {drink.name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Trier les choix"
                        className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                        value={choiceSort}
                        onChange={e => setChoiceSort(e.target.value as typeof choiceSort)}
                      >
                        <option value="guest">Trier : invité</option>
                        <option value="drink">Trier: Boisson</option>
                        <option value="category">Trier : catégorie</option>
                        <option value="quantity">Trier : quantité</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Nombre de choix par page"
                          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                          value={choicePageSize}
                          onChange={e => {
                            setChoicePageSize(Number(e.target.value));
                            setChoicePage(1);
                          }}
                        >
                          <option value={8}>8</option>
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={20}>20</option>
                        </select>
                        <button
                          type="button"
                          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                          onClick={() => setChoiceSortDir(prev => (prev === "asc" ? "desc" : "asc"))}
                        >
                          {choiceSortDir === "asc" ? "Asc" : "Desc"}
                        </button>
                      </div>
                    </div>
                    {sortedChoices.length === 0 ? (
                      <div className="px-3 pb-3">
                        <EmptyState
                          title="Aucun resultat"
                          description="Aucun choix ne correspond a votre filtre."
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[540px] text-xs">
                        <thead className="bg-background/70 text-textSecondary">
                          <tr>
                            <th className="text-left px-3 py-2">Invité</th>
                            <th className="text-left px-3 py-2">Boisson</th>
                            <th className="text-left px-3 py-2">Catégorie</th>
                            <th className="text-right px-3 py-2">Quantité</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10">
                          {pagedChoices.map(choice => (
                            <tr key={choice.id}>
                              <td className="px-3 py-2">{choice.guestName}</td>
                              <td className="px-3 py-2">{choice.drinkName}</td>
                              <td className="px-3 py-2 text-textSecondary">
                                {choice.category === "ALCOHOLIC" ? "Alcoolisée" : "Soft"}
                              </td>
                              <td className="px-3 py-2 text-right">{choice.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}
                    {sortedChoices.length > 0 ? (
                      <div className="flex items-center justify-between px-3 pb-3 text-[11px] text-text/60">
                        <span>
                          Page {choicePageSafe} / {choicePageCount}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-3 py-1 text-[11px]"
                            onClick={() => setChoicePage(p => Math.max(1, p - 1))}
                            disabled={choicePageSafe <= 1}
                          >
                            Precedent
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-3 py-1 text-[11px]"
                            onClick={() => setChoicePage(p => Math.min(choicePageCount, p + 1))}
                            disabled={choicePageSafe >= choicePageCount}
                          >
                            Suivant
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>

      <Modal open={createOpen} title="Ajouter une boisson">
        <form onSubmit={addDrink} className="space-y-3">
          <Input
            aria-label="Nom de la boisson"
            placeholder="Nom de la boisson"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            aria-label="Catégorie de la boisson"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            value={category}
            onChange={e => setCategory(e.target.value as DrinkOption["category"])}
          >
            <option value="SOFT">Soft</option>
            <option value="ALCOHOLIC">Alcoolisée</option>
          </select>
          <Input
            aria-label="Quantité disponible, facultative"
            placeholder="Quantité disponible (facultatif)"
            value={availableQuantity}
            onChange={e => setAvailableQuantity(e.target.value)}
          />
          <Input
            aria-label="Limite par invité, facultative"
            placeholder="Limite par invité (facultatif)"
            value={maxPerGuest}
            onChange={e => setMaxPerGuest(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className="w-full">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Modifier la boisson">
        <div className="space-y-3">
          <Input
            aria-label="Nom de la boisson"
            placeholder="Nom de la boisson"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            aria-label="Catégorie de la boisson"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            value={category}
            onChange={e => setCategory(e.target.value as DrinkOption["category"])}
          >
            <option value="SOFT">Soft</option>
            <option value="ALCOHOLIC">Alcoolisée</option>
          </select>
          <Input
            aria-label="Quantité disponible, facultative"
            placeholder="Quantité disponible (facultatif)"
            value={availableQuantity}
            onChange={e => setAvailableQuantity(e.target.value)}
          />
          <Input
            aria-label="Limite par invité, facultative"
            placeholder="Limite par invité (facultatif)"
            value={maxPerGuest}
            onChange={e => setMaxPerGuest(e.target.value)}
          />
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

      <ConfirmDialog
        open={Boolean(drinkToDelete)}
        title="Supprimer la boisson"
        description={
          drinkToDelete ? (
            <>
              La boisson <span className="font-semibold text-slate-950">{drinkToDelete.name}</span> sera supprimée.
              Les choix associés seront également retirés.
            </>
          ) : (
            "Cette action est irréversible."
          )
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={deletingDrink}
        onClose={() => setDrinkToDelete(null)}
        onConfirm={confirmDeleteDrink}
      />
    </main>
  );
}
