import type { EventItem } from "@/lib/dashboard";

export function EventPicker({
  events,
  selectedEventId,
  onSelect
}: {
  events: EventItem[];
  selectedEventId?: number | null;
  onSelect: (event: EventItem) => void;
}) {
  if (events.length === 0) {
    return <p className="text-small">Aucun evenement disponible.</p>;
  }

  const selected = events.find(event => event.id === selectedEventId) ?? events[0];

  return (
    <div className="space-y-2">
      <select
        className="w-full rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs"
        value={selectedEventId ?? selected.id}
        onChange={e => {
          const value = Number(e.target.value);
          const event = events.find(item => item.id === value);
          if (!event) return;
          onSelect(event);
        }}
      >
        {events.map(event => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-[11px] text-text/60">
          <div className="flex justify-between gap-2">
            <span className="font-medium text-text">{selected.name}</span>
            <span className="uppercase">{selected.type}</span>
          </div>
          <div>
            {new Date(selected.dateTime).toLocaleString("fr-FR")} . {selected.location}
          </div>
        </div>
      ) : null}
    </div>
  );
}
