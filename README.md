# Islet - A Minimal Pixel Start Page

**English** | [简体中文](README.zh.md) · 📖 [Wiki](https://github.com/rivenhere/islet/wiki)

[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-latest-purple.svg)](https://vitejs.dev/)

**Islet** is a minimal, elegant new tab extension for your browser. It leaves out noisy feeds and complicated widgets, giving you a pure, focused starting point with an 8-bit retro look.

> Works with Chrome and Firefox (Manifest V3). Firefox takes over both the new tab page and the home page. Chrome takes over the new tab page only, because Chrome's home page override is limited to Windows/macOS and doesn't accept pages inside an extension.

---

## ✨ Features

- **Retro pixel look**: handcrafted UI components in a Neo-brutalist style, with the feel of a retro game console.
- **Immersive**: no distractions, just the time and fast navigation.
- **Multiple search engines**: a clean capsule search box that switches between Google, Bing, Baidu and others in one click. Type an address such as `github.com` and Enter opens it directly.
- **Official site shortcuts**: a built-in list of official URLs reviewed through PRs. Type `/github` to go straight there, `/gh?user=xx&repo=yy` for a specific page, or `tags:dev` to filter by category (`tags:tool|code` matches either category), so you can skip the pirated and phishing sites in search results. Missing a site? [Request it](https://github.com/rivenhere/islet/issues/new?template=site_request.yml), or send a PR by following the [contributing guide](CONTRIBUTING.md).
- **Keyboard friendly**: `Ctrl+K` focuses search, `Ctrl+Enter` flips how links open (current tab / new tab), `Shift+Enter` opens a new window, `Alt+Enter` chooses a backup official address, and `Ctrl+,` toggles settings.
- **Quick navigation**: custom tiles for your favorite sites below the search box, with built-in pixel icons or initials and optional theme colors. Fully local, with no network requests.
- **Daily quote (optional)**: when turned on, each new tab fetches a random quote. This is the only feature that uses the network (it requests hitokoto.cn), and it's **off by default**. You can turn it on in settings.
- **Smart dark mode**: follows your system theme, with correct colors from the first frame, no flash, and smooth transitions.
- **Multiple languages**: Simplified Chinese, English and Japanese.
- **Privacy first**: no data collection and no permissions. Runs 100% locally by default; the daily quote, the only feature that uses the network, must be turned on by hand.

---

## 🛠️ Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white" alt="Sass" />
  <img src="https://img.shields.io/badge/Pinia-FFD859?style=for-the-badge&logo=vue.js&logoColor=black" alt="Pinia" />
</p>

---

## 📦 Installation

Download the zip for your browser from [Releases](https://github.com/rivenhere/islet/releases), unzip it, then load it in your browser:

**Chrome / Edge** (download `islet-vX.Y.Z-chrome.zip`, works on every system)

1. Open `chrome://extensions` and turn on "Developer mode" in the top right.
2. Click "Load unpacked" and select the unzipped folder.

Keep the unzipped folder in place, because the browser loads the extension from it.

**Chrome / Edge, packed `.crx`** (download `islet-vX.Y.Z-chrome-crx.zip`, best on Linux)

1. Unzip it to get `islet-vX.Y.Z-chrome.crx`.
2. Open `chrome://extensions` and turn on "Developer mode".
3. Drag the `.crx` file onto that page.

The browser keeps its own copy, so you can delete the files afterwards. Don't open the `.crx` from a download link: Chrome then rejects it with `CRX_REQUIRED_PROOF_MISSING`, because it only installs downloaded `.crx` files from the Chrome Web Store. On Windows and macOS, Chrome may disable a `.crx` installed this way; use "Load unpacked" there.

**Firefox** (download `islet-vX.Y.Z-firefox.zip`)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and select `manifest.json` inside the folder.

> The two versions differ only in `manifest.json`. The Chrome version removes the Firefox-only `browser_specific_settings` and the Windows/macOS-only `chrome_settings_overrides` (home page override), because Chrome on Linux would otherwise refuse to load the extension.

Open a new tab after installing to see Islet.

---

## 🚀 Local Development

> Requires [Node.js](https://nodejs.org/) ≥ 22.13 and [pnpm](https://pnpm.io/).

1. **Clone the project**

    ```bash
    git clone https://github.com/rivenhere/islet.git
    cd islet
    ```

2. **Install dependencies**

    ```bash
    pnpm install
    ```

3. **Start the dev server**

    ```bash
    pnpm dev
    ```

4. **Build the extension**

    ```bash
    pnpm build
    ```

    The output goes to `dist/`, which Firefox can load directly as described in [Installation](#-installation). For Chrome, run `scripts/publish.sh build` instead and load the generated `dist-chrome/` folder (`dist/` keeps Firefox-only settings, which Chrome on Linux refuses to load).

---

## 🏷️ Releasing

The release script handles the version bump, both browser builds and the tag in one command:

```bash
scripts/publish.sh patch   # 1.0.0 -> 1.0.1
scripts/publish.sh minor   # 1.0.0 -> 1.1.0
scripts/publish.sh major   # 1.0.0 -> 2.0.0
scripts/publish.sh 1.9.3   # set a specific version
scripts/publish.sh build   # keep the version, only build both zips (for local debugging)
```

The script writes the version → builds → creates `islet-vX.Y.Z-chrome.zip` and `islet-vX.Y.Z-firefox.zip` in `release/` → commits and tags → asks whether to push. After the push, GitHub Actions builds the same two zips and creates a GitHub Release.

You can also push a tag by hand to trigger the release in CI:

```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## 🙏 Credits

All quick navigation icons are **built in, with no network requests**:

- Website and brand icons come from [simple-icons](https://github.com/simple-icons/simple-icons) (CC0-1.0), along with each brand's official color for the tile background. The icon library is a separate lazy-loaded chunk, so it doesn't slow down opening a new tab.
- Generic pixel icons and interface icons such as add, edit and delete come from [pixelarticons](https://github.com/halfmage/pixelarticons) (MIT License).
