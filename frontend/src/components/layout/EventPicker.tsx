import type { EventItem } from "@/lib/dashboard";

export function EventPicker({
  id,
  events,
  selectedEventId,
  onSelect
}: {
  events: EventItem[];
  id?: string;
  selectedEventId?: number | null;
  onSelect: (event: EventItem) => void;
}) {
  if (events.length === 0) {
    return <p className="text-small">Aucun evenement disponible.</p>;
  }
  const value = selectedEventId ?? events[0].id;

  return (
    <div>
      <select
        id={id}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        value={value}
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
    </div>
  );
}
