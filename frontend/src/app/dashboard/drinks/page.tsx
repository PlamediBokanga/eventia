"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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

  const { pushToast } = useToast();

  useEffect(() => {
    async function init() {
      try {
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
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  async function loadData(eventId: number) {
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
    if (!window.confirm("Supprimer cette boisson ?")) return;
    const res = await authFetch(`/events/${selectedEvent.id}/drinks/${drinkId}`, { method: "DELETE" });
    if (!res.ok) {
      pushToast("Suppression impossible.", "error");
      return;
    }
    pushToast("Boisson supprimee.");
    await loadData(selectedEvent.id);
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
    <main className="space-y-4">
      <Header title="Gestion des boissons" />
      <section className="card p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="title-4">Gestion des boissons</h2>
            <p className="text-small text-textSecondary">Definissez les choix et suivez les preferences.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs ${
                drinksEnabled ? "bg-primary/10 text-text" : "bg-red-50 text-red-700"
              }`}
              onClick={toggleDrinksEnabled}
            >
              Choix invites: {drinksEnabled ? "ON" : "OFF"}
            </button>
            <Button type="button" className="px-4 py-2 text-xs" onClick={() => setCreateOpen(true)}>
              + Ajouter une boisson
            </Button>
          </div>
        </div>

        {!selectedEvent ? (
          <p className="text-small">Selectionnez un evenement.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Total invites</p>
                <p className="mt-1 text-lg font-semibold">{totalGuests}</p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-green-700">Invites ayant choisi</p>
                <p className="mt-1 text-lg font-semibold text-green-700">{guestsChosen}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">Boisson la plus demandee</p>
                <p className="mt-1 text-lg font-semibold text-amber-700">{topDrink?.name ?? "-"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Boissons disponibles</h3>
              {drinks.length === 0 ? (
                <EmptyState
                  title="Aucune boisson"
                  description="Ajoutez les options soft et alcoolisees pour permettre le choix des invites."
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                      value={drinkSort}
                      onChange={e => setDrinkSort(e.target.value as typeof drinkSort)}
                    >
                      <option value="name">Trier: Nom</option>
                      <option value="category">Trier: Categorie</option>
                      <option value="choices">Trier: Choix</option>
                    </select>
                    <select
                      className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                      value={drinkCategoryFilter}
                      onChange={e => setDrinkCategoryFilter(e.target.value as typeof drinkCategoryFilter)}
                    >
                      <option value="ALL">Toutes</option>
                      <option value="SOFT">Soft</option>
                      <option value="ALCOHOLIC">Alcoolisee</option>
                    </select>
                    <select
                      className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                      value={drinkStockFilter}
                      onChange={e => setDrinkStockFilter(e.target.value as typeof drinkStockFilter)}
                    >
                      <option value="ALL">Tous stocks</option>
                      <option value="LOW">Stock faible</option>
                      <option value="LIMITED">Limite definie</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px]"
                      onClick={() => setDrinkSortDir(prev => (prev === "asc" ? "desc" : "asc"))}
                    >
                      {drinkSortDir === "asc" ? "Asc" : "Desc"}
                    </button>
                    <select
                      className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
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
                    <div className="flex items-center gap-1 rounded-full border border-primary/10 bg-background/70 px-1 py-1">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          drinkView === "cards" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                        }`}
                        onClick={() => setDrinkView("cards")}
                      >
                        Cartes
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          drinkView === "table" ? "bg-primary/10 text-text" : "text-text/60 hover:bg-primary/5"
                        }`}
                        onClick={() => setDrinkView("table")}
                      >
                        Tableau
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-2 text-xs"
                      onClick={downloadDrinksCsv}
                    >
                      Export CSV
                    </Button>
                  </div>
                  {drinkView === "table" ? (
                    <div className="rounded-xl border border-primary/10 overflow-x-auto">
                      <table className="w-full min-w-[540px] text-[11px] sm:text-xs">
                        <thead className="bg-background/70 text-textSecondary">
                          <tr>
                            <th className="text-left px-3 py-2">Boisson</th>
                            <th className="text-left px-3 py-2">Categorie</th>
                            <th className="text-right px-3 py-2">Choix</th>
                            <th className="text-right px-3 py-2">Stock</th>
                            <th className="text-right px-3 py-2">Limite</th>
                            <th className="text-right px-3 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10">
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
                                      onClick={() => deleteDrink(drink.id)}
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
                          <div key={drink.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{drink.name}</p>
                              <span className="text-[11px] text-text/60">
                                {drink.category === "ALCOHOLIC" ? "Alcool" : "Soft"}
                              </span>
                            </div>
                            <p className="text-small text-text/70">Choisi par: {total} invites</p>
                            <div className="mt-2 h-2 rounded-full bg-primary/10">
                              <div className="h-2 rounded-full bg-accent" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text/60">
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
                                onClick={() => deleteDrink(drink.id)}
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

            <div className="rounded-xl border border-primary/10">
              {drinkChoices.length === 0 ? (
                <div className="p-3">
                  <EmptyState
                    title="Aucun choix enregistre"
                    description="Les invites n'ont pas encore selectionne leurs boissons."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr,auto,auto] gap-2 px-3 pt-3 text-xs">
                      <Input
                        placeholder="Rechercher invite ou boisson..."
                        value={choiceQuery}
                        onChange={e => setChoiceQuery(e.target.value)}
                      />
                      <select
                        className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                        value={choiceDrinkId}
                        onChange={e => setChoiceDrinkId(e.target.value)}
                      >
                        <option value="">Toutes les boissons</option>
                        {drinks.map(drink => (
                          <option key={drink.id} value={String(drink.id)}>
                            {drink.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
                        value={choiceSort}
                        onChange={e => setChoiceSort(e.target.value as typeof choiceSort)}
                      >
                        <option value="guest">Trier: Invite</option>
                        <option value="drink">Trier: Boisson</option>
                        <option value="category">Trier: Categorie</option>
                        <option value="quantity">Trier: Quantite</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2"
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
                          className="rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px]"
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
                      <table className="w-full text-[11px] sm:text-xs">
                        <thead className="bg-background/70 text-textSecondary">
                          <tr>
                            <th className="text-left px-3 py-2">Invite</th>
                            <th className="text-left px-3 py-2">Boisson</th>
                            <th className="text-left px-3 py-2">Categorie</th>
                            <th className="text-right px-3 py-2">Quantite</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10">
                          {pagedChoices.map(choice => (
                            <tr key={choice.id}>
                              <td className="px-3 py-2">{choice.guestName}</td>
                              <td className="px-3 py-2">{choice.drinkName}</td>
                              <td className="px-3 py-2 text-textSecondary">
                                {choice.category === "ALCOHOLIC" ? "Alcoolisee" : "Soft"}
                              </td>
                              <td className="px-3 py-2 text-right">{choice.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
          </>
        )}
      </section>

      <Modal open={createOpen} title="Ajouter une boisson">
        <form onSubmit={addDrink} className="space-y-3">
          <Input
            placeholder="Nom boisson"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
            value={category}
            onChange={e => setCategory(e.target.value as DrinkOption["category"])}
          >
            <option value="SOFT">Soft</option>
            <option value="ALCOHOLIC">Alcoolisee</option>
          </select>
          <Input
            placeholder="Quantite disponible (optionnel)"
            value={availableQuantity}
            onChange={e => setAvailableQuantity(e.target.value)}
          />
          <Input
            placeholder="Limite par invite (optionnel)"
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
            placeholder="Nom boisson"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
            value={category}
            onChange={e => setCategory(e.target.value as DrinkOption["category"])}
          >
            <option value="SOFT">Soft</option>
            <option value="ALCOHOLIC">Alcoolisee</option>
          </select>
          <Input
            placeholder="Quantite disponible (optionnel)"
            value={availableQuantity}
            onChange={e => setAvailableQuantity(e.target.value)}
          />
          <Input
            placeholder="Limite par invite (optionnel)"
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
    </main>
  );
}
