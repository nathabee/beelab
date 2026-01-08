#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT_DIR/VERSION"
BUILD_DIR="$ROOT_DIR/wordpress/build"
TAG_PREFIX="v"

print_help() {
  cat <<'EOF'
publish-release-zips.sh

Publish WordPress ZIP artifacts from wordpress/build to a GitHub Release based on the repo root VERSION file.

Usage:
  ./scripts/publish-release-zips.sh
  ./scripts/publish-release-zips.sh --help
  ./scripts/publish-release-zips.sh -h

Algorithm:
  1) Reads VERSION (e.g. 2.0.1) from ./VERSION
  2) Scans wordpress/build/*.zip
  3) For each name.zip (no version), renames to name-2.0.1.zip (old zip is removed)
  4) Uploads only *-2.0.1.zip to GitHub Release v2.0.1
  5) Ignores *-2.0.0.zip etc. (any zip already versioned for a different version)

Rules / Notes:
  - The working tree must be clean (commit or stash first).
  - The script does not build zips; it only renames + uploads.
  - Requires: git, gh (GitHub CLI), and gh must be authenticated (gh auth login).
  - Re-running on the same version overwrites assets (gh --clobber).

Examples:
  # Publish whatever is in wordpress/build for the current VERSION
  ./scripts/publish-release-zips.sh

EOF
}

die() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"; }

# --- args ---
case "${1:-}" in
  -h|--help) print_help; exit 0 ;;
  "") ;;
  *) die "Unknown argument: $1 (use --help)" ;;
esac

need git
need gh

[[ -f "$VERSION_FILE" ]] || die "Missing VERSION file at: $VERSION_FILE"
VERSION="$(tr -d ' \t\r\n' < "$VERSION_FILE")"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)?$ ]] || die "VERSION looks invalid: '$VERSION'"

TAG="${TAG_PREFIX}${VERSION}"

[[ -d "$BUILD_DIR" ]] || die "Missing build dir: $BUILD_DIR"
ls -1 "$BUILD_DIR"/*.zip >/dev/null 2>&1 || die "No .zip files found in: $BUILD_DIR"

# Safety: release should match a committed state
[[ -z "$(git status --porcelain)" ]] || die "Working tree not clean. Commit/stash first."

# Ensure gh auth works
gh auth status >/dev/null 2>&1 || die "gh not authenticated. Run: gh auth login"

SHA="$(git rev-parse --short HEAD)"

echo "Version  : $VERSION"
echo "Tag      : $TAG"
echo "Commit   : $SHA"
echo "BuildDir : $BUILD_DIR"
echo

echo "== Step 1: Normalize ZIP names (add -$VERSION when missing) =="

shopt -s nullglob
for f in "$BUILD_DIR"/*.zip; do
  base="$(basename "$f")"

  # already versioned for THIS version -> keep
  if [[ "$base" == *"-${VERSION}.zip" ]]; then
    continue
  fi

  # versioned for SOME other version -> ignore (do NOT rename)
  if [[ "$base" =~ -[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)?\.zip$ ]]; then
    echo "Skip (other version): $base"
    continue
  fi

  # unversioned -> rename to include current version
  name="${base%.zip}"
  new="${name}-${VERSION}.zip"

  echo "Rename: $base -> $new"
  mv -f "$f" "$BUILD_DIR/$new"
done
shopt -u nullglob

echo
echo "== Step 2: Select assets for THIS release only =="

ASSETS=( "$BUILD_DIR"/*-"$VERSION".zip )
(( ${#ASSETS[@]} > 0 )) || die "No assets found for version $VERSION (expected *-${VERSION}.zip)"

echo "Assets to upload:"
for a in "${ASSETS[@]}"; do
  echo " - $(basename "$a")"
done

echo
echo "== Step 3: Ensure tag on origin and points to HEAD =="

HEAD_SHA="$(git rev-parse HEAD)"
HEAD_SHORT="$(git rev-parse --short HEAD)"

# Does a GitHub release already exist for this tag?
RELEASE_EXISTS="no"
if gh release view "$TAG" >/dev/null 2>&1; then
  RELEASE_EXISTS="yes"
fi

# Helper: create or move local tag to HEAD
ensure_local_tag_at_head() {
  if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Creating local tag: $TAG -> $HEAD_SHORT"
    git tag -a "$TAG" -m "Release $TAG ($HEAD_SHORT)" HEAD
    return
  fi

  TAG_SHA="$(git rev-parse "$TAG^{commit}")"
  if [[ "$TAG_SHA" != "$HEAD_SHA" ]]; then
    echo "Local tag $TAG points to $(git rev-parse --short "$TAG_SHA"), expected $HEAD_SHORT"
    if [[ "$RELEASE_EXISTS" == "yes" ]]; then
      die "Refusing to retag: GitHub Release already exists for $TAG. Bump VERSION if you need a new release."
    fi
    echo "Moving local tag: $TAG -> $HEAD_SHORT"
    git tag -f -a "$TAG" -m "Release $TAG ($HEAD_SHORT)" HEAD
  else
    echo "Local tag already points to HEAD: $TAG"
  fi
}

# Helper: push tag to origin (safe force only when release doesn't exist)
push_tag_to_origin() {
  if [[ "$RELEASE_EXISTS" == "yes" ]]; then
    # no rewriting published releases; just ensure it's on origin
    echo "Pushing tag to origin (no force): $TAG"
    git push origin "$TAG"
  else
    echo "Pushing tag to origin (force-with-lease allowed): $TAG"
    git push origin "$TAG" --force-with-lease
  fi
}

ensure_local_tag_at_head
push_tag_to_origin

echo
echo "== Step 4: Create release (if missing) =="

NOTES=$'WordPress ZIP artifacts for this version.\n\n'"- Version: ${VERSION}"$'\n'"- Tag: ${TAG}"$'\n'"- Commit: ${SHA}"$'\n\nAssets:\n'
for a in "${ASSETS[@]}"; do
  NOTES+="- $(basename "$a")"$'\n'
done

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "Release already exists: $TAG"
else
  gh release create "$TAG" --title "$TAG" --notes "$NOTES"
  echo "Created release: $TAG"
fi

echo
echo "== Step 5: Upload ONLY selected assets (overwrite if rerun) =="
gh release upload "$TAG" "${ASSETS[@]}" --clobber

echo
echo "Done: uploaded ${#ASSETS[@]} ZIP(s) to release $TAG."
