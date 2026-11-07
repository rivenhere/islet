## Data contribution / 数据贡献

<!-- See "Contributing official sites" in CONTRIBUTING.md / 指南见 CONTRIBUTING.zh.md「贡献官网直达站点」 -->

**Type / 类型**

- [ ] New site / 新增站点
- [ ] Update site / 修改站点
- [ ] Remove site / 删除站点

**Snippet / JSON 片段**

```json

```

**Proof the URL is official / 官方性证明**

<!-- e.g. the official GitHub repo, a Wikipedia entry, or an official social account linking to this domain
     如：官方 GitHub 仓库、维基百科条目、官方社交账号指向该域名的链接 -->

**Checklist**

- [ ] `node scripts/validate-sites.mjs` passes locally (valid JSON) / 本地运行 `node scripts/validate-sites.mjs` 通过（JSON 合法）
- [ ] The key and aliases don't conflict with existing sites / key 与 aliases 不与已有站点冲突
- [ ] `url` is the official address, starts with `https://` and is reachable / `url` 是官方地址，以 `https://` 开头且可访问
- [ ] Not a pirated site, third-party mirror, download site or aggregator / 不是盗版、第三方镜像、下载站或聚合站
- [ ] Not an NSFW site (adult or pornographic content) / 不是 NSFW 站点（成人、色情内容）
- [ ] If there are `params`, every template was tested by hand / 如有 `params`，每个模板都已手动测试
- [ ] If there are `altUrls`, each is officially run, works independently, and has proof attached / 如有 `altUrls`，每个地址都由官方运营、可独立访问，并已附上证明
