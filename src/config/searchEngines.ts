/**
 * Search engine configuration (single source of truth)
 *
 * Components and the settings panel all read engines from here, to avoid duplicated hardcoding.
 */

export interface SearchEngine {
  /** Unique id; the persisted defaultEngine setting refers to this id */
  id: string;
  /** Display name */
  name: string;
  /** Search URL template with %s for the search term; without %s the term is appended to the end */
  searchUrl: string;
  /** Whether it's built in (built-in engines can't be edited or deleted) */
  builtin?: boolean;
}

/** Built-in search engines; ids match earlier versions so persisted settings keep working */
export const BUILTIN_ENGINES: SearchEngine[] = [
  {
    id: "bing",
    name: "Bing",
    searchUrl: "https://www.bing.com/search?q=%s",
    builtin: true,
  },
  {
    id: "google",
    name: "Google",
    searchUrl: "https://www.google.com/search?q=%s",
    builtin: true,
  },
  {
    id: "baidu",
    name: "Baidu",
    searchUrl: "https://www.baidu.com/s?wd=%s",
    builtin: true,
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    searchUrl: "https://duckduckgo.com/?q=%s",
    builtin: true,
  },
];

/** Build the final URL from an engine and search term */
export const buildSearchUrl = (engine: SearchEngine, query: string): string => {
  const encoded = encodeURIComponent(query);
  return engine.searchUrl.includes("%s")
    ? engine.searchUrl.split("%s").join(encoded)
    : engine.searchUrl + encoded;
};
