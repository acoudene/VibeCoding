/**
 * Extract a YouTube videoId from a URL or return the value if it's already
 * an 11-char id. Returns null if neither matches.
 *
 * Supports:
 * - youtu.be/{id}
 * - youtube.com/watch?v={id}
 * - youtube.com/embed/{id}
 * - youtube.com/shorts/{id}
 * - bare 11-char id
 */
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith("youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts") {
        const id = parts[1];
        if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    /* not a URL */
  }
  return null;
}
