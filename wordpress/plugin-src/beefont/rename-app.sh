#!/usr/bin/env bash
set -euo pipefail

log() { printf '%s\n' "$*" >&2; }

# Ask for new CamelCase name
read -rp "Enter new app name in CamelCase (e.g. MyNewAppName): " NEW_CAMEL

if [[ -z "$NEW_CAMEL" ]]; then
  log "No name given, abort."
  exit 1
fi

NEW_UPPER=${NEW_CAMEL^^}
NEW_LOWER=${NEW_CAMEL,,}

log "Using replacements:"
log "  Nutshell  -> $NEW_CAMEL"
log "  NUTSHELL  -> $NEW_UPPER"
log "  nutshell  -> $NEW_LOWER"
printf "Continue? [y/N] "
read -r CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  log "Aborted."
  exit 0
fi

############################################
# 1) Replace contents in files
############################################

log "Replacing strings inside files..."

find . \
  \( -path "./build" -o -path "./build/*" \
     -o -path "./dist" -o -path "./dist/*" \
     -o -path "./node_modules" -o -path "./node_modules/*" \) -prune -o \
  -type f -name "*.*" -print | while IFS= read -r file; do
    sed -i.bak \
      -e "s/NUTSHELL/${NEW_UPPER}/g" \
      -e "s/Nutshell/${NEW_CAMEL}/g" \
      -e "s/nutshell/${NEW_LOWER}/g" \
      "$file"
    rm -f "${file}.bak"
done

############################################
# 2) Rename files
############################################

log "Renaming files whose names contain Nutshell/nutshell/NUTSHELL..."

find . -depth \
  \( -path "./build" -o -path "./build/*" \
     -o -path "./dist" -o -path "./dist/*" \
     -o -path "./node_modules" -o -path "./node_modules/*" \) -prune -o \
  -type f -print | while IFS= read -r file; do
    dir=$(dirname "$file")
    base=$(basename "$file")

    newbase="$base"
    newbase=${newbase//NUTSHELL/${NEW_UPPER}}
    newbase=${newbase//Nutshell/${NEW_CAMEL}}
    newbase=${newbase//nutshell/${NEW_LOWER}}

    if [[ "$newbase" != "$base" ]]; then
      newpath="${dir}/${newbase}"
      log "  file: $file -> $newpath"
      mv "$file" "$newpath"
    fi
done

############################################
# 3) Rename directories
############################################

log "Renaming directories whose names contain Nutshell/nutshell/NUTSHELL..."

find . -depth \
  \( -path "./build" -o -path "./build/*" \
     -o -path "./dist" -o -path "./dist/*" \
     -o -path "./node_modules" -o -path "./node_modules/*" \) -prune -o \
  -type d -print | while IFS= read -r dir; do
    # do not rename "."
    if [[ "$dir" == "." ]]; then
      continue
    fi

    parent=$(dirname "$dir")
    base=$(basename "$dir")

    newbase="$base"
    newbase=${newbase//NUTSHELL/${NEW_UPPER}}
    newbase=${newbase//Nutshell/${NEW_CAMEL}}
    newbase=${newbase//nutshell/${NEW_LOWER}}

    if [[ "$newbase" != "$base" ]]; then
      newpath="${parent}/${newbase}"
      log "  dir:  $dir -> $newpath"
      mv "$dir" "$newpath"
    fi
done

CURDIR=$(basename "$(pwd)")
log "Done."
log "Note: the current directory '${CURDIR}' itself was not renamed. Rename it manually if needed."
