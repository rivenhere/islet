# 贡献指南

[English](CONTRIBUTING.md) | **简体中文**

## 贡献官网直达站点

Islet 的「官网直达」只收录**经 PR 审核的官方网址**，用来帮用户绕开搜索结果里的盗版、捆绑下载与钓鱼站。
不会写代码也没关系——只需要改一个 JSON 文件。

不想提交 PR 也没关系：可以[申请收录网站](https://github.com/rivenhere/islet/issues/new?template=site_request.yml)；已收录的网站更换了域名或无法访问时，可以[反馈网站问题](https://github.com/rivenhere/islet/issues/new?template=site_problem.yml)。

### 步骤

1. Fork 本仓库，打开 [`src/data/sites.json`](src/data/sites.json)（GitHub 网页上点铅笔图标即可编辑）。
2. 按下面的模板加一段站点数据（注意上一段末尾的逗号）。
3. 提交 PR，**在 PR 地址末尾加上 `?template=data.md`** 使用数据模板，并附上「为什么这是官网」的证明。
4. CI 会自动运行 `node scripts/validate-sites.mjs` 校验格式，如有错误会以评论形式发到你的 PR 上，维护者审核后合并，随下个版本发布。

### 模板逐项说明

```json
"github": {                                   ← key：主标识，输入 /github 直达；全局唯一、忽略大小写
  "name": "GitHub",                           ← 站点名称（必填）；各语言相同时写字符串即可
  "url": "https://github.com",                ← 官方主页（必填，必须 https://）
  "altUrls": ["https://github.example"],      ← 备用官方地址（可选，极少需要），规则见下文
  "aliases": ["gh"],                          ← 别名（可选）：/gh 同样直达
  "desc": {                                   ← 一句话描述（可选），显示在下拉列表；按语言分别填写
    "zh-Hans": "代码托管与开源协作平台",
    "en": "Code hosting and open-source collaboration platform",
    "ja": "コードホスティングとオープンソース協業プラットフォーム"
  },
  "tags": ["code", "dev"],                    ← 分类标签（可选），支持 tags:dev 过滤
  "params": [                                 ← 路由参数（可选，不需要就整段省略）
    { "param": ["user", "repo"], "template": "{url}/{user}/{repo}" },
    { "param": ["user"],         "template": "{url}/{user}" }
  ]
}
```

> 上面的 `←` 注释仅为说明，JSON 中不能写注释。

### 多语言（name / desc / url）

`name`、`desc`、`url` 都可以写成两种形式：

- **字符串**：所有语言显示同一段文字，如 `"name": "GitHub"`。
- **多语言对象**：键为语言标签，如 `"name": { "zh-Hans": "哔哩哔哩", "en": "Bilibili", "ja": "bilibili" }`。**必须包含 `en`**（CI 会检查）。

语言标签遵循 [BCP 47](https://www.rfc-editor.org/info/bcp47)，必须与 [`src/locales/`](src/locales/) 下的文案文件名一致，目前可用：

| 标签 | 语言 |
| --- | --- |
| `zh-Hans` | 简体中文 |
| `en` | English |
| `ja` | 日本語 |

- 中文用**文字**子标签区分简繁：`zh-Hans`（简体）/ `zh-Hant`（繁体），**不要**写 `zh`、`zh-CN`、`zh_CN`、`zh-TW`。
- 其他语言只写语言子标签：`en` 而非 `en-US`。
- 其他不会的语言可以不填，界面会按「当前语言 → 同语种 → `en`」依次回退。
- 名称、描述的所有语言版本都参与搜索匹配，所以用中文或英文都能搜到。

#### 按语言区分的网址

很多网站把语言写在地址里，而且写法各不相同：微软用 `/zh-cn/`、`/en-us/`，Mozilla 用 `/zh-CN/`、`/en-US/`，还有的网站不带语言代码的地址就是英文版。
**键**仍用上表中本项目的语言标签，**值**照抄网站自己的真实地址即可：

```json
"url": {
  "zh-Hans": "https://www.microsoft.com/zh-cn/",
  "en": "https://www.microsoft.com/en-us/",
  "ja": "https://www.microsoft.com/ja-jp/"
}
```

- 不带语言代码就是英文版的网站，`en` 直接填根地址（如 `"en": "https://example.com/"`）。
- 网站会按浏览器语言自动跳转的，写成一个字符串即可，不必拆分。
- 每个值都必须是 `https://` 地址，这里同样必须包含 `en`；缺少的语言按上面的规则回退。

### params 规则

- `/gh?user=torvalds&repo=linux` → 命中第一条 → `https://github.com/torvalds/linux`
- 参数顺序无关；某个参数为空（`?user=`）视为缺失。
- 从上到下**首条全部参数齐全的条目**生效，所以更具体的条目放前面。
- 没用到的参数会原样追加：`/gh?user=a&repo=b&tab=x` → `https://github.com/a/b?tab=x`。
- 一条都不命中时跳主页。
- 模板参数名不要与目标站自身的查询参数重名。
- **`{url}` 是保留占位**，代表当前语言的主页（即 `url` 字段，去掉末尾斜杠），只能写在模板开头，也不能用作参数名。
  主页按语言分路径时，子页面会自动跟随语言，例如 MDN：

  ```json
  "url": {
    "zh-Hans": "https://developer.mozilla.org/zh-CN/",
    "en": "https://developer.mozilla.org/en-US/"
  },
  "params": [{ "param": ["q"], "template": "{url}/search?q={q}" }]
  ```

  中文界面 `/mdn?q=fetch` → `https://developer.mozilla.org/zh-CN/search?q=fetch`，英文界面 → `.../en-US/search?q=fetch`。
- 子页面不在主页之下（如 `https://search.bilibili.com/...`）时，照常写完整的 `https://` 地址。

### 备用官方地址（altUrls）

同一公司有多个官方域名，且主站不可用时用户仍需要访问另一个域名时使用。回车始终打开主站；用户按 `Alt+Enter` 或点击条目上的「备用」，才会看到备用地址并手动选择，不会自动切换。

- 只收录**公司自己运营、且不依赖主站也能独立访问**的域名；只是跳转到主站的域名不要填。
- 公司更换域名时，把 `url` 改为新域名，旧域名不要写入 `altUrls`，即使它还会保留一段时间。
- 每个站点最多 3 个，必须是 `https://`，域名不能与任何站点的主站或备用域名重复（CI 会检查）；每个地址都可以写成多语言对象，同样必须包含 `en`。
- `aliases` 只用于输入的简称，不要把域名写进去。
- PR 中要为**每个**备用地址附上官方证明：它和主站地址受到同样严格的审核。域名失效后应提 PR 删除，以免被他人抢注后用于钓鱼。
- params 模板以 `{url}` 开头时会自动套用备用地址；写死完整地址的模板无法套用，备用地址会跳到其主页。

### 收录标准

- ✅ 软件 / 服务的官方站点（以官方仓库、维基百科、官方社交账号等可核实来源为准）。
- ❌ 第三方镜像站、下载站、汉化站、聚合站、短链接、带推广参数的地址。
- ❌ NSFW 站点：成人、色情内容，或以此类内容著称的社区。站点列表会在每个人输入时出现，必须在公司或学校打开也不尴尬。

## 贡献界面翻译

界面文案在 [`src/locales/<语言标签>.json`](src/locales/)（vue-i18n）。新增一种语言：

1. 复制 `en.json` 为新文件，文件名用上面的 BCP 47 规则（如繁体中文为 `zh-Hant.json`），逐条翻译值、保留键名。
2. 在 [`src/i18n.ts`](src/i18n.ts) 的 `SUPPORTED_LOCALES` 与 `messages`、[`src/types/language.d.ts`](src/types/language.d.ts) 中登记，并在设置面板的语言选项里加上它。
3. 可顺带为 `sites.json` 中的 `desc` 补上该语言（CI 会自动认出新文件名为合法标签）。

## 代码贡献

PR 地址末尾加 `?template=code.md`。提交前运行 `pnpm build`（含类型检查），代码注释与 commit 使用英文 conventional 风格。
