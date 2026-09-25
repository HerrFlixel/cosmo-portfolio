/** Liest ein Cookie aus einem Request oder einem Cookie-Header; kaputte Kodierung → undefined. */
export function readCookie(source: Request | string | null, name: string): string | undefined {
  const header = typeof source === "string" || source === null ? source : source.headers.get("cookie");
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(rest.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}
