/**
 * Official site shortcuts: types, index and parsing helpers for listed sites (single source of truth)
 *
 * Data comes from src/data/sites.json, which only accepts official addresses merged through GitHub PR review,
 * so people can avoid pirated and phishing sites in search results. All built in and local, with no network requests.
 *
 * Supported input:
 *   - `/key` or `/alias`: go straight to the home page (case-insensitive)
 *   - `/key?a=1&b=2`: build the URL from a matching params template; unused parameters are passed through
 *   - Plain text / `tags:code,tool keyword`: match sites in the dropdown
 */
import rawSites from "@/data/sites.json";
import { FALLBACK_LOCALE } from "@/i18n";

/**
 * Text that can vary by language: a plain string applies to every language;
 * an object is keyed by BCP 47 language tag (zh-Hans / en / ja, rules in src/i18n.ts).
 */
export type LocalizedText = string | Record<string, string>;

export interface SiteParam {
  /** Parameter names the template needs; all must be present and non-empty to match */
  param: string[];
  /**
   * URL template with `{param}` placeholders; `{url}` is reserved and replaced by the home page in the
   * current language (without the trailing slash), such as `{url}/{user}/{repo}`, so it follows the language.
   */
  template: string;
}

export interface Site {
  /** Main identifier (lowercase) */
  key: string;
  name: LocalizedText;
  /**
   * Home page; when a site splits by language in its path (such as microsoft.com/zh-cn/) it can be a language
   * object: values use the site's own language format, while keys use this project's language tags.
   */
  url: LocalizedText;
  /** Backup official addresses from the same company (chosen by hand if the main site is down, never automatically) */
  altUrls?: LocalizedText[];
  aliases?: string[];
  desc?: LocalizedText;
  tags?: string[];
  params?: SiteParam[];
}

type RawSite = Omit<Site, "key">;

/** All listed sites (in JSON order) */
export const SITES: Site[] = Object.entries(
  rawSites as Record<string, RawSite>,
).map(([key, site]) => ({ ...site, key: key.toLowerCase() }));

/** key / alias (lowercase) → site */
const SITE_INDEX = new Map<string, Site>();
for (const site of SITES) {
  SITE_INDEX.set(site.key, site);
  for (const alias of site.aliases ?? []) {
    SITE_INDEX.set(alias.toLowerCase(), site);
  }
}

/**
 * Get the text for the current language: exact match → same language family (zh-Hant uses zh-Hans) → en → first available.
 */
export const localize = (
  text: LocalizedText | undefined,
  locale: string,
): string => {
  if (text === undefined) return "";
  if (typeof text === "string") return text;
  const lang = locale.split("-")[0];
  const sameLang = Object.keys(text).find((k) => k.split("-")[0] === lang);
  return (
    text[locale] ??
    (sameLang ? text[sameLang] : undefined) ??
    text[FALLBACK_LOCALE] ??
    Object.values(text)[0] ??
    ""
  );
};

/** All language versions of a text (lowercase), for cross-language matching */
const allVariants = (text: LocalizedText | undefined): string[] =>
  text === undefined
    ? []
    : (typeof text === "string" ? [text] : Object.values(text)).map((v) =>
        v.toLowerCase(),
      );

/** Whether the input is in `/path` route form */
export const isRouteInput = (input: string): boolean =>
  input.trimStart().startsWith("/");

/**
 * Split the input into its `tags:` filters and remaining keyword.
 * Accepts `tags:a,b` and `tags:a tags:b` (AND), and `tags:a|b` for OR, anywhere in the input.
 * In the returned tags, each group is OR and groups are ANDed together: `tags:a|b,c` → [[a, b], [c]].
 */
export const parseTagQuery = (
  input: string,
): { tags: string[][]; text: string } => {
  const tags: string[][] = [];
  const text = input
    .replace(/(^|\s)tags:(\S*)/gi, (_m, lead: string, value: string) => {
      for (const part of value.split(",")) {
        const group = part
          .split("|")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (group.length) tags.push(group);
      }
      return lead;
    })
    .replace(/\s+/g, " ")
    .trim();
  return { tags, text };
};

/** Whether the input contains a tags: filter */
export const hasTagFilter = (input: string): boolean =>
  /(^|\s)tags:/i.test(input);

/** All hostnames of the backup addresses (lowercase), so typing a backup domain also finds the site */
const altHosts = (site: Site): string[] =>
  (site.altUrls ?? []).flatMap((alt) =>
    (typeof alt === "string" ? [alt] : Object.values(alt)).map(
      (url) => new URL(url).hostname,
    ),
  );

