#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/build-plugins.sh all [--commit] [--docker]
  scripts/build-plugins.sh <plugin> [--commit] [--docker]

Examples:
  scripts/build-plugins.sh pomolobee
  scripts/build-plugins.sh competence --commit
  scripts/build-plugins.sh all --docker

Behavior:
  • Detects if a plugin's sources changed (hash) and skips if not
  • Runs "npm run build" inside the plugin
  • Writes .last_build_hash on success
  • With --commit, commits only if artifacts changed
  • With --docker, uses node:20-bullseye to run npm (no host Node needed)
EOF
}

[[ $# -lt 1 ]] && { usage; exit 1; }

TARGET="$1"; shift || true
COMMIT=0
DOCKER=0
for arg in "$@"; do
  case "$arg" in
    --commit) COMMIT=1 ;;
    --docker) DOCKER=1 ;;
    *) echo "Unknown flag: $arg"; usage; exit 1 ;;
  esac
done

ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRCROOT="$ROOT/wordpress/plugin-src"

RED='\033[31m'
YELLOW='\033[33m'
NC='\033[0m'

# Stable build metadata for the whole run (prevents cascading differences)
BUILD_COMMIT="$(git -C "$ROOT" rev-parse --short HEAD)"
BUILD_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export BUILD_COMMIT BUILD_STAMP

# Optional: drive plugin version from repo VERSION file (recommended)
if [[ -f "$ROOT/VERSION" ]]; then
  # Add "v" prefix only if that's how you want your plugin headers/block.json to look.
  export PLUGIN_VERSION="v$(cat "$ROOT/VERSION")"
fi

list_plugins() {
  find "$SRCROOT" -mindepth 1 -maxdepth 1 -type d \
    -exec test -f "{}/package.json" \; -print \
  | xargs -I{} basename "{}" \
  | sort
}

if [[ "$TARGET" == "all" ]]; then
  mapfile -t PLUGINS < <(list_plugins)
else
  if [[ -d "$SRCROOT/$TARGET" && -f "$SRCROOT/$TARGET/package.json" ]]; then
    PLUGINS=("$TARGET")
  else
    echo "✗ Unknown plugin: $TARGET"
    echo "Available:"
    list_plugins | sed 's/^/  - /'
    exit 1
  fi
fi

is_build_ready() {
  local plugin="$1"
  local dir="$SRCROOT/$plugin"

  # Docker mode: host node_modules doesn't matter
  if [[ $DOCKER -eq 1 ]]; then
    return 0
  fi

  # Host mode: require wp-scripts binary (i.e. deps installed)
  [[ -x "$dir/node_modules/.bin/wp-scripts" ]]
}

warn_skip() {
  local plugin="$1"
  local msg="$2"
  echo -e "  ${RED}• ${msg} — skipping ${plugin}${NC}"
}

calc_src_hash() {
  local plugin="$1"
  (
    cd "$SRCROOT/$plugin"
    { find . -type f \
        -not -path "./build/*" \
        -not -path "./dist/*" \
        -not -path "./node_modules/*" \
        -not -path "./.git/*" \
        -not -name ".last_build_hash" \
        -not -path "./src/version.ts" \
        -not -path "./build/version.php" \
        -print0; \
    } | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}'
  )
}


npm_build() {
  local plugin="$1"
  local dir="$SRCROOT/$plugin"

  if [[ $DOCKER -eq 1 ]]; then
    docker run --rm \
      -v "$dir":/app -w /app \
      "${BEELAB_NODE_IMAGE:-node:20-bullseye}" \
      bash -lc 'set -euo pipefail; npm ci || npm install; npm run build'
  else
    ( cd "$dir" && npm run build )
  fi
}

maybe_git_commit() {
  local plugin="$1"
  local msg="chore(${plugin}): build artifacts"
  local paths=(
    "wordpress/plugin-src/${plugin}/${plugin}.php"
    "wordpress/plugin-src/${plugin}/build"
    "wordpress/plugin-src/${plugin}/dist"
    "wordpress/build/${plugin}.zip"
  )
  local addlist=()
  for p in "${paths[@]}"; do
    [[ -e "$ROOT/$p" ]] && addlist+=("$p")
  done

  ( cd "$ROOT"
    [[ ${#addlist[@]} -gt 0 ]] && git add "${addlist[@]}" || true
    if git diff --cached --quiet; then
      echo "  • git: nothing to commit for ${plugin}"
    else
      git commit -m "$msg" || true
      echo "  ✓ git: committed ${plugin}"
    fi
  )
}

for plugin in "${PLUGINS[@]}"; do
  echo "→ ${plugin}"
  SRC="$SRCROOT/$plugin"
  HASHFILE="$SRC/.last_build_hash"

  if ! is_build_ready "$plugin"; then
    warn_skip "$plugin" "not build-ready (missing node_modules/.bin/wp-scripts). Run: (cd wordpress/plugin-src/$plugin && npm install)"
    continue
  fi


  echo "  • hashfile=$HASHFILE"

  NEW_HASH="$(calc_src_hash "$plugin")"
  OLD_HASH="$(cat "$HASHFILE" 2>/dev/null || true)"

  if [[ "$NEW_HASH" == "$OLD_HASH" ]]; then
    echo "  • no source changes detected — skipping build/zip/install"
    continue
  fi

  echo "  • changes detected — npm run build (zip + install)"
  npm_build "$plugin"

  echo "$NEW_HASH" > "$HASHFILE"
  echo "  ✓ build complete"

  if [[ $COMMIT -eq 1 ]]; then
    maybe_git_commit "$plugin"
  fi
done

echo "Done."
