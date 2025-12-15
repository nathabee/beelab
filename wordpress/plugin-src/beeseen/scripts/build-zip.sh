#!/usr/bin/env bash
#build-zip.sh
set -euo pipefail

PLUGIN_SLUG="beeseen"
PLUGIN_MAIN="${PLUGIN_SLUG}.php"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_ROOT="${ROOT_DIR}/dist"
DIST_DIR="${DIST_ROOT}/${PLUGIN_SLUG}"
ZIP_PATH="${DIST_ROOT}/${PLUGIN_SLUG}.zip"

# Where you want the finished zip to go (relative to plugin root)
TARGET_DIR="${ROOT_DIR}/../../build"
TARGET_ZIP="${TARGET_DIR}/${PLUGIN_SLUG}.zip"

echo "🧹 Cleaning dist..."
rm -rf "${DIST_ROOT}"
mkdir -p "${DIST_DIR}"

echo "📦 Building ZIP payload..."
# Required files
cp "${ROOT_DIR}/${PLUGIN_MAIN}" "${DIST_DIR}/"

# Optional files
[[ -f "${ROOT_DIR}/readme.txt" ]] && cp "${ROOT_DIR}/readme.txt" "${DIST_DIR}/"

# Build output (required for blocks)
if [[ ! -d "${ROOT_DIR}/build" ]]; then
  echo "❌ Missing build/ folder. Run: npm run buildpack (or npm run build) first."
  exit 1
fi
cp -r "${ROOT_DIR}/build" "${DIST_DIR}/build"

# Optional folders you might add later
for opt in languages assets includes; do
  if [[ -d "${ROOT_DIR}/${opt}" ]]; then
    cp -r "${ROOT_DIR}/${opt}" "${DIST_DIR}/${opt}"
  fi
done

echo "🗜️ Creating ZIP..."
(
  cd "${DIST_ROOT}"
  zip -qr "${ZIP_PATH}" "${PLUGIN_SLUG}"
)

echo "🚚 Dispatching ZIP to ${TARGET_DIR}..."
mkdir -p "${TARGET_DIR}"
mv -f "${ZIP_PATH}" "${TARGET_ZIP}"

echo "✅ Done: ${TARGET_ZIP}"
