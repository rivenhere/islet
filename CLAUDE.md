# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Islet is a minimal pixel-style (Neo-brutalism / 8-bit) new tab extension for browsers (Manifest V3, compatible with Chrome and Firefox). Tech stack: Vue 3 (`<script setup>` + Composition API) + TypeScript + Vite + Sass + Pinia + vue-i18n. The package manager is pnpm.

**Hard design principles** (these decide which features are acceptable):

- **Zero network permissions**: the manifest requests no host_permissions or permissions. Any feature that needs cross-origin APIs (such as live search engine suggestions) would break this selling point, so use a purely local approach instead (see the decision record in task 1 of TODO.md).
- Minimal, pixel aesthetic, and as small an extension as possible (don't add dependencies or bundled assets lightly).

## Common commands

```bash
pnpm dev                    # Dev server (debug as a normal web page)
pnpm build                  # Type check (vue-tsc -b) + build to dist/
pnpm format                 # Format src/ with Prettier
node scripts/validate-sites.mjs   # Validate sites.json (same as CI)
scripts/publish.sh build    # Build both Chrome/Firefox zips for the current version into release/ (for local debugging)
scripts/publish.sh patch    # Release: bump version -> build both zips -> commit + tag -> ask whether to push
```

There are no tests or ESLint. The vue-tsc step in `pnpm build` is the only static check, so use it to verify code changes. PR CI only validates sites.json and doesn't run type checking.

## Workflow conventions (from TODO.md)

- Iteration flow: **implement one task at a time → hand it to the user for manual acceptance → commit only after it passes**. Don't commit before acceptance.
- Commit messages use English conventional style (`feat: ...` / `fix: ...` / `chore: ...`) and contain **no AI attribution of any kind** (no Co-Authored-By or similar).
- TODO.md records the iteration plan and shelved directions; update its status markers when a task is finished. [DESIGN.md](DESIGN.md) describes the current product design; update it when behavior changes. Both files are local-only (git-ignored), so never stage or link them from tracked docs.
- User-facing docs are bilingual: English by default in [README.md](README.md) / [CONTRIBUTING.md](CONTRIBUTING.md), Chinese in [README.zh.md](README.zh.md) / [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md). Change both versions together. Issue and PR templates under `.github` are bilingual within one file, English first and Chinese second.

## Architecture

The single-page Vue app is the new tab page itself, with no background or content scripts. [App.vue](src/App.vue) composes all components in a flat layout: clock, search bar, quick navigation, daily quote, settings button and panel.

**Cross-file mechanisms** (linked changes that are easy to miss):

- **A new setting must be added in four places**:
  1. [src/store/setting.ts](src/store/setting.ts) — the only Pinia store, persisted as a whole to localStorage (key `islet-setting`);
  2. [src/components/SettingPanel.vue](src/components/SettingPanel.vue) — the settings UI (tabs: Clock / System / About);
  3. [src/utils/settingsTransfer.ts](src/utils/settingsTransfer.ts) — `TRANSFER_KEYS` and `VALIDATORS` for import/export (each value is type-checked; if you miss it, the setting isn't included in backups);
  4. [src/locales/](src/locales/) — **add the text to all three JSON files: zh-Hans, en and ja**.
- **Default language**: on first use, `detectLocale()` ([src/i18n.ts](src/i18n.ts)) picks the first browser language Islet supports, falling back to English (`FALLBACK_LOCALE`; also `default_locale` in the manifest). Saved language settings are kept.
- **Language tag rule (BCP 47)**: Chinese uses script subtags `zh-Hans` / `zh-Hant`, never `zh` or `zh-CN`; other languages use only the language subtag (`en`, `ja`). Locale file names, the `language` setting value, and the keys of multi-language fields in `sites.json` all use the same tag. `normalizeLocale` ([src/i18n.ts](src/i18n.ts)) normalizes the old value `"zh"` and browser-style tags. Exceptions: `public/_locales/zh_CN` (directory name required by the extension spec) and the docs' `.zh.md` file names. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full steps to add a language.
- **Single source of truth for search engines**: [src/config/searchEngines.ts](src/config/searchEngines.ts) (`BUILTIN_ENGINES` + `buildSearchUrl`, with `%s` as the placeholder). `MainSearchBar` and `SettingPanel` both read from it, and custom engines live in the store's `customEngines`. Don't hardcode engines in components.
- **Official site data**: [src/data/sites.json](src/data/sites.json) is the single source of truth for listed sites (official addresses reviewed through PRs). `name` / `desc` / `url` can be a string or an object keyed by language tag, and an object must include `en` (`url` values copy the site's own language path, such as `/zh-cn/`; params templates can use the reserved `{url}` placeholder for the current language's home page), and `localize()` picks the current language. `altUrls` holds backup official addresses: Enter always opens the main site, and users choose a backup by hand only through `Alt+Enter` or the `备用` ("Backup") label, with no automatic detection. All parsing and matching logic is in [src/config/sites.ts](src/config/sites.ts). When changing field rules, also update [scripts/validate-sites.mjs](scripts/validate-sites.mjs) (the CI check) and both contributing guides.
- **Single access point for local storage**: `DBHelper` in [src/utils/dbHelper.ts](src/utils/dbHelper.ts) is the only module that accesses IndexedDB or localStorage. It only reads and writes by key and contains no business logic. `DBHelper.get/set/remove/keys/clear/namespace` use IndexedDB (async, large capacity, can store Blobs; falls back to localStorage when unavailable, where only JSON is supported), and `DBHelper.local.*` uses synchronous localStorage. Business code must not call `localStorage` or `indexedDB` directly, and Pinia persistence also goes through `DBHelper.local.storage`. The only exception is [public/theme-init.js](public/theme-init.js) (a plain script can't use import).
- **Preventing theme flash (FOUC)**: [public/theme-init.js](public/theme-init.js) is a synchronous external script in the `index.html` head that applies the theme before first paint. **It must be an external script**, because the MV3 extension CSP (`script-src 'self'`) blocks inline scripts. Runtime switching is handled by [src/composables/useTheme.ts](src/composables/useTheme.ts) (toggles the `html.dark` class), and the color values in both must match the CSS variables in [src/style.css](src/style.css).
- **Manifest for two browsers**: [public/manifest.json](public/manifest.json) is the single source of truth in its **full Firefox form**. [scripts/make-browser-dists.mjs](scripts/make-browser-dists.mjs) strips `chrome_settings_overrides` for Chrome (only supported on Windows/macOS; Linux refuses to load the whole extension) and `browser_specific_settings` (Firefox-only). `scripts/publish.sh` and CI share this script, so change manifest-related logic only there. `dist/` keeps the Firefox-only keys, so Chrome on Linux can't load it; to debug in Chrome, use the `dist-chrome/` generated by `scripts/publish.sh build`.
- **PR validation comments**: [validate-data.yml](.github/workflows/validate-data.yml) runs with a read-only token and saves its result as an artifact; [comment-validation.yml](.github/workflows/comment-validation.yml) posts it on the PR through `workflow_run`. The comment workflow can write to PRs, so it must never check out or run PR code, and it must treat the artifact as untrusted.
- **Quick navigation icons**: [src/config/brandIcons.ts](src/config/brandIcons.ts) (about 4.7MB, don't read the whole file) is lazy-loaded only by ShortcutEditor through dynamic `import()`; a static import would pull it into the main bundle. The chosen icon's path is stored inline in `shortcut.iconPath`, so rendering tiles doesn't depend on the icon library.

## Releases

**Version rule**: each version is a planned milestone of work (for example, one feature or one area of work), and tags follow major.minor.patch. GitHub Milestones aren't used.

Pushing a tag in the form `vX.Y.Z` triggers [.github/workflows/release.yml](.github/workflows/release.yml): write the version back to `manifest.json`/`package.json` and commit to main → build → generate the Chrome and Firefox zips → sign a Chrome `.crx` with the `CHROME_CRX_KEY` secret and wrap it in `-chrome-crx.zip` (a bare `.crx` link makes Chrome try to install it and fail with `CRX_REQUIRED_PROOF_MISSING`; users drag the unzipped `.crx` onto `chrome://extensions`; skipped if unset; the key must never change, or the extension ID changes) → create a GitHub Release. Locally, `scripts/publish.sh <patch|minor|major|X.Y.Z>` is the recommended way to run the whole flow.

CI checks out main rather than the tag, so a Release contains main's latest commit at that moment. `publish.sh` requires a clean working tree on the main branch and counts from the version in `package.json`. Requires Node ≥ 22.13.

## Style

- The project is in English: code comments, commits, script and CI messages, TODO.md, DESIGN.md and this file. Chinese is only for content: `src/locales/zh-Hans.json`, `public/_locales/zh_CN`, `zh-Hans` values in `sites.json`, `README.zh.md`, `CONTRIBUTING.zh.md`, and the second language in templates.
- Reuse [PixelSelect.vue](src/components/PixelSelect.vue) / [PixelToggle.vue](src/components/PixelToggle.vue) for UI components, always use the CSS variables in style.css for colors (`--bg-main`, `--text-main` and others), and use "Fusion Pixel" as the pixel font.
