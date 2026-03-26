type BadgeStatus = "confirmed" | "pending" | "cancelled";

export function Badge({ status }: { status: BadgeStatus }) {
  const colors: Record<BadgeStatus, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return <span className={`px-3 py-1 rounded-full text-sm ${colors[status]}`}>{status}</span>;
}