/** How relevant a site is to a keyword, 0 means no match (all language versions of name and description are matched) */
const scoreSite = (site: Site, kw: string): number => {
  if (!kw) return 1;
  const ids = [site.key, ...(site.aliases ?? []).map((a) => a.toLowerCase())];
  const names = allVariants(site.name);
  const hosts = altHosts(site);
  if (ids.includes(kw) || hosts.includes(kw)) return 100;
  if (names.includes(kw)) return 90;
  if (ids.some((id) => id.startsWith(kw))) return 70;
  if (hosts.some((host) => host.startsWith(kw))) return 70;
  if (names.some((n) => n.startsWith(kw))) return 60;
  if ([...ids, ...names].some((v) => v.includes(kw))) return 40;
  if (allVariants(site.desc).some((d) => d.includes(kw))) return 20;
  return 0;
};

/**
 * Match sites by keyword and tags (tag groups, and tags with the keyword, are ANDed; `|` within a group is OR).
 * Route input like `/g` matches by key or alias prefix, for completion.
 */
export const matchSites = (input: string, limit = 5): Site[] => {
  const raw = input.trim();
  if (!raw) return [];

  if (isRouteInput(raw)) {
    const key = raw.slice(1).split("?")[0].trim().toLowerCase();
    return SITES.map((site) => ({ site, score: scoreSite(site, key) }))
      .filter(({ score }) => score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ site }) => site);
  }

  const { tags, text } = parseTagQuery(raw);
  if (!tags.length && !text) return [];
  const kw = text.toLowerCase();

  return SITES.filter((site) => {
    const siteTags = (site.tags ?? []).map((t) => t.toLowerCase());
    return tags.every((group) => group.some((t) => siteTags.includes(t)));
  })
    .map((site) => ({ site, score: scoreSite(site, kw) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ site }) => site);
};

/** Build the URL from a params template; returns null if none match */
/** Reserved placeholder in templates for "the home page in the current language" */
export const URL_PLACEHOLDER = "{url}";

const applyParams = (
  site: Site,
  query: URLSearchParams,
  home: string,
  isAlt: boolean,
): string | null => {
  for (const entry of site.params ?? []) {
    const complete = entry.param.every((p) => !!query.get(p));
    if (!complete) continue;
    // Templates with a fixed domain point at the main site and can't use a backup address, so fall back to its home page
    if (isAlt && !entry.template.startsWith(URL_PLACEHOLDER)) return null;

    let url = entry.template
      .split(URL_PLACEHOLDER)
      .join(home.replace(/\/+$/, ""));
    for (const p of entry.param) {
      url = url.split(`{${p}}`).join(encodeURIComponent(query.get(p)!));
    }

    // Append parameters the template didn't use to the target URL
    // A value placed in the host (such as Wikipedia's {lang}) can make an invalid address;
    // fall back to the home page instead of throwing while the user types
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return null;
    }
    for (const [k, v] of query) {
      if (!entry.param.includes(k)) target.searchParams.append(k, v);
    }
    return target.toString();
  }
  return null;
};

/** One target a site can navigate to */
export interface SiteTarget {
  url: string;
  isAlt: boolean;
}

/**
 * Compute all of a site's targets for the current input: the first is always the main site, then backup addresses.
 * With `?query` input every target applies the params templates; a query with no matching template → home page.
 */
export const siteTargets = (
  site: Site,
  input: string,
  locale: string,
): SiteTarget[] => {
  const raw = input.trim();
  const qIndex = isRouteInput(raw) ? raw.indexOf("?") : -1;
  // People type this, so "+" means a plus sign (c++, 2+2), not the URL convention for a space;
  // spaces are typed as spaces.
  const query =
    qIndex >= 0
      ? new URLSearchParams(raw.slice(qIndex + 1).replace(/\+/g, "%2B"))
      : null;

  const toTarget = (text: LocalizedText, isAlt: boolean): SiteTarget => {
    const home = localize(text, locale);
    const url = query && applyParams(site, query, home, isAlt);
    return { url: url || home, isAlt };
  };

  return [
    toTarget(site.url, false),
    ...(site.altUrls ?? []).map((alt) => toTarget(alt, true)),
  ];
};

/**
 * Resolve `/key?query` route input.
 * @returns The matched site and main site URL; null if the key isn't listed
 */
export const resolveRoute = (
  input: string,
  locale: string,
): { site: Site; url: string } | null => {
  const key = input
    .trim()
    .replace(/^\//, "")
    .split("?")[0]
    .trim()
    .toLowerCase();
  const site = SITE_INDEX.get(key);
  if (!site) return null;
  return { site, url: siteTargets(site, input, locale)[0].url };
};

/** For display: the host address without protocol or trailing slash */
export const displayHost = (url: string): string =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Repository address for the site data (contribution entry point) */
export const SITES_REPO_URL = "https://github.com/rivenhere/islet";
/** Contributing guide: the Chinese version for Chinese, otherwise English */
export const contributeUrl = (locale: string): string =>
  `${SITES_REPO_URL}/blob/main/CONTRIBUTING${locale.startsWith("zh") ? ".zh" : ""}.md`;
