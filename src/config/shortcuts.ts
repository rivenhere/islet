/**
 * Quick navigation data structures and helpers (single source of truth)
 *
 * Tile appearance: a built-in pixel icon (see navIcons.ts) or the site's initial; the main color can come
 * from the palette below, or is derived consistently from the name, so the default still looks orderly.
 */

export interface Shortcut {
  /** Unique id */
  id: string;
  /** Display name */
  name: string;
  /** Target address (normalized, including the protocol) */
  url: string;
  /**
   * The icon SVG's path `d` data (stored inline when an icon is chosen,
   * so new tabs can render tiles without loading the large icon library); empty shows the name's initial.
   */
  iconPath?: string;
  /** Tile main color (hex, such as #4a6fa5); empty derives it from the name */
  color?: string;
}

/**
 * Curated pixel palette: low saturation and restrained overall, for a refined look.
 * Readable in both light and dark themes, with a near-white foreground throughout.
 */
export const SHORTCUT_COLORS: string[] = [
  "#64748b", // slate
  "#c14953", // rose
  "#c2703d", // orange
  "#b7791f", // amber
  "#5b8266", // green
  "#3f7f7a", // teal
  "#3b7f99", // cyan
  "#4a6fa5", // blue
  "#5b5f97", // indigo
  "#7c6a9c", // violet
  "#b06a8f", // pink
  "#8a6d52", // brown
];

/** Tile foreground color (icon / initial), fixed near-white to suit the muted backgrounds */
export const SHORTCUT_FG = "#f5f5f5";

/** Derive a palette color consistently from a name (same name, same color; evenly distributed) */
export const colorForName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SHORTCUT_COLORS[hash % SHORTCUT_COLORS.length];
};

/** Use the name's first character as a letter icon (uppercase for English, others unchanged, ? if empty) */
export const initialForName = (name: string): string => {
  const ch = name.trim().charAt(0);
  if (!ch) return "?";
  return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
};

/**
 * Normalize a URL typed by the user: add https:// if the protocol is missing.
 * Returns an empty string if it can't be recognized as a valid address.
 */
export const normalizeUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    return new URL(withScheme).href;
  } catch {
    return "";
  }
};
