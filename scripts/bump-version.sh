#!/usr/bin/env bash
set -euo pipefail
BUMP="${1:-patch}"   # major | minor | patch

[[ -f VERSION ]] || { echo "VERSION file missing"; exit 1; }
old="$(tr -d ' \t\r\n' < VERSION)"
IFS=. read -r MA MI PA <<< "$old"

case "$BUMP" in
  major) MA=$((MA+1)); MI=0; PA=0 ;;
  minor) MI=$((MI+1)); PA=0 ;;
  patch) PA=$((PA+1)) ;;
  *)
    echo "Usage: $0 [major|minor|patch]"
    exit 1
    ;;
esac

new="${MA}.${MI}.${PA}"
echo "$new" > VERSION
git add VERSION
git commit -m "chore(version): bump to ${new}"
echo "Bumped: $old -> $new"
