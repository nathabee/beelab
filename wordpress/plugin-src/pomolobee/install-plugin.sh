#!/usr/bin/env bash
set -euo pipefail

arg="${1-}"
case "$arg" in
  h|help|-h|--help)
    echo "Usage: $0 [help]"
    echo
    echo "Two-stage sync:"
    echo "  1) Copy build artifacts to a staging dir as \$USER."
    echo "  2) Make staging dir/files readable."
    echo "  3) Rsync staging -> wp-content/plugins as www-data."
    exit 0
    ;;
  *) echo "Two-stage sync (run with 'help' to see details)";;
esac

PLUGIN_NAME="pomolobee"
BUILD_PLUGIN="dist/$PLUGIN_NAME"
WORDPRESS_PLUGIN_DIR="../../wp-content/plugins"
TARGET="$WORDPRESS_PLUGIN_DIR/$PLUGIN_NAME"

echo "Incremental install to $TARGET"
mkdir -p "$TARGET"

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT

# allow www-data to traverse/read the staging dir
chmod 755 "$STAGE_DIR"

# 1) build -> staging as USER; ensure files are world-readable
rsync -rlt --delete --checksum \
  --chmod=Duo=rwX,Fuo=rw \
  "$BUILD_PLUGIN"/ "$STAGE_DIR"/

# safety net: make sure everything is readable+traversable
chmod -R a+rX "$STAGE_DIR"

# 2) staging -> target as www-data
sudo -u www-data rsync -rlt --delete --checksum \
  --chmod=Dug=rwx,Do=rx,Fug=rw,Fo=r \
  "$STAGE_DIR"/ "$TARGET"/

echo "✅ Plugin synced (staged → www-data)"
