# Contributing

**English** | [简体中文](CONTRIBUTING.zh.md)

## Contributing official sites

Islet's official site shortcuts only list **official URLs reviewed through PRs**, to help people avoid the pirated, bundled-download and phishing sites in search results.
You don't need to know how to code: you only have to edit one JSON file.

Don't want to open a PR? That's fine: [request a site](https://github.com/rivenhere/islet/issues/new?template=site_request.yml), or [report a problem](https://github.com/rivenhere/islet/issues/new?template=site_problem.yml) if a listed site changed its domain or doesn't work.

### Steps

1. Fork this repo and open [`src/data/sites.json`](src/data/sites.json) (on GitHub, click the pencil icon to edit it).
2. Add an entry using the template below (remember the comma after the previous entry).
3. Open a PR, **adding `?template=data.md` to the end of the PR URL** to use the data template, and include proof of why this is the official site.
4. CI runs `node scripts/validate-sites.mjs` to check the format, and if it finds errors it posts them as a comment on your PR. Once a maintainer reviews and merges it, the site ships in the next version.

### Template, field by field

```json
"github": {                                   ← key: main identifier, type /github to go there; globally unique, case-insensitive
  "name": "GitHub",                           ← site name (required); use a plain string if it's the same in every language
  "url": "https://github.com",                ← official home page (required, must be https://)
  "altUrls": ["https://github.example"],      ← backup official addresses (optional, rarely needed), see the rules below
  "aliases": ["gh"],                          ← aliases (optional): /gh goes there too
  "desc": {                                   ← one-line description (optional), shown in the dropdown; written per language
    "zh-Hans": "代码托管与开源协作平台",
    "en": "Code hosting and open-source collaboration platform",
    "ja": "コードホスティングとオープンソース協業プラットフォーム"
  },
  "tags": ["code", "dev"],                    ← category tags (optional), used by tags:dev filtering
  "params": [                                 ← route parameters (optional, leave out the whole block if not needed)
    { "param": ["user", "repo"], "template": "{url}/{user}/{repo}" },
    { "param": ["user"],         "template": "{url}/{user}" }
  ]
}
```

> The `←` notes above are only explanations. JSON can't contain comments.

### Multiple languages (name / desc / url)

`name`, `desc` and `url` can each be written in two forms:

- **String**: every language shows the same text, such as `"name": "GitHub"`.
- **Language object**: the keys are language tags, such as `"name": { "zh-Hans": "哔哩哔哩", "en": "Bilibili", "ja": "bilibili" }`. **It must include `en`** (CI checks this).

Language tags follow [BCP 47](https://www.rfc-editor.org/info/bcp47) and must match the file names in [`src/locales/`](src/locales/). Currently available:

| Tag | Language |
| --- | --- |
| `zh-Hans` | Simplified Chinese |
| `en` | English |
| `ja` | Japanese |

- Chinese uses **script** subtags to separate Simplified and Traditional: `zh-Hans` (Simplified) / `zh-Hant` (Traditional). **Don't** write `zh`, `zh-CN`, `zh_CN` or `zh-TW`.
- Other languages use only the language subtag: `en`, not `en-US`.
- You can leave out any other language you don't know. The interface falls back in this order: current language → same language family → `en`.
- All language versions of names and descriptions are searchable, so a site can be found in either Chinese or English.

#### URLs that differ by language

Many sites put the language in the address, and they all write it differently: Microsoft uses `/zh-cn/` and `/en-us/`, Mozilla uses `/zh-CN/` and `/en-US/`, and on some sites the address without a language code is the English version.
The **keys** still use this project's language tags from the table above. The **values** are the site's real addresses, copied exactly:

```json
"url": {
  "zh-Hans": "https://www.microsoft.com/zh-cn/",
  "en": "https://www.microsoft.com/en-us/",
  "ja": "https://www.microsoft.com/ja-jp/"
}
```

- If the address without a language code is the English version, use the root address for `en` (such as `"en": "https://example.com/"`).
- If a site redirects by browser language on its own, write a single string. There's no need to split it.
- Every value must be an `https://` address, and `en` is required here too. Missing languages fall back using the order above.

### params rules

- `/gh?user=torvalds&repo=linux` → matches the first entry → `https://github.com/torvalds/linux`
- Parameter order doesn't matter. An empty parameter (`?user=`) counts as missing.
- **The first entry from the top with all its parameters present** wins, so put more specific entries first.
- Unused parameters are appended as they are: `/gh?user=a&repo=b&tab=x` → `https://github.com/a/b?tab=x`.
- If no entry matches, the home page opens.
- Don't name a template parameter the same as one of the target site's own query parameters.
- **`{url}` is a reserved placeholder** for the home page in the current language (the `url` field without its trailing slash). It can only appear at the start of a template and can't be used as a parameter name.
  When a home page differs by language, subpages follow the language automatically. For example, MDN:

  ```json
  "url": {
    "zh-Hans": "https://developer.mozilla.org/zh-CN/",
    "en": "https://developer.mozilla.org/en-US/"
  },
  "params": [{ "param": ["q"], "template": "{url}/search?q={q}" }]
  ```

  In the Chinese interface, `/mdn?q=fetch` → `https://developer.mozilla.org/zh-CN/search?q=fetch`. In the English interface → `.../en-US/search?q=fetch`.
- If a subpage isn't under the home page (such as `https://search.bilibili.com/...`), write the full `https://` address as usual.

### Backup official addresses (altUrls)

Use this when one company has several official domains and people still need another domain when the main site is unavailable. Enter always opens the main site. Backup addresses only appear when the user presses `Alt+Enter` or clicks the "Backup" label on the entry, and the user picks one by hand. Islet never switches automatically.

- Only list domains that are **run by the company itself and work independently of the main site**. Don't list domains that only redirect to the main site.
- When a company changes domains, change `url` to the new domain. Don't add the old domain to `altUrls`, even if it stays up for a while.
- Each site can have at most 3. They must use `https://`, and a domain can't repeat any site's main or backup domain (CI checks this). Each address can also be a language object, which must include `en`.
- `aliases` are only for short names people type. Don't put domains there.
- The PR must include official proof for **each** backup address, because they're reviewed as strictly as the main address. When a domain stops being used, send a PR to remove it, so nobody can register it later for phishing.
- Params templates starting with `{url}` automatically use the backup address. Templates with a fixed full address can't, so the backup address opens its own home page instead.

### Inclusion criteria

- ✅ Official sites of software or services (verified by sources such as official repositories, Wikipedia or official social accounts).
- ❌ Third-party mirrors, download sites, localization sites and aggregators, short links, and addresses with referral parameters.
- ❌ NSFW sites: adult or pornographic content, or communities known for it. The list shows up for everyone as they type, so it has to be safe to see at work or school.

## Contributing interface translations

Interface text lives in [`src/locales/<language-tag>.json`](src/locales/) (vue-i18n). To add a language:

1. Copy `en.json` to a new file named using the BCP 47 rules above (for example, `zh-Hant.json` for Traditional Chinese). Translate each value and keep the key names.
2. Register it in `SUPPORTED_LOCALES` and `messages` in [`src/i18n.ts`](src/i18n.ts) and in [`src/types/language.d.ts`](src/types/language.d.ts), then add it to the language options in the settings panel.
3. You can also add that language to `desc` in `sites.json` (CI automatically accepts the new file name as a valid tag).

## Contributing code

Add `?template=code.md` to the end of the PR URL. Before submitting, run `pnpm build` (it includes type checking). Code comments and commit messages are written in English, in conventional commit style.
