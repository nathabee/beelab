#!/usr/bin/env bash

# scripts/alias_beefont.sh
# BeeFont aliases (REST helpers for V3 multi-page / glyph API)
# Assumes scripts/alias.sh has already been sourced (for _BEELAB_ROOT etc.)

# -------------------------------------------------------------------
# Base URL + token helpers
# -------------------------------------------------------------------

_beefont_base() {
  # Allow override via BEEFONT_BASE, otherwise default to dev Django API
  # Example override: export BEEFONT_BASE="https://your-domain/api/beefont"
  echo "${BEEFONT_BASE:-http://localhost:9001/api/beefont}"
}

_beefont_token() {
  # Always mint a fresh demo token; in dev it's cheap and avoids
  # "token_not_valid / expired" issues when shells are reused.
  local resp tok
  resp=$(curl -sS --fail-with-body -X POST "http://localhost:9001/api/user/auth/demo/start/") || {
    echo "BeeFont : auth /demo/start failed" >&2
    echo "$resp" >&2
    return 1
  }

  if command -v jq >/dev/null 2>&1; then
    tok=$(printf '%s' "$resp" | jq -r '.access // empty')
  else
    tok=$(printf '%s' "$resp" | python -c 'import sys,json;print(json.load(sys.stdin)["access"])' 2>/dev/null)
  fi

  if [[ -z "$tok" ]]; then
    echo "BeeFont : could not extract .access token" >&2
    echo "$resp" >&2
    return 1
  fi

  export BEEFONT_TOKEN="$tok"
  echo "$tok"
}

# Small helper to curl with auth header
_beefont_curl_auth() {
  local TOKEN
  TOKEN="$(_beefont_token)" || return 1
  curl -fSs -H "Authorization: Bearer $TOKEN" "$@"
}

beefont_rmjobs() {
  # delete ALL BeeFont jobs known to the API (for current user)
  beefont_jobs \
    | jq -r '.[].sid? // .results[].sid?' 2>/dev/null \
    | while read -r SID; do
        if [ -n "$SID" ]; then
          echo "Deleting job $SID..."
          beefont_job_delete "$SID"
        fi
      done
}

# -------------------------------------------------------------------
# Templates (V3)
# -------------------------------------------------------------------

# List templates
# Usage: beefont_templates
beefont_templates() {
  _beefont_curl_auth "$(_beefont_base)/templates/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Download template image 
# mode is optional, kept for compatibility (?mode=blank|blankpure|prefill|prefill_i|prefill_m|prefill_b)
# Usage: beefont_template_image CODE [mode] [outfile.png] ["LETTERS"]
beefont_template_image() {
  local CODE="${1:?template code missing}"
  local MODE="${2:-blank}"
  local OUT="${3:-template.png}"
  local LETTERS="${4:-}"

  local URL="$(_beefont_base)/templates/${CODE}/image/?mode=${MODE}"

  if [[ -n "$LETTERS" ]]; then
    # URL-encode via Python
    local ENC
    ENC=$(python -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))' "$LETTERS")
    URL="${URL}&letters=${ENC}"
  fi

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSs \
    -H "Authorization: Bearer $TOKEN" \
    "$URL" -o "$OUT" || {
      echo "BeeFont : download failed for $URL" >&2
      return 1
    }

  # primitive PNG-Prüfung
  if head -c 8 "$OUT" | xxd -p -c8 2>/dev/null | grep -qi '^89504e470d0a1a0a$'; then
    echo "saved → $OUT"
  else
    echo "warning: $OUT is not a PNG header, server may have returned HTML" >&2
    file "$OUT" 2>/dev/null || true
    return 1
  fi
}



# -------------------------------------------------------------------
# Languages (V3)
# -------------------------------------------------------------------

