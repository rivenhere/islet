/**
 * Recognize an address typed into the search box, so Enter goes straight to it instead of searching.
 *
 * Always recognized: http(s):// addresses, localhost and IPv4 addresses (with optional port and path).
 * A bare domain such as github.com is recognized only when its ending is in COMMON_TLDS below. The list is
 * deliberately short: endings that are also common file extensions (md, py, sh, rs, pl, cc, so...) are left
 * out, so searches like readme.md or main.py stay searches. Sites on other endings work with https:// typed.
 */

/** Popular domain endings: generic ones plus widely used country codes */
// prettier-ignore
const COMMON_TLDS = new Set([
  // Generic
  "com", "net", "org", "edu", "gov", "mil", "int", "info", "biz",
  "io", "dev", "app", "ai", "co", "me", "tv", "xyz", "top", "site",
  "online", "tech", "store", "shop", "blog", "cloud", "page", "link",
  "live", "news", "wiki", "pro", "art", "design", "one", "fun",
  "space", "website", "club", "vip", "asia", "game", "games", "moe",
  // Country codes
  "cn", "jp", "kr", "tw", "hk", "mo", "sg", "uk", "us", "ca", "au",
  "nz", "de", "fr", "it", "es", "nl", "be", "ch", "at", "se", "no",
  "dk", "fi", "ie", "pt", "ru", "ua", "br", "mx", "ar", "cl", "in",
  "id", "th", "vn", "ph", "my", "tr", "il", "eu", "za", "cz", "gr",
  "hu", "ro",
]);

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
/** One domain label: letters (any script), digits and inner hyphens */
const LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;

const isIPv4 = (host: string): boolean => {
  const m = IPV4.exec(host);
  return !!m && m.slice(1).every((n) => Number(n) <= 255);
};

/**
 * Turn search box input into an address to open, or null if it should be searched.
 * @returns The full URL (with the protocol added when it was left out)
 */
export const parseUrlInput = (input: string): string | null => {
  const value = input.trim();
  // Spaces mean words to search; "/" starts an official site route
  if (!value || /\s/.test(value) || value.startsWith("/")) return null;

  // An explicit http(s):// address
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.hostname ? url.href : null;
    } catch {
      return null;
    }
  }
  // Any other "word:" prefix (tags:, mailto:, javascript:) isn't an address to open here,
  // except a port right after a host (localhost:3000), which the host checks below handle
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value)) return null;
  // An "@" before the host is an email address or login, not something to open
  const hostPart = value.split(/[/?#]/)[0];
  if (hostPart.includes("@")) return null;

  const host = hostPart.replace(/:\d{1,5}$/, "").toLowerCase();
  let scheme: string;
  if (host === "localhost" || isIPv4(host)) {
    // Local servers and routers usually speak plain http
    scheme = "http://";
  } else {
    const labels = host.split(".");
    if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null;
    if (!COMMON_TLDS.has(labels[labels.length - 1])) return null;
    scheme = "https://";
  }

  try {
    return new URL(scheme + value).href;
  } catch {
    return null;
  }
};
