#!/usr/bin/env bash
set -euo pipefail

# Duplicate a Gutenberg block folder inside one plugin (multi-block setup).
#
# Example:
#   ./scripts/dup_block.sh BeeOrbit
#   ./scripts/dup_block.sh BeeWobble --from bee-orbit
#
# Defaults:
#   source folder: src/beeorbit
#   from camel:    BeeOrbit
#   from title:    "Bee Orbit"

usage() {
  cat <<'EOF'
Usage:
  dup_block.sh <NewCamelName> [--from <source-slug>] [--from-camel <OldCamel>] [--from-title "<Old Title>"]

Examples:
  ./scripts/dup_block.sh BeeWobble --from bee-orbit
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

NEW_CAMEL="$1"
shift

FROM_SLUG="bee-orbit"
FROM_CAMEL="BeeOrbit"
FROM_TITLE="Bee Orbit"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)
      FROM_SLUG="${2:-}"
      shift 2
      ;;
    --from-camel)
      FROM_CAMEL="${2:-}"
      shift 2
      ;;
    --from-title)
      FROM_TITLE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      usage
      exit 1
      ;;
  esac
done

# Convert CamelCase -> kebab-case (BeeOrbit -> bee-orbit)
NEW_KEBAB="$(printf '%s' "$NEW_CAMEL" \
  | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' \
  | tr '[:upper:]' '[:lower:]')"

# Convert CamelCase -> "Spaced Title" (BeeOrbit -> "Bee Orbit")
NEW_TITLE="$(printf '%s' "$NEW_CAMEL" | sed -E 's/([a-z])([A-Z])/\1 \2/g')"

SRC_DIR="src/${FROM_SLUG}"
DST_DIR="src/${NEW_KEBAB}"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Source block folder not found: $SRC_DIR"
  exit 1
fi

if [[ -d "$DST_DIR" ]]; then
  echo "Destination already exists: $DST_DIR"
  exit 1
fi

mkdir -p "src"

# Copy folder (preserve structure)
cp -a "$SRC_DIR" "$DST_DIR"

# Now rewrite references inside the duplicated block files
# We do TARGETED replacements to avoid breaking plugin namespace/textdomain.
# - block name: beeseen/<from> -> beeseen/<new>
# - css class patterns: wp-block-beeseen-<from> -> wp-block-beeseen-<new>
# - optional other patterns: beeseen-<from> -> beeseen-<new>
# - display strings: BeeSeen -> BeeOrbit, "Bee Seen" -> "Bee Orbit"

FILES=()
while IFS= read -r -d '' f; do FILES+=("$f"); done < <(find "$DST_DIR" -type f -print0)

for f in "${FILES[@]}"; do
perl -0777 -pe "
  s@create-block/[a-z0-9-]+@beeseen/${NEW_KEBAB}@g;
  s@wp-block-create-block-[a-z0-9-]+@wp-block-beeseen-${NEW_KEBAB}@g;
  s@create-block-[a-z0-9-]+@beeseen-${NEW_KEBAB}@g;

  s@beeseen/${FROM_SLUG}\b@beeseen/${NEW_KEBAB}@g;
  s@wp-block-beeseen-${FROM_SLUG}\b@wp-block-beeseen-${NEW_KEBAB}@g;
  s@\bbeeseen-${FROM_SLUG}\b@beeseen-${NEW_KEBAB}@g;

  # NEW: replace bare slug occurrences like 'bee-orbit' in UI strings
  s@\b${FROM_SLUG}\b@${NEW_KEBAB}@g;

  s@\Q${FROM_CAMEL}\E@${NEW_CAMEL}@g;
  s@\Q${FROM_TITLE}\E@${NEW_TITLE}@g;
" -i "$f"



done

echo "✅ Created block:"
echo "   Source:      $SRC_DIR"
echo "   Destination: $DST_DIR"
echo "   New name:    beeseen/$NEW_KEBAB"
echo "   New title:   $NEW_TITLE"