# List supported languages
# Usage: beefont_languages
beefont_languages() {
  _beefont_curl_auth "$(_beefont_base)/languages/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Get alphabet for language
# Usage: beefont_language_alphabet CODE
beefont_language_alphabet() {
  local CODE="${1:?language code missing}"
  _beefont_curl_auth "$(_beefont_base)/languages/${CODE}/alphabet/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Jobs (V3)
# -------------------------------------------------------------------

# List jobs
# Usage: beefont_jobs
beefont_jobs() {
  _beefont_curl_auth "$(_beefont_base)/jobs/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Create a job (V3: name + base_family)
# New usage:
#   beefont_job_create NAME [BASE_FAMILY]
# Backwards-compatible usage (V2-style, rest wird ignoriert):
#   beefont_job_create FAMILY LANGUAGE PAGE_FORMAT "CHARS"
beefont_job_create() {
  local NAME BASE_FAMILY

  if [[ $# -ge 4 ]]; then
    # V2-kompatibel: FAMILY LANGUAGE PAGE_FORMAT "CHARS"
    NAME="${1:?family missing}"
    BASE_FAMILY="${1}"
  else
    NAME="${1:?name missing}"
    BASE_FAMILY="${2:-$1}"
  fi

  local TOKEN JSON RESP
  TOKEN="$(_beefont_token)" || return 1

  JSON=$(printf '{"name":"%s","base_family":"%s"}' "$NAME" "$BASE_FAMILY")

  RESP=$(curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON" \
    "$(_beefont_base)/jobs/") || {
      echo "BeeFont : job create request failed" >&2
      echo "Raw response (curl failed):" >&2
      printf '%s\n' "$RESP" >&2
      return 1
    }

  if command -v jq >/dev/null 2>&1 && [[ "$RESP" == \{* || "$RESP" == \[* ]]; then
    echo "$RESP" | jq .
  else
    echo "$RESP"
  fi

  if command -v jq >/dev/null 2>&1; then
    export BEEFONT_JOB_SID="$(echo "$RESP" | jq -r '.sid // empty')"
  else
    export BEEFONT_JOB_SID="$(echo "$RESP" | python -c 'import sys,json;print(json.load(sys.stdin)["sid"])' 2>/dev/null)"
  fi
  [[ -n "$BEEFONT_JOB_SID" ]] && echo "BEEFONT_JOB_SID=$BEEFONT_JOB_SID"
}

# Job detail
# Usage: beefont_job SID
beefont_job() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Delete job
# Usage: beefont_job_delete SID
beefont_job_delete() {
  local SID="${1:?sid missing}"
  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Job pages (scan pages) – V3
# -------------------------------------------------------------------

# List pages for a job
# Usage: beefont_job_pages SID
beefont_job_pages() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/pages/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Create page + upload scan in one call (new API)
# Usage:
#   beefont_create_page SID TEMPLATE_CODE "LETTERS" IMG [PAGE_INDEX] [AUTO_ANALYSE]
#
# - PAGE_INDEX: optional; if omitted, backend assigns next free index
# - AUTO_ANALYSE: "true"/"false" (default: true)
# Returns raw JSON from the API (page or {page, analysis}).
beefont_create_page() {
  local SID="${1:?sid missing}"
  local TEMPLATE_CODE="${2:?template_code missing}"
  local LETTERS="${3:-}"
  local IMG="${4:?image path missing}"
  local PAGE_INDEX="${5:-}"
  local AUTO_ANALYSE="${6:-true}"

  [[ -f "$IMG" ]] || { echo "file not found: $IMG" >&2; return 1; }

  local TOKEN URL
  TOKEN="$(_beefont_token)" || return 1
  URL="$(_beefont_base)/jobs/${SID}/pages/create/"

  if [[ -n "$PAGE_INDEX" ]]; then
    curl -sS -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -F "template_code=${TEMPLATE_CODE}" \
      -F "letters=${LETTERS}" \
      -F "page_index=${PAGE_INDEX}" \
      -F "auto_analyse=${AUTO_ANALYSE}" \
      -F "file=@${IMG}" \
      "$URL"
  else
    curl -sS -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -F "template_code=${TEMPLATE_CODE}" \
      -F "letters=${LETTERS}" \
      -F "auto_analyse=${AUTO_ANALYSE}" \
      -F "file=@${IMG}" \
      "$URL"
  fi
}

 



# Delete page
# Usage: beefont_page_delete SID PAGE_ID
beefont_page_delete() {
  local SID="${1:?sid missing}"
  local PAGE_ID="${2:?page_id missing}"
  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/pages/${PAGE_ID}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

 
# Analyse page
# Usage: beefont_page_analyse SID PAGE_ID
beefont_page_analyse() {
  local SID="${1:?sid missing}"
  local PAGE_ID="${2:?page_id missing}"

  _beefont_curl_auth -X POST \
    "$(_beefont_base)/jobs/${SID}/pages/${PAGE_ID}/analyse/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Retry analysis
# Usage: beefont_page_retry_analysis SID PAGE_ID
beefont_page_retry_analysis() {
  local SID="${1:?sid missing}"
  local PAGE_ID="${2:?page_id missing}"

  _beefont_curl_auth -X POST \
    "$(_beefont_base)/jobs/${SID}/pages/${PAGE_ID}/retry-analysis/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Glyphs (V3)
# -------------------------------------------------------------------

# List glyphs for a job (optional: ?letter=)
# Usage: beefont_glyphs SID [LETTER]
beefont_glyphs() {
  local SID="${1:?sid missing}"
  local LETTER="${2:-}"
  local URL="$(_beefont_base)/jobs/${SID}/glyphs/"
  [[ -n "$LETTER" ]] && URL="${URL}?letter=${LETTER}"

  _beefont_curl_auth "$URL" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Detail for one letter (variants)
# Usage: beefont_glyph SID LETTER
beefont_glyph() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/glyphs/${LETTER}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Select default variant for a letter
# Usage:
#   beefont_glyph_select SID LETTER GLYPH_ID
#   beefont_glyph_select SID LETTER VARIANT_INDEX --by-variant
beefont_glyph_select() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  local VALUE="${3:?glyph_id_or_variant missing}"
  local MODE="glyph_id"
  [[ "${4:-}" == "--by-variant" ]] && MODE="variant_index"

  local TOKEN JSON
  TOKEN="$(_beefont_token)" || return 1

  if [[ "$MODE" == "glyph_id" ]]; then
    JSON=$(printf '{"glyph_id":%s}' "$VALUE")
  else
    JSON=$(printf '{"variant_index":%s}' "$VALUE")
  fi

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON" \
    "$(_beefont_base)/jobs/${SID}/glyphs/${LETTER}/select/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Font build + download (V3)
# -------------------------------------------------------------------

# Trigger TTF build (requires language)
# Usage: beefont_build SID LANGUAGE
beefont_build() {
  local SID="${1:?sid missing}"
  local LANG="${2:?language missing}"

  local TOKEN JSON
  TOKEN="$(_beefont_token)" || return 1
  JSON=$(printf '{"language":"%s"}' "$LANG")

  local RESP
  RESP=$(curl -fSs -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON" \
    "$(_beefont_base)/jobs/${SID}/build-ttf/") || {
      # HTTP != 2xx → hier bist du im "Fehler" Zweig, z.B. 400 bei fehlenden Glyphen
      echo "$RESP" | (command -v jq >/dev/null 2>&1 && jq . || cat)
      return 1
    }

  echo "$RESP" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}


# Download TTF
# Usage: beefont_download_ttf SID LANGUAGE [outfile.ttf]
beefont_download_ttf() {
  local SID="${1:?sid missing}"
  local LANG="${2:?language missing}"
  local OUT="${3:-beefont_${SID}_${LANG}.ttf}"

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSL \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/download/ttf/${LANG}/" \
    -o "$OUT" \
    && echo "saved → $OUT"
}

# Download ZIP (all builds + metadata)
# Usage: beefont_download_zip SID [outfile.zip]
beefont_download_zip() {
  local SID="${1:?sid missing}"
  local OUT="${2:-beefont_${SID}_bundle.zip}"

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSL \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/download/zip/" \
    -o "$OUT" \
    && echo "saved → $OUT"
}

# -------------------------------------------------------------------
# Language status (V3)
# -------------------------------------------------------------------

# Overview per language
# Usage: beefont_languages_status SID
beefont_languages_status() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/languages/status/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Status for one language
# Usage: beefont_language_status SID LANGUAGE
beefont_language_status() {
  local SID="${1:?sid missing}"
  local LANG="${2:?language missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/languages/${LANG}/status/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Demo helpers – Scenario A & B (V3)
# -------------------------------------------------------------------
# Scenario A (einfach): ein Job, ein Template, eine Sprache (z.B. EN)
# Nutzt ein Template als "Fake-Scan" → schneller End-to-End-Test.
#
# Usage:
#   beefont_demo_scenarioA [NAME] [LANG] [TEMPLATE_CODE] ["ALPHABET"]
#
# Defaults:
#   NAME          = BeeHand_EN
#   LANG          = en
#   TEMPLATE_CODE = A4_6x5
#   ALPHABET      = (aus /languages/<LANG>/alphabet)
beefont_demo_scenarioA() {
  local NAME="${1:-BeeHand_EN}"
  local LANG="${2:-en}"
  local TEMPLATE_CODE="${3:-A4_6x5}"
  local RAW_ALPHABET="${4:-}"
  local ALPHABET
  local SID

  echo "# Scenario A: simple job (NAME=${NAME}, LANG=${LANG}, TEMPLATE=${TEMPLATE_CODE})"

  echo "[1] create job"
  beefont_job_create "$NAME" "$NAME" || return 1
  SID="${BEEFONT_JOB_SID:?BEEFONT_JOB_SID not set}"
  echo "  SID=$SID"

  echo "[2a] fetch supported languages"
  local LANGS_JSON
  LANGS_JSON="$(beefont_languages)" || return 1

  if command -v jq >/dev/null 2>&1; then
    local FOUND_LANG
    FOUND_LANG="$(echo "$LANGS_JSON" \
      | jq -r --arg code "$LANG" '
          (.[]? // .results[]?)?
          | select(.code == $code)
          | .code
        ' | head -n1)"

    if [[ -z "$FOUND_LANG" || "$FOUND_LANG" == "null" ]]; then
      echo "ERROR: language '$LANG' not in SupportedLanguage list." >&2
      echo "Available codes:" >&2
      echo "$LANGS_JSON" | jq -r '(.[]? // .results[]?)? | .code' 2>/dev/null >&2
      return 1
    fi
    echo "  language '$LANG' is supported."
  else
    echo "WARNING: jq not available – cannot strictly validate LANG against list." >&2
  fi

  echo "[2b] fetch alphabet for language '$LANG'"
  local ALPH_JSON
  ALPH_JSON="$(beefont_language_alphabet "$LANG")" || return 1

  local API_ALPHABET
  if command -v jq >/dev/null 2>&1; then
    API_ALPHABET="$(echo "$ALPH_JSON" | jq -r '.alphabet // ""')"
  else
    echo "WARNING: jq not available – cannot extract alphabet, using RAW_ALPHABET or default A–Z." >&2
    API_ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  fi

  if [[ -z "$API_ALPHABET" || "$API_ALPHABET" == "null" ]]; then
    echo "WARNING: language '$LANG' has empty alphabet in API, falling back to A–Z." >&2
    API_ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  fi

  if [[ -n "$RAW_ALPHABET" ]]; then
    ALPHABET="$RAW_ALPHABET"
    echo "[2c] using user-specified ALPHABET='$ALPHABET'"
    if command -v jq >/dev/null 2>&1; then
      echo "     checking each glyph against language alphabet '$API_ALPHABET'"
      local i ch
      local LEN=${#ALPHABET}
      for (( i=0; i<LEN; i++ )); do
        ch="${ALPHABET:i:1}"
        if [[ "$API_ALPHABET" != *"$ch"* ]]; then
          echo "WARNING: character '$ch' not found in alphabet for '$LANG' ('$API_ALPHABET')." >&2
        fi
      done
    fi
  else
    ALPHABET="$API_ALPHABET"
    echo "[2c] no ALPHABET override provided → using language alphabet:"
    echo "     '${ALPHABET}'"
  fi

  local CAPACITYPAGE=30
  echo "[3] template capacity per page = $CAPACITYPAGE (assumed)"

  local REMAINING="$ALPHABET"
  local STATUS_JSON READY MISSING_CHARS
  local OUT_TTF="${NAME}_${LANG}.ttf"
  local PREV_MISSING_CHARS=""

  READY="false"
  MISSING_CHARS="$ALPHABET"

  echo "[4] starting loop over pages (alphabet length=${#ALPHABET})"

  while [[ "$READY" != "true" && -n "$MISSING_CHARS" ]]; do
    echo
    echo "=== NEW PAGE ROUND ==="
    echo "  remaining chars before this round: '$MISSING_CHARS'"

    if [[ -n "$PREV_MISSING_CHARS" && "$MISSING_CHARS" == "$PREV_MISSING_CHARS" ]]; then
      echo "ERROR: missing_chars did not change between rounds."
      echo "       Backend seems unable to resolve these glyphs: '$MISSING_CHARS'"
      echo "       Aborting loop to avoid infinite page creation."
      return 1
    fi
    PREV_MISSING_CHARS="$MISSING_CHARS"

    REMAINING="$MISSING_CHARS"
    local BATCH="${REMAINING:0:CAPACITYPAGE}"
    if [[ -z "$BATCH" ]]; then
      echo "nothing left to fill, but READY != true – aborting." >&2
      return 1
    fi
    echo "  batch for this page: '$BATCH'"

    # 4a) Template als Fake-Scan herunterladen
    local PREF="django/media/beefont/templates/prefill_${TEMPLATE_CODE}_auto.png"
    echo "  [4a] download template image as fake scan → $PREF"
    beefont_template_image "$TEMPLATE_CODE" "prefill_i" "$PREF" "$BATCH" || return 1

    # 4b) Page erstellen + Scan hochladen + Analyse in einem Schritt
    echo "  [4b] create page with scan (auto page_index + auto analyse)"
    beefont_create_page "$SID" "$TEMPLATE_CODE" "$BATCH" "$PREF" "" "true" \
      | (command -v jq >/dev/null 2>&1 && jq . || cat) || return 1

    # 4g) Glyphs inspizieren (optional)
    echo "  [4g] list glyphs (optional)"
    beefont_glyphs "$SID" || true

    # 4h) Language-Status prüfen
    echo "  [4h] language status (${LANG})"
    STATUS_JSON="$(beefont_language_status "$SID" "$LANG")" || return 1
    echo "$STATUS_JSON"

    READY="$(echo "$STATUS_JSON" | jq -r '.ready // false')"
    MISSING_CHARS="$(echo "$STATUS_JSON" | jq -r '.missing_chars // ""')"

    echo "    ready=${READY}"
    echo "    missing_chars='${MISSING_CHARS}'"

    # 4i) Build-TTF testen
    echo "  [4i] test build_ttf"
    if [[ "$READY" == "true" ]]; then
      echo "    all required glyphs present → build should SUCCEED"
      if ! beefont_build "$SID" "$LANG"; then
        echo "ERROR: build_ttf failed although READY=true" >&2
        return 1
      fi
    else
      echo "    missing glyphs → build should FAIL with 400"
      if beefont_build "$SID" "$LANG"; then
        echo "ERROR: build_ttf succeeded although glyphs are missing" >&2
        return 1
      else
        echo "    build_ttf correctly failed due to missing glyphs."
      fi
    fi
  done

  if [[ "$READY" != "true" ]]; then
    echo "ERROR: loop ended but READY is not true. Still missing: '$MISSING_CHARS'" >&2
    return 1
  fi

  echo
  echo "[5] final build TTF (READY=true)"
  beefont_build "$SID" "$LANG" || {
    echo "ERROR: final build_ttf failed although READY=true" >&2
    return 1
  }

  echo "[6] download TTF"
  beefont_download_ttf "$SID" "$LANG" "$OUT_TTF" || {
    echo "ERROR: download_ttf failed although READY=true and build succeeded" >&2
    return 1
  }

  echo "[7] inspect TTF (lang=${LANG})"
  beefont_inspectfont "$SID" "$OUT_TTF" "$LANG" || true

  echo
  echo "Scenario A finished."
  echo "  SID  = $SID"
  echo "  TTF  = $OUT_TTF"
}


# Scenario B: extend an existing job with an additional language.
#
# Usage:
#   beefont_demo_scenarioB SID [LANG] [TEMPLATE_CODE]
#
# Parameters:
#   SID           = existing job SID (created e.g. via Scenario A)
#   LANG          = target language code (default: de)
#   TEMPLATE_CODE = template to use for the extra page (default: A4_6x5)
#
# Behaviour:
#   - asks the backend for language status (ready / missing_chars) for LANG
#   - if there are missing_chars, creates a new page with those characters,
#     downloads a prefilled template, uploads it as scan and analyses it
#   - tries to build TTF and download it for that language
beefont_demo_scenarioB() {
  local SID="${1:?SID of existing job missing}"
  local LANG="${2:-de}"
  local TEMPLATE_CODE="${3:-A4_6x5}"

  echo "# Scenario B: extend existing job $SID with language ${LANG}"

  echo "[1] language status before (LANG=${LANG})"
  local STATUS_JSON
  STATUS_JSON="$(beefont_language_status "$SID" "$LANG")" || return 1

  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required for beefont_demo_scenarioB" >&2
    return 1
  fi

  local READY MISSING_CHARS
  READY="$(echo "$STATUS_JSON" | jq -r '.ready // false')"
  MISSING_CHARS="$(echo "$STATUS_JSON" | jq -r '.missing_chars // ""')"
  echo "  ready=${READY}"
  echo "  missing_chars='${MISSING_CHARS}'"

  if [[ "$READY" == "true" ]]; then
    echo "Language '${LANG}' is already ready for this job; continuing anyway (demo will still create a page)." >&2
  fi

  if [[ -z "$MISSING_CHARS" || "$MISSING_CHARS" == "null" ]]; then
    echo "No missing_chars reported; nothing to do for language '${LANG}'." >&2
    echo "Scenario B finished (no additional page created)."
    return 0
  fi

  echo "[2] create page for missing chars (auto page_index + auto analyse)"
  local PREF="django/media/beefont/templates/prefill_${TEMPLATE_CODE}_missing.png"
  echo "  download prefilled template → $PREF"
  beefont_template_image "$TEMPLATE_CODE" "prefill_m" "$PREF" "$MISSING_CHARS" || return 1

  beefont_create_page "$SID" "$TEMPLATE_CODE" "$MISSING_CHARS" "$PREF" "" "true" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat) || return 1

  echo "[3] list glyphs (after new page)"
  beefont_glyphs "$SID" || true

  echo "[4] language status after (LANG=${LANG})"
  beefont_language_status "$SID" "$LANG" || true

  echo "[5] build TTF for language ${LANG}"
  beefont_build "$SID" "$LANG" || true

  echo "[6] download TTF + ZIP for language ${LANG}"
  local OUT_TTF="BeeHand_${LANG}.ttf"
  local OUT_ZIP="beefont_${SID}_bundle.zip"
  beefont_download_ttf "$SID" "$LANG" "$OUT_TTF" || true
  beefont_download_zip "$SID" "$OUT_ZIP" || true

  echo "Scenario B finished."
  echo "  SID          = $SID"
  echo "  TTF (${LANG}) = $OUT_TTF"
  echo "  ZIP          = $OUT_ZIP"
}


# Scenario C: redraw specific letters for an existing job + language
#
# Usage:
#   beefont_demo_scenarioC SID [LANG] [TEMPLATE_CODE] [LETTERS_TO_CHANGE]
#
# Parameters:
#   SID               = existing job SID (from Scenario A)
#   LANG              = language code to rebuild for (same as in Scenario B, default: de)
#   TEMPLATE_CODE     = template to use for the page (default: A4_6x5)
#   LETTERS_TO_CHANGE = string of characters to redraw (default: ABC)
#
# Behaviour:
#   - determines next free page_index
#   - creates a page containing LETTERS_TO_CHANGE
#   - downloads prefilled template, uploads as scan, analyses
#   - for each letter in LETTERS_TO_CHANGE, selects the glyph from this new page
#     and marks it as the default glyph for that letter
#   - rebuilds TTF for LANG and downloads it
beefont_demo_scenarioC() {
  local SID="${1:?SID of existing job missing}"
  local LANG="${2:-de}"
  local TEMPLATE_CODE="${3:-A4_6x5}"
  local LETTERS_TO_CHANGE="${4:-ABC}"

  echo "# Scenario C: redraw letters '${LETTERS_TO_CHANGE}' for job ${SID}, language ${LANG}"

  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required for beefont_demo_scenarioC" >&2
    return 1
  fi

  echo "[1] download prefilled template for these letters"
  local PREF="django/media/beefont/templates/prefill_${TEMPLATE_CODE}_scenarioC.png"
  beefont_template_image "$TEMPLATE_CODE" "prefill_b" "$PREF" "$LETTERS_TO_CHANGE" || return 1

  echo "[2] create page with scan (auto page_index + auto analyse)"
  local RESP PAGE_INDEX
  RESP="$(beefont_create_page "$SID" "$TEMPLATE_CODE" "$LETTERS_TO_CHANGE" "$PREF" "" "true")" || return 1
  echo "$RESP" | jq .

  PAGE_INDEX="$(echo "$RESP" | jq -r '.page.page_index // .page_index')"
  if [[ -z "$PAGE_INDEX" || "$PAGE_INDEX" == "null" ]]; then
    echo "ERROR: could not extract page_index from create-with-scan response" >&2
    return 1
  fi
  echo "  new page_index = ${PAGE_INDEX}"

  echo "[3] fetch glyphs after analysis"
  local GLYPHS_JSON
  GLYPHS_JSON="$(beefont_glyphs "$SID")" || return 1

  echo "[4] set new defaults for letters '${LETTERS_TO_CHANGE}' from page_index=${PAGE_INDEX}"
  local i ch GLYPH_ID
  for (( i=0; i<${#LETTERS_TO_CHANGE}; i++ )); do
    ch="${LETTERS_TO_CHANGE:i:1}"
    echo "  processing letter '${ch}'"

    GLYPH_ID="$(
      echo "$GLYPHS_JSON" \
        | jq -r --arg ch "$ch" --argjson idx "$PAGE_INDEX" '
            (.[]? // .results[]?)
            | select(.letter == $ch and .page_index == $idx)
            | .id
          ' \
        | head -n1
    )"

    if [[ -z "$GLYPH_ID" || "$GLYPH_ID" == "null" ]]; then
      echo "    WARNING: no glyph found for letter '${ch}' on page_index=${PAGE_INDEX}" >&2
      continue
    fi

    echo "    setting glyph ${GLYPH_ID} as default for '${ch}'"
    beefont_glyph_select "$SID" "$ch" "$GLYPH_ID" >/dev/null 2>&1 \
      || echo "    WARNING: failed to set default for glyph ${GLYPH_ID}" >&2
  done

  echo "[5] language status after changing defaults (LANG=${LANG})"
  beefont_language_status "$SID" "$LANG" || true

  echo "[6] rebuild TTF for language ${LANG}"
  beefont_build "$SID" "$LANG" || true

  echo "[7] download updated TTF"
  local OUT_TTF="BeeHand_${LANG}_scenarioC.ttf"
  beefont_download_ttf "$SID" "$LANG" "$OUT_TTF" || true

  echo "Scenario C finished."
  echo "  SID            = $SID"
  echo "  LANG           = $LANG"
  echo "  PAGE_INDEX     = $PAGE_INDEX"
  echo "  LETTERS_UPDATED= '${LETTERS_TO_CHANGE}'"
  echo "  TTF            = $OUT_TTF"
}



# -------------------------------------------------------------------
# Misc helpers
# -------------------------------------------------------------------

beefont_inspectfont() {
  local SID="${1:?sid missing}"
  local FONTNAME="${2:?fontname missing}"
  local LANG="${3:-}"   # optional

  if [[ -n "$LANG" ]]; then
    echo dcdjango python manage.py inspect_beefont "$LANG" "/app/media/beefont/jobs/${SID}/build/${FONTNAME}"
    dcdjango python manage.py inspect_beefont "$LANG" "/app/media/beefont/jobs/${SID}/build/${FONTNAME}"


  else
    exit 1
 

  fi
}


beefont_desinstall() {
  rm ~/.local/share/fonts/BeeHandDE.ttf 2>/dev/null || true
  rm ~/.fonts/BeeHandDE.ttf 2>/dev/null || true
}

# -------------------------------------------------------------------
# HELP
# -------------------------------------------------------------------

beefonthelp() {
  cat <<'EOF'
# --- BeeFont V3 testing quick guide -----------------------------------------

Concepts:
- SupportedLanguage : defines code + alphabet for a language (de, en, fr, ...)
- TemplateDefinition: defines grid (rows x cols), dpi, etc.
- FontJob           : one font project (name, base_family, user)
- JobPage           : one scanned page (template + letters + scan_image_path)
- Glyph             : drawn letter variant (per job + letter multiple variants,
                      one default)
- FontBuild         : one TTF per (job, language)

Base URL (dev):
  http://localhost:9001/api/beefont

Auth:
  Demo token via /api/user/auth/demo/start/ (handled by _beefont_token)

TEMPLATES:
  beefont_templates
  beefont_template_image CODE [mode] [outfile.png]

LANGUAGES:
  beefont_languages
  beefont_language_alphabet CODE

JOBS:
  beefont_jobs
  beefont_job_create NAME [BASE_FAMILY]
  beefont_job SID
  beefont_job_delete SID
  beefont_rmjobs

PAGES:
  beefont_job_pages SID
  beefont_page_delete SID PAGE_ID
  beefont_page_analyse SID PAGE_ID
  beefont_page_retry_analysis SID PAGE_ID
  beefont_create_page SID TEMPLATE_CODE "LETTERS" scan.png [PAGE_INDEX] [AUTO_ANALYSE]

GLYPHS:
  beefont_glyphs SID [LETTER]
  beefont_glyph SID LETTER
  beefont_glyph_select SID LETTER GLYPH_ID
  beefont_glyph_select SID LETTER VARIANT_INDEX --by-variant

BUILDS:
  beefont_build SID LANGUAGE
  beefont_download_ttf SID LANGUAGE [outfile.ttf]
  beefont_download_zip SID [outfile.zip]

LANGUAGE STATUS:
  beefont_languages_status SID
  beefont_language_status SID LANGUAGE

DEMO FLOWS:
  # Scenario A: simple font (one job, one template, one language)
  beefont_demo_scenarioA [NAME] [LANG] [TEMPLATE_CODE] ["ALPHABET"]

  # Scenario B: existing EN job → extend to DE (missing chars)
  beefont_demo_scenarioB SID [DE_LANG] [TEMPLATE_CODE]


  # Scenario C:  benutze same parameter as B : scan a new page and assigne new letter per default
  beefont_demo_scenarioC SID [LANG] [TEMPLATE_CODE] ["LISTLETTERTOCHANGE"]

Notes:
- Scenario A/B verwenden Template-Images als Fake-Scans, um den End-to-End-Flow
  zu testen, ohne echte Handschrift scannen zu müssen.
- TEMPLATE_CODE und SupportedLanguage.alphabet müssen zu euren realen
  V3-Templates passen.

EOF
}
