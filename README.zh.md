# Islet - 极简像素起始页

[English](README.md) | **简体中文** · 📖 [使用文档](https://github.com/rivenhere/islet/wiki/首页)

[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-latest-purple.svg)](https://vitejs.dev/)

**Islet** 是一个极简、优雅的浏览器新标签页扩展。它摒弃了喧嚣的信息流与复杂的组件，旨在为你的浏览器提供一个纯粹、专注且充满 8-bit 复古美学的上网起点。

> 兼容 Chrome 与 Firefox（Manifest V3）。Firefox 下同时接管「新标签页」与「主页」；Chrome 下接管「新标签页」（Chrome 的主页接管仅限 Windows/macOS 且不支持扩展内页面，故 Chrome 版不含该功能）。

---

## ✨ 核心特性

- **复古像素美学**：纯手工打造的 UI 组件，采用“新粗野主义 (Neo-brutalism)”设计风格，带来独特的复古游戏机质感。
- **沉浸式体验**：没有多余的干扰，专注于时间感知与快速导航。
- **多引擎搜索**：优雅的胶囊搜索框，支持一键无缝切换 Google、Bing、百度等主流引擎。输入 `github.com` 这样的网址，按 Enter 直接打开。
- **官网直达**：内置经 PR 审核的官方网址库，输入 `/github` 直达、`/gh?user=xx&repo=yy` 直达子页面、`tags:dev` 按分类筛选（`tags:tool|code` 匹配任一分类），帮你绕开搜索结果里的盗版与钓鱼站。缺少官网？可以[申请收录](https://github.com/rivenhere/islet/issues/new?template=site_request.yml)，也欢迎按 [贡献指南](CONTRIBUTING.zh.md) 提交 PR。
- **键盘友好**：`Ctrl+K` 聚焦搜索、`Ctrl+Enter` 反转跳转方式（替换当前页 / 新标签页）、`Shift+Enter` 新窗口打开、`Alt+Enter` 选择备用官方地址、`Ctrl+,` 开关设置。
- **快捷导航**：搜索栏下方自定义常用网站磁贴，内置像素图标或首字母，可选主题色，纯本地零联网。
- **每日一言（可选）**：开启后每次新建标签页随机获取一句语录。这是唯一需要联网的功能（请求 hitokoto.cn），**默认关闭**，可在设置中开启。
- **智能深色模式**：随系统主题自动切换，首屏即正确着色、无闪屏，平滑的视觉过渡，全天候舒适阅读。
- **多语言**：内置简体中文、English、日本語。
- **隐私至上**：零数据收集、无需任何权限；默认 100% 本地运行，唯一联网的「一言」需手动开启。

---

## 🛠️ 技术栈

<p align="left">
  <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white" alt="Sass" />
  <img src="https://img.shields.io/badge/Pinia-FFD859?style=for-the-badge&logo=vue.js&logoColor=black" alt="Pinia" />
</p>

---

## 📦 安装使用

前往 [Releases](https://github.com/rivenhere/islet/releases) 下载对应浏览器的 zip 并解压，然后在浏览器中加载：

**Chrome / Edge**（下载 `islet-vX.Y.Z-chrome.zip`，所有系统通用）

1. 打开 `chrome://extensions`，开启右上角的「开发者模式」。
2. 点击「加载已解压的扩展程序」，选择解压后的文件夹。

请保留解压后的文件夹，浏览器会从该文件夹加载扩展。

**Chrome / Edge，打包好的 `.crx`**（下载 `islet-vX.Y.Z-chrome-crx.zip`，最适合 Linux）

1. 解压得到 `islet-vX.Y.Z-chrome.crx`。
2. 打开 `chrome://extensions`，开启「开发者模式」。
3. 把 `.crx` 文件拖到该页面上。

浏览器会保存自己的副本，之后可以删除这些文件。不要直接从下载链接打开 `.crx`：Chrome 只安装来自 Chrome 应用商店的下载 `.crx`，会报 `CRX_REQUIRED_PROOF_MISSING` 错误。在 Windows 和 macOS 上，这样安装的 `.crx` 可能会被 Chrome 停用，请改用「加载已解压的扩展程序」。

**Firefox**（下载 `islet-vX.Y.Z-firefox.zip`）

1. 打开 `about:debugging#/runtime/this-firefox`。
2. 点击「临时加载附加组件」，选择文件夹内的 `manifest.json`。

> 两个版本的差别仅在 `manifest.json`：Chrome 版移除了 Firefox 专属的 `browser_specific_settings` 与仅限 Windows/macOS 的 `chrome_settings_overrides`（主页接管），否则 Linux 上的 Chrome 会拒绝加载扩展。

安装后新建标签页即可看到 Islet。

---

## 🚀 本地开发

> 需要 [Node.js](https://nodejs.org/) ≥ 22.13 与 [pnpm](https://pnpm.io/)。

1. **克隆项目**

    ```bash
    git clone https://github.com/rivenhere/islet.git
    cd islet
    ```

2. **安装依赖**

    ```bash
    pnpm install
    ```

3. **启动开发服务器**

    ```bash
    pnpm dev
    ```

4. **构建扩展**

    ```bash
    pnpm build
    ```

    构建完成后，产物位于 `dist/` 目录，Firefox 可直接按上文「安装使用」加载。Chrome 请改为运行 `scripts/publish.sh build`，并加载生成的 `dist-chrome/` 目录（`dist/` 保留了 Firefox 专属配置，Linux 上的 Chrome 会拒绝加载）。

---

## 🏷️ 发布

推荐使用发布脚本，一条命令完成版本升级、双浏览器构建与打 tag：

```bash
scripts/publish.sh patch   # 1.0.0 -> 1.0.1
scripts/publish.sh minor   # 1.0.0 -> 1.1.0
scripts/publish.sh major   # 1.0.0 -> 2.0.0
scripts/publish.sh 1.9.3   # 指定版本号
scripts/publish.sh build   # 不改版本号，仅构建双浏览器 zip（本地调试用）
```

脚本会：写入版本号 → 构建 → 在 `release/` 下生成 `islet-vX.Y.Z-chrome.zip` 与 `islet-vX.Y.Z-firefox.zip` → 提交并打 tag → 询问是否推送。推送后 GitHub Actions 会自动构建同样的双版本 zip 并创建 GitHub Release。

也可以直接手动推 tag 触发 CI 发布：

```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## 🙏 致谢

快捷导航图标全部**本地内置、零联网请求**：

- 网站 / 品牌图标取自 [simple-icons](https://github.com/simple-icons/simple-icons)（CC0-1.0），并附带各品牌官方色作为磁贴底色；图标库以懒加载独立分包提供，不影响新标签页启动。
- 通用像素图标与新增 / 编辑 / 删除等界面图标取自 [pixelarticons](https://github.com/halfmage/pixelarticons)（MIT License）。
