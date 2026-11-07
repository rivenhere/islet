import type { LanguageTypes } from "@/types/language";
import type { SearchEngine } from "@/config/searchEngines";
import type { Shortcut } from "@/config/shortcuts";
import { normalizeUrl } from "@/config/shortcuts";
import { detectLocale } from "@/i18n";
import { DBHelper } from "@/utils/dbHelper";
import { defineStore } from "pinia";
import { ref } from "vue";

/** Maximum number of search history entries kept */
const MAX_HISTORY = 50;

/**
 * Settings store
 */
export const useSettingStore = defineStore(
  "islet-setting",
  () => {
    /**
     * Whether the settings panel is shown
     */
    const isSettingOpen = ref(false);

    /**
     * Whether the daily quote is shown (it requests hitokoto.cn, the only feature using the network, so it's off by default to stay local)
     */
    const showHitokoto = ref(false);

    /**
     * Whether seconds are shown
     */
    const showSeconds = ref(true);

    /**
     * Hour format: 24-hour / 12-hour
     */
    const hourFormat = ref<"24" | "12">("24");

    /**
     * Whether the date is shown
     */
    const showDate = ref(false);

    /**
     * Whether the weekday is shown
     */
    const showWeekday = ref(false);

    /**
     * Clock size: small / medium / large
     */
    const clockSize = ref<"small" | "medium" | "large">("medium");

    /**
     * Default search engine (an id from searchEngines, built-in or custom)
     */
    const defaultEngine = ref("bing");

    /**
     * User-defined search engines
     */
    const customEngines = ref<SearchEngine[]>([]);

    /**
     * Whether search history suggestions are on (local only, no network)
     */
    const enableSearchHistory = ref(true);

    /**
     * Search history (newest first)
     */
    const searchHistory = ref<string[]>([]);

    /**
     * Theme mode, following the system by default
     */
    const theme = ref<"light" | "dark" | "auto">("auto");

    /**
     * Current language; first use follows the browser, then the saved value is kept
     */
    const language = ref<LanguageTypes>(detectLocale());

    /**
     * Whether the settings button auto-hides
     */
    const autoHideSettingButton = ref(false);

    /**
     * Whether quick navigation is shown below the search bar
     */
    const showShortcuts = ref(true);

    /**
     * Quick navigation list (the user's favorite sites)
     */
    const shortcuts = ref<Shortcut[]>([]);

    /**
     * Whether official site shortcuts are on (matches listed sites while typing, supports /key)
     */
    const enableSiteSearch = ref(true);

    /**
     * How links open: whether in a new tab (Ctrl+Enter flips it temporarily)
     */
    const openInNewTab = ref(false);

    /**
     * Experimental: reload a new tab once so the search box gets focus instead of the address bar
     * (see utils/newTabFocus.ts)
     */
    const focusOnNewTab = ref(false);

    /** Add a search history entry (deduplicated and moved to the top, truncated past the limit) */
    const addSearchHistory = (term: string) => {
      const value = term.trim();
      if (!value) return;
      const next = searchHistory.value.filter((item) => item !== value);
      next.unshift(value);
      searchHistory.value = next.slice(0, MAX_HISTORY);
    };

    /** Delete one search history entry */
    const removeSearchHistory = (term: string) => {
      searchHistory.value = searchHistory.value.filter((item) => item !== term);
    };

    /** Clear search history */
    const clearSearchHistory = () => {
      searchHistory.value = [];
    };

    /** Add a custom search engine */
    const addCustomEngine = (name: string, searchUrl: string) => {
      customEngines.value = [
        ...customEngines.value,
        {
          id: `custom-${crypto.randomUUID()}`,
          name,
          searchUrl,
          builtin: false,
        },
      ];
    };

    /** Delete a custom search engine; if it's the current default, fall back to bing */
    const removeCustomEngine = (id: string) => {
      customEngines.value = customEngines.value.filter((e) => e.id !== id);
      if (defaultEngine.value === id) defaultEngine.value = "bing";
    };

    /**
     * Add a quick navigation entry; the URL is normalized (protocol added).
     * Returns whether it succeeded (fails if the name is empty or the URL is invalid).
     */
    const addShortcut = (
      name: string,
      url: string,
      iconPath?: string,
      color?: string,
    ): boolean => {
      const trimmedName = name.trim();
      const normalized = normalizeUrl(url);
      if (!trimmedName || !normalized) return false;
      shortcuts.value = [
        ...shortcuts.value,
        {
          id: `sc-${crypto.randomUUID()}`,
          name: trimmedName,
          url: normalized,
          iconPath: iconPath || undefined,
          color: color || undefined,
        },
      ];
      return true;
    };

    /** Update a quick navigation entry by id; the URL is normalized, and nothing is written if invalid. Returns whether it succeeded */
    const updateShortcut = (
      id: string,
      patch: { name: string; url: string; iconPath?: string; color?: string },
    ): boolean => {
      const trimmedName = patch.name.trim();
      const normalized = normalizeUrl(patch.url);
      if (!trimmedName || !normalized) return false;
      shortcuts.value = shortcuts.value.map((s) =>
        s.id === id
          ? {
              ...s,
              name: trimmedName,
              url: normalized,
              iconPath: patch.iconPath || undefined,
              color: patch.color || undefined,
            }
          : s,
      );
      return true;
    };

    /** Delete a quick navigation entry */
    const removeShortcut = (id: string) => {
      shortcuts.value = shortcuts.value.filter((s) => s.id !== id);
    };

    return {
      isSettingOpen,
      showSeconds,
      hourFormat,
      showDate,
      showWeekday,
      clockSize,
      showHitokoto,
      defaultEngine,
      customEngines,
      enableSearchHistory,
      searchHistory,
      theme,
      language,
      autoHideSettingButton,
      showShortcuts,
      shortcuts,
      enableSiteSearch,
      openInNewTab,
      focusOnNewTab,
      addSearchHistory,
      removeSearchHistory,
      clearSearchHistory,
      addCustomEngine,
      removeCustomEngine,
      addShortcut,
      updateShortcut,
      removeShortcut,
    };
  },
  {
    // Access localStorage through DBHelper (synchronous, so settings are readable before first paint); the key is still islet-setting
    persist: { storage: DBHelper.local.storage },
  },
);
