#!/usr/bin/env node
/**
 * Validates src/data/sites.json (the official site data). Shared by CI and local use:
 *   node scripts/validate-sites.mjs
 *
 * Rules: valid JSON; keys and aliases globally unique (case-insensitive); name and url required;
 * url and templates must use https:// (templates can also start with {url}, the home page in the current language);
 * every parameter in params must appear in its template, and every template placeholder must be declared (except the reserved {url}, which can't be a parameter name);
 * name / desc / url can be a string or a language object, whose keys must be BCP 47 tags existing in src/locales/ and must include en;
 * altUrls has at most 3 per site, also https://, and its domains can't repeat any site's main or backup domain.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../src/data/sites.json", import.meta.url));
const localesDir = fileURLToPath(new URL("../src/locales/", import.meta.url));
// Supported language tags = the locale file names in src/locales (zh-Hans / en / ja ...)
const LOCALES = readdirSync(localesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5));
const errors = [];
const fail = (msg) => errors.push(msg);

let data;
try {
  data = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`✗ sites.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (!data || typeof data !== "object" || Array.isArray(data)) {
  console.error("✗ sites.json must be an object at the top level (key → site)");
  process.exit(1);
}

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isStrArr = (v) => Array.isArray(v) && v.every(isStr);

/** Validate a field that can vary by language: a string, or a { language tag: string } object */
const checkLocalized = (key, field, v) => {
  if (isStr(v)) return;
  if (!v || typeof v !== "object" || Array.isArray(v) || !Object.keys(v).length) {
    fail(`[${key}] ${field} must be a non-empty string or a language object`);
    return;
  }
  for (const [lang, text] of Object.entries(v)) {
    if (!LOCALES.includes(lang)) {
      fail(`[${key}] ${field} has an invalid language tag "${lang}", available: ${LOCALES.join(" / ")}`);
    }
    if (!isStr(text)) fail(`[${key}] ${field}.${lang} must be a non-empty string`);
  }
  // en is the interface's fallback language: without it, users of other languages see the first listed language
  if (!("en" in v)) fail(`[${key}] ${field} language object must include en`);
};
const isHttps = (v) => {
  try {
    return new URL(v.replace(/\{[^}]+\}/g, "x")).protocol === "https:";
  } catch {
    return false;
  }
};

const KNOWN = new Set(["name", "url", "altUrls", "aliases", "desc", "tags", "params"]);
const MAX_ALT_URLS = 3;
const owners = new Map(); // Lowercase id → owning key

/** All addresses of a field that can vary by language */
const urlsOf = (v) =>
  typeof v === "string" ? [v] : Object.values(v ?? {}).filter((u) => typeof u === "string");
const hostOf = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

// Register all main domains first, so backup domain conflicts are found regardless of order
const mainHosts = new Map(); // Main domain → list of owning keys
for (const [key, site] of Object.entries(data)) {
  for (const host of new Set(urlsOf(site?.url).map(hostOf))) {
    if (host) mainHosts.set(host, [...(mainHosts.get(host) ?? []), key]);
  }
}
const altHostOwners = new Map(); // Backup domain → owning key

const claim = (id, key) => {
  const lower = id.toLowerCase();
  if (/[\s?/#]/.test(lower)) fail(`[${key}] identifier "${id}" can't contain spaces, /, ? or #`);
  if (owners.has(lower)) {
    fail(`[${key}] identifier "${id}" conflicts with site [${owners.get(lower)}]`);
  } else {
    owners.set(lower, key);
  }
};

for (const [key, site] of Object.entries(data)) {
  claim(key, key);
  if (!site || typeof site !== "object") {
    fail(`[${key}] must be an object`);
    continue;
  }
  for (const field of Object.keys(site)) {
    if (!KNOWN.has(field)) fail(`[${key}] unknown field "${field}"`);
  }
  if (site.name === undefined) fail(`[${key}] missing name`);
  else checkLocalized(key, "name", site.name);
  if (site.url === undefined) {
    fail(`[${key}] missing url`);
  } else {
    checkLocalized(key, "url", site.url);
    const urls = typeof site.url === "string" ? [site.url] : Object.values(site.url ?? {});
    for (const u of urls) {
      if (isStr(u) && !isHttps(u)) fail(`[${key}] url "${u}" must be a valid address starting with https://`);
    }
  }
  if (site.altUrls !== undefined) {
    if (!Array.isArray(site.altUrls) || site.altUrls.length === 0) {
      fail(`[${key}] altUrls must be a non-empty array`);
    } else {
      if (site.altUrls.length > MAX_ALT_URLS) {
        fail(`[${key}] altUrls can have at most ${MAX_ALT_URLS}, found ${site.altUrls.length}`);
      }
      site.altUrls.forEach((alt, i) => {
        const where = `[${key}] altUrls[${i}]`;
        checkLocalized(key, `altUrls[${i}]`, alt);
        const urls = urlsOf(alt);
        for (const u of urls) {
          if (isStr(u) && !isHttps(u)) fail(`${where} "${u}" must be a valid address starting with https://`);
        }
        for (const host of new Set(urls.map(hostOf))) {
          if (!host) continue;
          const mainOwners = mainHosts.get(host);
          if (mainOwners) {
            fail(`${where} domain ${host} is already the main domain of [${mainOwners.join(", ")}]`);
          }
          if (altHostOwners.has(host)) {
            fail(`${where} domain ${host} is already a backup domain of [${altHostOwners.get(host)}]`);
          } else {
            altHostOwners.set(host, key);
          }
        }
      });
    }
  }
  if (site.aliases !== undefined) {
    if (!isStrArr(site.aliases)) fail(`[${key}] aliases must be an array of strings`);
    else site.aliases.forEach((a) => claim(a, key));
  }
  if (site.desc !== undefined) checkLocalized(key, "desc", site.desc);
  if (site.tags !== undefined && !isStrArr(site.tags)) fail(`[${key}] tags must be an array of strings`);

  if (site.params !== undefined) {
    if (!Array.isArray(site.params)) {
      fail(`[${key}] params must be an array`);
      continue;
    }
    site.params.forEach((entry, i) => {
      const where = `[${key}] params[${i}]`;
      if (!isStrArr(entry?.param) || entry.param.length === 0) {
        fail(`${where}.param must be a non-empty array of strings`);
        return;
      }
      if (entry.param.includes("url")) fail(`${where} "url" is a reserved placeholder and can't be a parameter name`);
      const usesUrl = isStr(entry.template) && entry.template.includes("{url}");
      if (usesUrl && !entry.template.startsWith("{url}")) {
        fail(`${where}.template can only have {url} at the start`);
      }
      // Substitute an https address for {url}, then validate the whole template
      const sample = isStr(entry.template)
        ? entry.template.split("{url}").join("https://example.com")
        : "";
      if (!isHttps(sample)) {
        fail(`${where}.template must start with https:// or {url}`);
        return;
      }
      const placeholders = [...entry.template.matchAll(/\{([^}]+)\}/g)]
        .map((m) => m[1])
        .filter((p) => p !== "url");
      for (const p of entry.param) {
        if (!placeholders.includes(p)) fail(`${where} parameter "${p}" isn't used in the template`);
      }
      for (const p of placeholders) {
        if (!entry.param.includes(p)) fail(`${where} template placeholder "{${p}}" isn't declared in param`);
      }
    });
  }
}

if (errors.length) {
  console.error(`✗ sites.json validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ sites.json is valid, ${Object.keys(data).length} sites`);
