/**
 * Generates the Chrome and Firefox build folders (dist-chrome/ and dist-firefox/) from dist/.
 *
 * public/manifest.json is the single source of truth in its full Firefox form, and this script trims it for Chrome:
 *
 * - chrome_settings_overrides (home page override): Chrome only supports this key on Windows / macOS,
 *   and Linux refuses to load the whole extension ("not allowed for specified platform");
 *   Chrome also requires homepage to be a full URL, not a path inside the extension. So the Chrome version removes it,
 *   and Chrome only takes over the new tab page.
 * - browser_specific_settings: a Firefox-only key (gecko id and so on), which Chrome doesn't recognize and warns about.
 *
 * scripts/publish.sh and GitHub Actions share this script, so the trimming logic can't drift apart.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

if (!fs.existsSync(path.join(dist, "manifest.json"))) {
  console.error("dist/manifest.json not found, run pnpm build first");
  process.exit(1);
}

/** Copy dist to the target folder, and adjust its manifest.json with transform */
const make = (name, transform) => {
  const target = path.join(root, name);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(dist, target, { recursive: true });

  const manifestPath = path.join(target, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  transform(manifest);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Generated ${name}/`);
};

make("dist-chrome", (m) => {
  delete m.chrome_settings_overrides;
  delete m.browser_specific_settings;
});

// Firefox: the manifest is already in its full form
make("dist-firefox", () => {});
