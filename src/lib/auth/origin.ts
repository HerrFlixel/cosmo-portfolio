/** true, wenn der Origin-Header zum selben Host gehört wie die Anfrage (Schutz vor fremden Seiten). */
export function sameHost(origin: string, url: string): boolean {
  try {
    return new URL(origin).host === new URL(url).host;
  } catch {
    return false;
  }
}
