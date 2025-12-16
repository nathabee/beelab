#!/usr/bin/env bash
set -o pipefail
# BeeFont aliases (REST helpers for V3 multi-page / glyph API)
# Assumes scripts/alias.sh has already been sourced (for _BEELAB_ROOT etc.)

# -------------------------------------------------------------------
# Base URL + token helpers
# -------------------------------------------------------------------

_beefont_base() {
  # Allow override via BEEFONT_BASE, otherwise default to dev Django API
  echo "${BEEFONT_BASE:-http://localhost:9001/api/beefont}"
}

#Wenn du bewusst einen neuen Demo-User willst, kannst du dir separat einen Helper bauen:
_beefont_token() {
  # Wenn wir schon einen Token haben, denselben wiederverwenden
  if [[ -n "$BEEFONT_TOKEN" ]]; then
    echo "$BEEFONT_TOKEN"
    return 0
  fi

  # Sonst neuen holen
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

beefont_newtoken() {
  unset BEEFONT_TOKEN
  _beefont_token >/dev/null
}

# Small helper to curl with auth header
_beefont_curl_auth() {
  local TOKEN
  TOKEN="$(_beefont_token)" || return 1
  curl -fSs -H "Authorization: Bearer $TOKEN" "$@"
}

# Tiny 1x1 PNG for upload tests (no external tools needed)
_beefont_write_tiny_png() {
  local OUT="${1:?out path missing}"
  base64 -d >"$OUT" <<'B64'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQotDQAAAABJRU5ErkJggg==
B64
}

# Minimal SVG for upload tests
_beefont_write_dummy_svg() {
  local OUT="${1:?out path missing}"
  local LETTER="${2:-X}"
  cat >"$OUT" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect x="10" y="10" width="180" height="180" fill="none" stroke="black" stroke-width="4"/>
  <text x="100" y="120" font-size="100" text-anchor="middle" fill="black">${LETTER}</text>
</svg>
EOF
}

beefont_rmjobs() {
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

beefont_templates() {
  _beefont_curl_auth "$(_beefont_base)/templates/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Usage: beefont_template_image CODE [mode] [outfile.png] ["LETTERS"]
beefont_template_image() {
  local CODE="${1:?template code missing}"
  local MODE="${2:-blank}"
  local OUT="${3:-template.png}"
  local LETTERS="${4:-}"

  local URL="$(_beefont_base)/templates/${CODE}/image/?mode=${MODE}"

  if [[ -n "$LETTERS" ]]; then
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

beefont_languages() {
  _beefont_curl_auth "$(_beefont_base)/languages/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

beefont_language_alphabet() {
  local CODE="${1:?language code missing}"
  _beefont_curl_auth "$(_beefont_base)/languages/${CODE}/alphabet/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Jobs (V3)
# -------------------------------------------------------------------

beefont_jobs() {
  _beefont_curl_auth "$(_beefont_base)/jobs/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# New usage:
#   beefont_job_create NAME [BASE_FAMILY]
# Backwards-compatible usage:
#   beefont_job_create FAMILY LANGUAGE PAGE_FORMAT "CHARS"
beefont_job_create() {
  local NAME BASE_FAMILY

  if [[ $# -ge 4 ]]; then
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

beefont_job() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

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

beefont_job_pages() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/pages/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Page detail (GET)
# Usage: beefont_page SID PAGE_ID
beefont_page() {
  local SID="${1:?sid missing}"
  local PAGE_ID="${2:?page_id missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/pages/${PAGE_ID}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Create page + upload scan
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

beefont_page_analyse() {
  local SID="${1:?sid missing}"
  local PAGE_ID="${2:?page_id missing}"

  _beefont_curl_auth -X POST \
    "$(_beefont_base)/jobs/${SID}/pages/${PAGE_ID}/analyse/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

beefont_page_retry_analysis() {
  local SID="${1:?sid missing}"
  local PAGE_ID="${2:?page_id missing}"

  _beefont_curl_auth -X POST \
    "$(_beefont_base)/jobs/${SID}/pages/${PAGE_ID}/retry-analysis/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Glyphs (format-agnostic list / detail / select)
# -------------------------------------------------------------------

beefont_glyphs() {
  local SID="${1:?sid missing}"
  local LETTER="${2:-}"
  local URL="$(_beefont_base)/jobs/${SID}/glyphs/"
  [[ -n "$LETTER" ]] && URL="${URL}?letter=${LETTER}"

  _beefont_curl_auth "$URL" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

beefont_glyph() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/glyphs/${LETTER}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

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
# Single glyph upload (PNG / SVG)
# -------------------------------------------------------------------

# Usage: beefont_upload_glyph_from_png SID LETTER file.png
beefont_upload_glyph_from_png() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  local IMG="${3:?image path missing}"
  [[ -f "$IMG" ]] || { echo "file not found: $IMG" >&2; return 1; }

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "letter=${LETTER}" \
    -F "file=@${IMG}" \
    "$(_beefont_base)/jobs/${SID}/glyphs/png/upload/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Usage: beefont_upload_glyph_from_svg SID LETTER file.svg
beefont_upload_glyph_from_svg() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  local SVG="${3:?svg path missing}"
  [[ -f "$SVG" ]] || { echo "file not found: $SVG" >&2; return 1; }

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "letter=${LETTER}" \
    -F "file=@${SVG}" \
    "$(_beefont_base)/jobs/${SID}/glyphs/svg/upload/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Glyph ZIP upload/download – PNG
# -------------------------------------------------------------------

# Download ZIP of default PNG glyphs
# Usage: beefont_download_default_glyphs_zip_png SID [outfile.zip]
beefont_download_default_glyphs_zip_png() {
  local SID="${1:?sid missing}"
  local OUT="${2:-${SID}_glyphs_default_png.zip}"

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSL \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/glyphs/png/download/default-zip/" \
    -o "$OUT" \
    && echo "saved → $OUT"
}

# Download ZIP of all PNG glyphs
# Usage: beefont_download_all_glyphs_zip_png SID [outfile.zip]
beefont_download_all_glyphs_zip_png() {
  local SID="${1:?sid missing}"
  local OUT="${2:-${SID}_glyphs_all_png.zip}"

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSL \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/glyphs/png/download/all-zip/" \
    -o "$OUT" \
    && echo "saved → $OUT"
}

# Upload PNG glyphs ZIP
# Usage: beefont_upload_glyphs_zip_png SID file.zip
beefont_upload_glyphs_zip_png() {
  local SID="${1:?sid missing}"
  local ZIP="${2:?zip path missing}"
  [[ -f "$ZIP" ]] || { echo "file not found: $ZIP" >&2; return 1; }

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@${ZIP}" \
    "$(_beefont_base)/jobs/${SID}/glyphs/png/upload-zip/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Glyph ZIP upload/download – SVG
# -------------------------------------------------------------------

# Download ZIP of default SVG glyphs
# Usage: beefont_download_default_glyphs_zip_svg SID [outfile.zip]
beefont_download_default_glyphs_zip_svg() {
  local SID="${1:?sid missing}"
  local OUT="${2:-${SID}_glyphs_default_svg.zip}"

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSL \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/glyphs/svg/download/default-zip/" \
    -o "$OUT" \
    && echo "saved → $OUT"
}

# Download ZIP of all SVG glyphs
# Usage: beefont_download_all_glyphs_zip_svg SID [outfile.zip]
beefont_download_all_glyphs_zip_svg() {
  local SID="${1:?sid missing}"
  local OUT="${2:-${SID}_glyphs_all_svg.zip}"

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -fSL \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/glyphs/svg/download/all-zip/" \
    -o "$OUT" \
    && echo "saved → $OUT"
}

# Upload SVG glyphs ZIP
# Usage: beefont_upload_glyphs_zip_svg SID file.zip
beefont_upload_glyphs_zip_svg() {
  local SID="${1:?sid missing}"
  local ZIP="${2:?zip path missing}"
  [[ -f "$ZIP" ]] || { echo "file not found: $ZIP" >&2; return 1; }

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@${ZIP}" \
    "$(_beefont_base)/jobs/${SID}/glyphs/svg/upload-zip/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------------------------------------------------
# Font builds + downloads (V3)
# -------------------------------------------------------------------

# List builds for a job
# Usage: beefont_list_builds SID
beefont_list_builds() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/builds/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Trigger TTF build (path-based; format in path)
# Usage: beefont_build SID LANGUAGE [FORMAT]
# Default FORMAT is "png".
beefont_build() {
  local SID="${1:?sid missing}"
  local LANG="${2:?language missing}"
  local FMT="${3:-png}"

  local TOKEN RESP
  TOKEN="$(_beefont_token)" || return 1

  RESP=$(curl -fSs -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/build-ttf/${LANG}/${FMT}/") || {
      echo "$RESP" | (command -v jq >/dev/null 2>&1 && jq . || cat)
      return 1
    }

  echo "$RESP" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

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
# Language status
# -------------------------------------------------------------------

# Overview per language
# Usage: beefont_languages_status SID [FORMAT] 
beefont_languages_status() {
  local SID="${1:?sid missing}"
  local FMT="${2:-png}"

#  echo " i test : $(_beefont_base)/jobs/${SID}/languages/status/${FMT}/"
#  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/languages/status/${FMT}/" \
  #echo " i test : $(_beefont_base)/jobs/${SID}/missingcharstatus/${FMT}/"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/missingcharstatus/${FMT}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

 
 

# Status for one language
# Usage: beefont_language_status SID LANGUAGE [FORMAT]
beefont_language_status() {
  local SID="${1:?sid missing}"
  local LANG="${2:?language missing}"
  local FMT="${3:-png}"

#  echo " i test : $(_beefont_base)/jobs/${SID}/language/${LANG}/status/${FMT}/"
#  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/language/${LANG}/status/${FMT}/" \
  #echo " i test : $(_beefont_base)/jobs/${SID}/missingcharstatus/${LANG}/${FMT}/"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/missingcharstatus/${LANG}/${FMT}/" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}


# -------------------------------------------------------------------
# Misc helpers (inspect, uninstall)
# -------------------------------------------------------------------

beefont_inspectfont() {
  local SID="${1:?sid missing}"
  local FONTNAME="${2:?fontname missing}"
  local LANG="${3:-}"

  if [[ -n "$LANG" ]]; then
    echo dcdjango python manage.py inspect_beefont "$LANG" "/app/media/beefont/jobs/${SID}/build/${FONTNAME}"
    dcdjango python manage.py inspect_beefont "$LANG" "/app/media/beefont/jobs/${SID}/build/${FONTNAME}"
  else
    exit 1
  fi
}

beefont_desinstall() {
  local FONTNAME="${1:?fontname missing}"
  rm ~/.local/share/fonts/${FONTNAME}.ttf 2>/dev/null || true
  rm ~/.fonts/${FONTNAME}.ttf 2>/dev/null || true
  fc-cache -f -v
}

# -------------------------------------------------------------------
# Scenario A / B / C (unchanged semantics; PNG)
# -------------------------------------------------------------------

# Scenario A: create job, loop pages until language ready, build TTF, download
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
    echo "WARNING: jq not available – cannot extract alphabet, using default A–Z." >&2
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
    echo "[2c] using language alphabet:"
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

    local PREF="django/media/beefont/templates/prefill_${TEMPLATE_CODE}_auto.png"
    echo "  [4a] download template image as fake scan → $PREF"
    beefont_template_image "$TEMPLATE_CODE" "prefill_i" "$PREF" "$BATCH" || return 1

    echo "  [4b] create page with scan (auto page_index + auto analyse)"
    beefont_create_page "$SID" "$TEMPLATE_CODE" "$BATCH" "$PREF" "" "true" \
      | (command -v jq >/dev/null 2>&1 && jq . || cat) || return 1

    echo "  [4g] list glyphs (optional)"
    beefont_glyphs "$SID" || true

    # 4h) Language-Status prüfen
    echo "  [4h] language status (${LANG})"
    STATUS_JSON="$(beefont_language_status "$SID" "$LANG" "png")" || return 1
    echo "$STATUS_JSON"

    READY="$(echo "$STATUS_JSON" | jq -r '.ready // false')"
    MISSING_CHARS="$(echo "$STATUS_JSON" | jq -r '.missing_chars // ""')"

    echo "    ready=${READY}"
    echo "    missing_chars='${MISSING_CHARS}'"


    echo "  [4i] test build_ttf (png)"
    if [[ "$READY" == "true" ]]; then
      echo "    all required glyphs present → build should SUCCEED"
      if ! beefont_build "$SID" "$LANG" png; then
        echo "ERROR: build_ttf failed although READY=true" >&2
        return 1
      fi
    else
      echo "    missing glyphs → build should FAIL with 400"
      if beefont_build "$SID" "$LANG" png; then
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
  echo "[5] final build TTF (READY=true, png)"
  beefont_build "$SID" "$LANG" png || {
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
# Scenario D – PNG ZIP roundtrip + single PNG upload
# -------------------------------------------------------------------
# Goals:
#   - ensure PNG ZIP endpoints work end-to-end:
#       * download_default_glyphs_zip_png
#       * download_all_glyphs_zip_png
#       * upload_glyphs_zip_png
#   - ensure single PNG glyph upload works:
#       * upload_glyph_from_png
#
# Usage:
#   beefont_demo_scenarioD [NAME] [LANG] [TEMPLATE_CODE]
#
# Defaults:
#   NAME          = BeeHand_PNG_DEMO
#   LANG          = en
#   TEMPLATE_CODE = A4_6x5
beefont_demo_scenarioD() {
  local NAME="${1:-BeeHand_PNG_DEMO}"
  local LANG="${2:-en}"
  local TEMPLATE_CODE="${3:-A4_6x5}"

  echo "# Scenario D: PNG ZIP roundtrip + single PNG upload"
  echo "  NAME=${NAME} LANG=${LANG} TEMPLATE=${TEMPLATE_CODE}"

  echo "[1] create job"
  beefont_job_create "$NAME" "$NAME" || return 1
  local SID="${BEEFONT_JOB_SID:?BEEFONT_JOB_SID not set}"
  echo "  SID=$SID"

  echo "[2] fetch alphabet for language '$LANG'"
  local ALPH_JSON ALPHABET
  ALPH_JSON="$(beefont_language_alphabet "$LANG")" || return 1
  if command -v jq >/dev/null 2>&1; then
    ALPHABET="$(echo "$ALPH_JSON" | jq -r '.alphabet // ""')"
  else
    ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  fi
  if [[ -z "$ALPHABET" || "$ALPHABET" == "null" ]]; then
    ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  fi
  local BATCH="${ALPHABET:0:8}"
  echo "  using first 8 letters for demo: '$BATCH'"

  echo "[3] create one analysed PNG page (prefill_i fake scan)"
  local PREF="django/media/beefont/templates/prefill_${TEMPLATE_CODE}_scenarioD.png"
  beefont_template_image "$TEMPLATE_CODE" "prefill_i" "$PREF" "$BATCH" || return 1

  beefont_create_page "$SID" "$TEMPLATE_CODE" "$BATCH" "$PREF" "" "true" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat) || return 1

  echo "[4] list glyphs (PNG)"
  beefont_glyphs "$SID" || true

  echo "[5] language status overview (png)"
  beefont_languages_status "$SID" png || true

  echo "[6] download default PNG glyphs ZIP"
  local ZIP_DEFAULT="beefont_${SID}_default_png.zip"
  beefont_download_default_glyphs_zip_png "$SID" "$ZIP_DEFAULT" || return 1

  echo "[7] download all PNG glyphs ZIP"
  local ZIP_ALL="beefont_${SID}_all_png.zip"
  beefont_download_all_glyphs_zip_png "$SID" "$ZIP_ALL" || return 1

  if command -v unzip >/dev/null 2>&1; then
    echo "  inspecting ZIP contents:"
    unzip -l "$ZIP_ALL" | head -n 20
  fi

  echo "[8] re-upload all PNG glyphs ZIP to create additional variants"
  beefont_upload_glyphs_zip_png "$SID" "$ZIP_ALL" || return 1

  echo "[9] list glyphs again (should show more variants)"
  beefont_glyphs "$SID" || true

  echo "[10] upload a single tiny PNG glyph for letter 'Z'"
  local TMPPNG="beefont_dummy_Z.png"
  _beefont_write_tiny_png "$TMPPNG"
  beefont_upload_glyph_from_png "$SID" "Z" "$TMPPNG" || return 1

  echo "[11] glyphs filtered for Z"
  beefont_glyphs "$SID" "Z" || true

  echo
  echo "Scenario D finished."
  echo "  SID          = $SID"
  echo "  ZIP_DEFAULT  = $ZIP_DEFAULT"
  echo "  ZIP_ALL      = $ZIP_ALL"
  echo "  TMPPNG       = $TMPPNG"
}

# -------------------------------------------------------------------
# Scenario E – SVG ZIP roundtrip + single SVG upload, svg status
# -------------------------------------------------------------------
# Goals:
#   - hit all SVG ZIP endpoints:
#       * upload_glyphs_zip_svg
#       * download_default_glyphs_zip_svg
#       * download_all_glyphs_zip_svg
#   - hit single SVG upload:
#       * upload_glyph_from_svg
#   - hit svg-aware status endpoints:
#       * job_languages_status(..., svg)
#       * job_language_status(..., svg)
#   - optionally exercise build_ttf(..., svg) (do not treat failure as fatal)
#
# Usage:
#   beefont_demo_scenarioE [NAME] [LANG]
#
# Defaults:
#   NAME = BeeHand_SVG_DEMO
#   LANG = de
beefont_demo_scenarioE() {
  local NAME="${1:-BeeHand_SVG_DEMO}"
  local LANG="${2:-de}"

  echo "# Scenario E: SVG ZIP + single SVG upload + svg status"
  echo "  NAME=${NAME} LANG=${LANG}"

  echo "[1] create job"
  beefont_job_create "$NAME" "$NAME" || return 1
  local SID="${BEEFONT_JOB_SID:?BEEFONT_JOB_SID not set}"
  echo "  SID=$SID"

  echo "[2] prepare small set of SVG glyphs (A, B, C) in tmp dir"
  local TMPDIR="beefont_svg_${SID}"
  mkdir -p "$TMPDIR"
  _beefont_write_dummy_svg "${TMPDIR}/A.svg" "A"
  _beefont_write_dummy_svg "${TMPDIR}/B.svg" "B"
  _beefont_write_dummy_svg "${TMPDIR}/C.svg" "C"

  echo "[3] zip them and upload via SVG ZIP endpoint"
  local ZIP_SVG_IN="${TMPDIR}/abc_svg.zip"
  (cd "$TMPDIR" && zip -q "abc_svg.zip" A.svg B.svg C.svg)
  beefont_upload_glyphs_zip_svg "$SID" "$ZIP_SVG_IN" || return 1

  echo "[4] list glyphs (should now contain A,B,C in SVG)"
  beefont_glyphs "$SID" || true

  echo "[5] download all SVG glyphs ZIP"
  local ZIP_SVG_ALL="beefont_${SID}_all_svg.zip"
  beefont_download_all_glyphs_zip_svg "$SID" "$ZIP_SVG_ALL" || true

  echo "[6] download default SVG glyphs ZIP"
  local ZIP_SVG_DEF="beefont_${SID}_default_svg.zip"
  beefont_download_default_glyphs_zip_svg "$SID" "$ZIP_SVG_DEF" || true

  if command -v unzip >/dev/null 2>&1; then
    echo "  inspecting SVG ZIP contents:"
    unzip -l "$ZIP_SVG_ALL" | head -n 20
  fi

  echo "[7] upload a single SVG glyph for letter 'Z'"
  local SVG_SINGLE="${TMPDIR}/Z.svg"
  _beefont_write_dummy_svg "$SVG_SINGLE" "Z"
  beefont_upload_glyph_from_svg "$SID" "Z" "$SVG_SINGLE" || return 1

  echo "[8] list glyphs filtered for Z"
  beefont_glyphs "$SID" "Z" || true

  echo "[9] language status overview (svg)"
  beefont_languages_status "$SID" svg || true

  echo "[10] language status for ${LANG} (svg)"
  beefont_language_status "$SID" "$LANG" svg || true

  echo "[11] try build_ttf for ${LANG} with svg (failure is allowed here)"
  if beefont_build "$SID" "$LANG" svg; then
    echo "  build_ttf(svg) succeeded."
    echo "[12] list builds"
    beefont_list_builds "$SID" || true
  else
    echo "  build_ttf(svg) failed (expected if alphabet is incomplete or FontForge rejects dummy SVG)."
    beefont_list_builds "$SID" || true
  fi

  echo
  echo "Scenario E finished."
  echo "  SID          = $SID"
  echo "  ZIP_SVG_IN   = $ZIP_SVG_IN"
  echo "  ZIP_SVG_ALL  = $ZIP_SVG_ALL"
  echo "  ZIP_SVG_DEF  = $ZIP_SVG_DEF"
  echo "  SVG_SINGLE   = $SVG_SINGLE"
  echo "  TMPDIR       = $TMPDIR"
}

# -------------------------------------------------------------------
# HELP
# -------------------------------------------------------------------

beefonthelp() {
  cat <<'EOF'
# --- BeeFont V3 testing quick guide -----------------------------------------

Base URL (dev):
  http://localhost:9001/api/beefont

Auth: Demo token via /api/user/auth/demo/start/ (handled by _beefont_token) :
  beefont_newtoken
  

TEMPLATES:
  beefont_templates
  beefont_template_image CODE [mode] [outfile.png] ["LETTERS"]

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
  beefont_page SID PAGE_ID
  beefont_create_page SID TEMPLATE_CODE "LETTERS" scan.png [PAGE_INDEX] [AUTO_ANALYSE]
  beefont_page_delete SID PAGE_ID
  beefont_page_analyse SID PAGE_ID
  beefont_page_retry_analysis SID PAGE_ID

GLYPHS (logical):
  beefont_glyphs SID [LETTER]
  beefont_glyph SID LETTER
  beefont_glyph_select SID LETTER GLYPH_ID
  beefont_glyph_select SID LETTER VARIANT_INDEX --by-variant

GLYPHS PNG:
  beefont_upload_glyph_from_png SID LETTER file.png
  beefont_download_default_glyphs_zip_png SID [outfile.zip]
  beefont_download_all_glyphs_zip_png SID [outfile.zip]
  beefont_upload_glyphs_zip_png SID file.zip

GLYPHS SVG:
  beefont_upload_glyph_from_svg SID LETTER file.svg
  beefont_download_default_glyphs_zip_svg SID [outfile.zip]
  beefont_download_all_glyphs_zip_svg SID [outfile.zip]
  beefont_upload_glyphs_zip_svg SID file.zip

BUILDS:
  beefont_list_builds SID
  beefont_build SID LANGUAGE [FORMAT=png|svg]
  beefont_download_ttf SID LANGUAGE [outfile.ttf]
  beefont_download_zip SID [outfile.zip]

LANGUAGE STATUS:
  beefont_languages_status SID [FORMAT=png|svg]
  beefont_language_status SID LANGUAGE [FORMAT=png|svg]

DEMO FLOWS:
  Scenario A: full PNG flow until READY=true
    beefont_demo_scenarioA [NAME] [LANG] [TEMPLATE_CODE] ["ALPHABET"]

  Scenario B: extend existing job with extra language (PNG)
    beefont_demo_scenarioB SID [LANG] [TEMPLATE_CODE]   # as before

  Scenario C: redraw specific letters on a new page and set as default
    beefont_demo_scenarioC SID [LANG] [TEMPLATE_CODE] ["LETTERS_TO_CHANGE"]

  Scenario D: PNG ZIP roundtrip + single PNG glyph upload
    beefont_demo_scenarioD [NAME] [LANG] [TEMPLATE_CODE]

  Scenario E: SVG ZIP roundtrip + single SVG glyph upload + svg status
    beefont_demo_scenarioE [NAME] [LANG]

EOF
}
