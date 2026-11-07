#!/usr/bin/env bash
#
# Islet release script: bump version -> build -> generate Chrome / Firefox zips -> commit + tag.
#
# Usage:
#   scripts/publish.sh patch          # 1.0.0 -> 1.0.1
#   scripts/publish.sh minor          # 1.0.0 -> 1.1.0
#   scripts/publish.sh major          # 1.0.0 -> 2.0.0
#   scripts/publish.sh 1.9.3          # Set a specific version
#   scripts/publish.sh build          # Keep the version, only build both zips for the current version (for local debugging)
#
# Output goes to release/:
#   islet-vX.Y.Z-chrome.zip    (Firefox-only keys removed, so Chrome loads it normally)
#   islet-vX.Y.Z-firefox.zip   (full manifest, with home page override and gecko id)
#
# At the end the script asks whether to push main and the tag to origin; pushing the tag triggers GitHub Actions
# to create a Release automatically (CI uses the same scripts/make-browser-dists.mjs to generate both zips).

set -euo pipefail
cd "$(dirname "$0")/.."

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

BUMP="${1:-}"
[[ -z "$BUMP" ]] && usage

# ---------- Build-only mode: leaves the version and git alone ----------
build_zips() {
  local version="$1"
  pnpm build
  node scripts/make-browser-dists.mjs
  mkdir -p release
  rm -f "release/islet-v${version}-chrome.zip" "release/islet-v${version}-firefox.zip"
  (cd dist-chrome && zip -qr "../release/islet-v${version}-chrome.zip" .)
  (cd dist-firefox && zip -qr "../release/islet-v${version}-firefox.zip" .)
  echo ""
  echo "Output:"
  echo "  release/islet-v${version}-chrome.zip"
  echo "  release/islet-v${version}-firefox.zip"
}

if [[ "$BUMP" == "build" ]]; then
  VERSION=$(node -p "require('./package.json').version")
  build_zips "$VERSION"
  exit 0
fi

# ---------- Pre-release checks ----------
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: the working tree has uncommitted changes. Commit or stash them first." >&2
  exit 1
fi

BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: the current branch is '$BRANCH', but releases must run on main." >&2
  exit 1
fi

# ---------- Compute the new version ----------
VERSION=$(node -e '
  const cur = require("./package.json").version;
  const arg = process.argv[1];
  let v;
  if (/^\d+\.\d+\.\d+$/.test(arg)) {
    v = arg;
  } else {
    const [ma, mi, pa] = cur.split(".").map(Number);
    if (arg === "major") v = `${ma + 1}.0.0`;
    else if (arg === "minor") v = `${ma}.${mi + 1}.0`;
    else if (arg === "patch") v = `${ma}.${mi}.${pa + 1}`;
    else { console.error(`Invalid argument: ${arg} (expected patch / minor / major / X.Y.Z / build)`); process.exit(1); }
  }
  console.log(v);
' "$BUMP")

if git rev-parse -q --verify "refs/tags/v${VERSION}" >/dev/null; then
  echo "Error: tag v${VERSION} already exists." >&2
  exit 1
fi

echo "Version: $(node -p "require('./package.json').version") -> ${VERSION}"

# ---------- Write the version (matches CI's write-back logic) ----------
node -e '
  const fs = require("fs");
  const version = process.argv[1];
  for (const file of ["public/manifest.json", "package.json"]) {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    json.version = version;
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  }
' "$VERSION"

# ---------- Build and package (roll back the version change on failure) ----------
if ! build_zips "$VERSION"; then
  git checkout -- public/manifest.json package.json
  echo "Error: build failed, version change rolled back." >&2
  exit 1
fi

# ---------- Commit + tag ----------
git add public/manifest.json package.json
git commit -m "chore: release v${VERSION}"
git tag "v${VERSION}"
echo ""
echo "Committed the version and created tag v${VERSION}."

# ---------- Push (triggers the GitHub Release) ----------
read -r -p "Push main and tag v${VERSION} to origin to trigger a GitHub Release? [y/N] " ans
if [[ "$ans" =~ ^[Yy]$ ]]; then
  git push origin main "v${VERSION}"
  echo "Pushed. GitHub Actions will create the Release automatically."
else
  echo "Not pushed. To push later, run: git push origin main v${VERSION}"
fi
