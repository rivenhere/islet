/**
 * Multiple languages (vue-i18n, with text in src/locales/<language-tag>.json)
 *
 * Language tag rule: always BCP 47.
 *   - Use only the language subtag: en, ja and so on.
 *   - Chinese must use a script subtag to separate Simplified and Traditional: zh-Hans, zh-Hant.
 *     Don't use zh, zh-CN or zh_CN, which separate by region (Singapore also uses Simplified; Hong Kong and Taiwan both use Traditional).
 *   - Locale file names, setting values and the keys of multi-language fields in sites.json all use the same tag.
 * Exception: public/_locales/zh_CN is a directory name required by the extension spec and is unrelated.
 */
import { createI18n } from "vue-i18n";
import type { LanguageTypes } from "./types/language";
import zhHans from "./locales/zh-Hans.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

/** Supported languages (the order is the order in the settings panel) */
export const SUPPORTED_LOCALES: readonly LanguageTypes[] = [
  "zh-Hans",
  "en",
  "ja",
];

/** Fallback language */
export const FALLBACK_LOCALE: LanguageTypes = "en";

/**
 * Normalize any way of writing a language to a supported tag.
 * Accepts the old setting value "zh" and browser forms such as "zh-CN" / "zh_CN" / "en-US";
 * Traditional Chinese (zh-Hant / zh-TW / zh-HK / zh-MO) has no translation yet, so it falls back to Simplified.
 * Returns null if it can't be recognized.
 */
export const normalizeLocale = (input: unknown): LanguageTypes | null => {
  if (typeof input !== "string" || !input.trim()) return null;
  const parts = input.trim().replace(/_/g, "-").toLowerCase().split("-");
  const lang = parts[0];
  if (lang === "zh") return "zh-Hans";
  return SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lang) ?? null;
};

/**
 * Pick a language from the browser's preferences: the first one Islet supports, or English.
 */
export const detectLocale = (): LanguageTypes => {
  const preferred = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of preferred) {
    const locale = normalizeLocale(lang);
    if (locale) return locale;
  }
  return FALLBACK_LOCALE;
};

export const i18n = createI18n({
  legacy: false,
  locale: FALLBACK_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  messages: { "zh-Hans": zhHans, en, ja },
});

export const setupI18n = (lang: LanguageTypes) => {
  i18n.global.locale.value = lang;
};
