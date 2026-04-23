export function normalizePublicUrl(value?: string | null) {
  if (!value) return "";
  if (typeof window === "undefined") return value;

  if (window.location.protocol === "https:" && value.startsWith("http://")) {
    return `https://${value.slice("http://".length)}`;
  }

  return value;
}
