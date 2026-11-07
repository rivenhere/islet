/**
 * Settings import / export helpers
 *
 * Local only: exports as a downloaded JSON file; imports parse and type-check values before writing them to the store.
 */
import type { useSettingStore } from "@/store/setting";
import { normalizeLocale } from "@/i18n";

type SettingStore = ReturnType<typeof useSettingStore>;

/** Format version of the exported file, for future compatibility */
const EXPORT_VERSION = 1;

/** Settings included in import / export (excludes temporary UI state such as isSettingOpen) */
const TRANSFER_KEYS = [
  "showHitokoto",
  "showSeconds",
  "hourFormat",
  "showDate",
  "showWeekday",
  "clockSize",
  "defaultEngine",
  "customEngines",
  "enableSearchHistory",
  "searchHistory",
  "theme",
  "language",
  "autoHideSettingButton",
  "showShortcuts",
  "shortcuts",
  "enableSiteSearch",
  "openInNewTab",
  "focusOnNewTab",
] as const;

type TransferKey = (typeof TRANSFER_KEYS)[number];

const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): boolean => typeof v === "boolean";

const isValidEngine = (e: unknown): boolean =>
  !!e &&
  typeof e === "object" &&
  isStr((e as Record<string, unknown>).id) &&
  isStr((e as Record<string, unknown>).name) &&
  isStr((e as Record<string, unknown>).searchUrl);

/** Optional string field (missing or a string are both valid) */
const isOptStr = (v: unknown): boolean => v === undefined || isStr(v);

const isValidShortcut = (s: unknown): boolean =>
  !!s &&
  typeof s === "object" &&
  isStr((s as Record<string, unknown>).id) &&
  isStr((s as Record<string, unknown>).name) &&
  isStr((s as Record<string, unknown>).url) &&
  isOptStr((s as Record<string, unknown>).iconPath) &&
  isOptStr((s as Record<string, unknown>).color);

/** Validation for each setting; invalid values are filtered out one by one on import */
const VALIDATORS: Record<TransferKey, (v: unknown) => boolean> = {
  showHitokoto: isBool,
  showSeconds: isBool,
  hourFormat: (v) => v === "24" || v === "12",
  showDate: isBool,
  showWeekday: isBool,
  clockSize: (v) => v === "small" || v === "medium" || v === "large",
  defaultEngine: isStr,
  customEngines: (v) => Array.isArray(v) && v.every(isValidEngine),
  enableSearchHistory: isBool,
  searchHistory: (v) => Array.isArray(v) && v.every(isStr),
  theme: (v) => v === "light" || v === "dark" || v === "auto",
  // Accept forms like "zh" from old backups; normalized before being applied
  language: (v) => normalizeLocale(v) !== null,
  autoHideSettingButton: isBool,
  showShortcuts: isBool,
  shortcuts: (v) => Array.isArray(v) && v.every(isValidShortcut),
  enableSiteSearch: isBool,
  openInNewTab: isBool,
  focusOnNewTab: isBool,
};

/** Build the export object */
const buildExport = (store: SettingStore) => {
  const settings: Record<string, unknown> = {};
  for (const key of TRANSFER_KEYS) settings[key] = store[key];
  return { app: "islet", version: EXPORT_VERSION, settings };
};

/** Export settings as a JSON file and trigger the download */
export const downloadSettings = (store: SettingStore) => {
  const data = JSON.stringify(buildExport(store), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "islet-settings.json";
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Parse and apply imported settings text.
 * @returns Whether the import succeeded (the file parses and has at least one valid setting)
 */
export const applySettingsImport = (
  store: SettingStore,
  raw: string,
): boolean => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }

  const settings = (parsed as Record<string, unknown>)?.settings;
  if (!settings || typeof settings !== "object") return false;

  const source = settings as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of TRANSFER_KEYS) {
    if (key in source && VALIDATORS[key](source[key])) {
      patch[key] =
        key === "language" ? normalizeLocale(source[key]) : source[key];
    }
  }

  if (Object.keys(patch).length === 0) return false;

  store.$patch(patch);
  return true;
};
