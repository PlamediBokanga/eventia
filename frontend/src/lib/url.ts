import { API_URL } from "@/lib/config";

export function normalizePublicUrl(value?: string | null) {
  if (!value) return "";

  const apiBase = API_URL.replace(/\/+$/, "");

  if (value.startsWith("/uploads/")) {
    return `${apiBase}${value}`;
  }

  const isAbsoluteUrl = /^https?:\/\//i.test(value);
  if (isAbsoluteUrl) {
    try {
      const url = new URL(value);
      if (url.pathname.startsWith("/uploads/")) {
        return `${apiBase}${url.pathname}${url.search}${url.hash}`;
      }
      if (url.protocol === "http:") {
        url.protocol = "https:";
        return url.toString();
      }
      return url.toString();
    } catch {
      return value.startsWith("http://") ? `https://${value.slice("http://".length)}` : value;
    }
  }

  if (typeof window === "undefined") return value;

  return value;
}
