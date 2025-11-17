# scripts/alias_beefont.sh
# BeeFont  aliases (REST helpers for the new multi-page / slots / glyphs API)
# Assumes scripts/alias.sh has already been sourced (for _BEELAB_ROOT etc.)

# -------------------------
# Base URL + token helpers
# -------------------------

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

  # Optional: export if you still want it visible, but the function
  # does NOT reuse it; every call is fresh.
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
  # delete ALL BeeFont jobs known to the API
  beefont_jobs \
    | jq -r '.results[].sid' \
    | while read -r SID; do
        if [ -n "$SID" ]; then
          echo "Deleting job $SID..."
          beefont_job_delete "$SID"
        fi
      done


}

# -------------------------
# Template catalogue
# -------------------------

# List templates (optionally by language)
# Usage: beefont_templates [DE|EN|FR...]
beefont_templates() {
  local LANG="${1:-}"
  local URL="$(_beefont_base)/templates"
  [[ -n "$LANG" ]] && URL="${URL}?lang=${LANG}"

  _beefont_curl_auth "$URL" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Download template image (blank|blankpure|prefill)
# Usage: beefont_template_image NAME [blank|blankpure|prefill] [outfile.png]
beefont_template_image() {
  local NAME="${1:?template name missing}"
  local MODE="${2:-blank}"
  local OUT="${3:-template.png}"
  local URL="$(_beefont_base)/templates/${NAME}/image?mode=${MODE}"

  curl -fSs -H 'Accept: image/png' "$URL" -o "$OUT" || {
    echo "BeeFont : download failed for $URL" >&2
    return 1
  }

  # basic PNG sanity check
  if head -c 8 "$OUT" | xxd -p -c8 2>/dev/null | grep -qi '^89504e470d0a1a0a$'; then
    echo "saved → $OUT"
  else
    echo "warning: $OUT is not a PNG header, server may have returned HTML" >&2
    file "$OUT" 2>/dev/null || true
    return 1
  fi
}

# -------------------------
# Jobs ()
# -------------------------

# List jobs
# Usage: beefont_jobs
beefont_jobs() {
  _beefont_curl_auth "$(_beefont_base)/jobs" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Create a job (metadata only)
# Usage:
#   beefont_job_create FAMILY LANGUAGE PAGE_FORMAT "CHARACTERS"
# Example:
#   beefont_job_create BeeHand_ DE A4 "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß"
beefont_job_create() {
  local FAMILY="${1:?family missing}"
  local LANG="${2:-DE}"
  local FORMAT="${3:-A4}"
  local CHARS="${4:-}"

  if [[ -z "$CHARS" ]]; then
    echo "Usage: beefont_job_create FAMILY LANGUAGE PAGE_FORMAT \"CHARACTERS\"" >&2
    return 1
  fi

  local TOKEN JSON
  TOKEN="$(_beefont_token)" || return 1

  # Build proper JSON (all values as strings)
  JSON=$(printf '{"family":"%s","language":"%s","page_format":"%s","characters":"%s"}' \
    "$FAMILY" "$LANG" "$FORMAT" "$CHARS")

  # Optional: debug
  # echo "DEBUG JSON: $JSON" >&2

  local RESP
  RESP=$(curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON" \
    "$(_beefont_base)/jobs") || {
      echo "BeeFont : job create request failed" >&2
      echo "Raw response (curl failed):" >&2
      printf '%s\n' "$RESP" >&2
      return 1
    }

  # Debug: show what we sent
  # echo "DEBUG JSON: $JSON" >&2

  # Only pipe to jq if this *looks* like JSON
  if command -v jq >/dev/null 2>&1 && [[ "$RESP" == \{* || "$RESP" == \[* ]]; then
    echo "$RESP" | jq .
  else
    echo "$RESP"
  fi


  # export SID for convenience
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
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Delete job
# Usage: beefont_job_delete SID
beefont_job_delete() {
  local SID="${1:?sid missing}"
  local TOKEN
  TOKEN="$(_beefont_token)" || return 1
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------
# Template slots (pages)
# -------------------------

# List slots for a job
# Usage: beefont_slots SID
beefont_slots() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/slots" | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Upload scan for a slot
# Usage: beefont_slot_upload SLOT_ID path/to/scan.png
beefont_slot_upload() {
  local SLOT_ID="${1:?slot_id missing}"
  local IMG="${2:?image path missing}"
  [[ -f "$IMG" ]] || { echo "file not found: $IMG" >&2; return 1; }

  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@${IMG}" \
    "$(_beefont_base)/slots/${SLOT_ID}/upload-scan" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Analyse slot
# Usage: beefont_slot_analyse SLOT_ID
beefont_slot_analyse() {
  local SLOT_ID="${1:?slot_id missing}"
  _beefont_curl_auth -X POST "$(_beefont_base)/slots/${SLOT_ID}/analyse" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Retry slot (new page_index)
# Usage: beefont_slot_retry SLOT_ID
beefont_slot_retry() {
  local SLOT_ID="${1:?slot_id missing}"
  _beefont_curl_auth -X POST "$(_beefont_base)/slots/${SLOT_ID}/retry" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------
# Glyphs (variants + selection)
# -------------------------

# List glyphs (canonical + variants) for a job
# Usage: beefont_glyphs SID
beefont_glyphs() {
  local SID="${1:?sid missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/glyphs" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Detail for one letter
# Usage: beefont_glyph SID LETTER
beefont_glyph() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  _beefont_curl_auth "$(_beefont_base)/jobs/${SID}/glyphs/${LETTER}" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# Select variant as canonical for a letter
# Usage: beefont_select SID LETTER PAGE_INDEX [--delete-others]
beefont_select() {
  local SID="${1:?sid missing}"
  local LETTER="${2:?letter missing}"
  local PAGE_INDEX="${3:?page_index missing}"
  local DELETE_OTHERS="false"
  [[ "${4:-}" == "--delete-others" ]] && DELETE_OTHERS="true"

  local TOKEN JSON
  TOKEN="$(_beefont_token)" || return 1
  JSON=$(printf '{"page_index":%s,"delete_others":%s}' "$PAGE_INDEX" "$DELETE_OTHERS")

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON" \
    "$(_beefont_base)/jobs/${SID}/glyphs/${LETTER}/select" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}

# -------------------------
# Font build + download
# -------------------------

# Trigger TTF build (job must have canonical glyphs for all required chars)
# Usage: beefont_build SID
beefont_build() {
  local SID="${1:?sid missing}"
  local TOKEN
  TOKEN="$(_beefont_token)" || return 1

  curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$(_beefont_base)/jobs/${SID}/build-ttf" \
    | (command -v jq >/dev/null 2>&1 && jq . || cat)
}


# Download TTF
# Usage: beefont_download_ttf SID [outfile.ttf]
beefont_download_ttf() {
  local SID="${1:?sid missing}"
  local OUT="${2:-beefont_v2.ttf}"
  curl -fSL -o "$OUT" "$(_beefont_base)/jobs/${SID}/download/ttf" \
    && echo "saved → $OUT"
}

# Download ZIP
# Usage: beefont_download_zip SID [outfile.zip]
beefont_download_zip() {
  local SID="${1:?sid missing}"
  local OUT="${2:-beefont_v2_bundle.zip}"
  curl -fSL -o "$OUT" "$(_beefont_base)/jobs/${SID}/download/zip" \
    && echo "saved → $OUT"
}

# -------------------------
# High-level demo helper
# -------------------------
# Example end-to-end flow (shell-driven), minimal:
#
# 1) create a job
# 2) list slots
# 3) upload + analyse first slot
# 4) list glyphs
# (you still need to manually select best variants and call beefont_build)
#
# Usage:
#   beefont_demo_simple path/to/scan.png
beefont_demo_simple() {
  local IMG="${1:?path to scan missing}"
  [[ -f "$IMG" ]] || { echo "file not found: $IMG" >&2; return 1; }

  echo "[1] creating job (DE, A4, A–Z)"
  beefont_job_create BeeHand_ DE A4 "ABCDEFGHIJKLMNOPQRSTUVWXYZ" || return 1
  local SID="${BEEFONT_JOB_SID:?BEEFONT_JOB_SID not set}"

  echo "[2] listing slots"
  beefont_slots "$SID" || return 1

  # naive: pick first slot id via jq
  local SLOT_ID
  if command -v jq >/dev/null 2>&1; then
    SLOT_ID="$(beefont_slots "$SID" | jq -r '.results[0].id // empty')"
  else
    echo "You need jq installed to auto-pick slot id in beefont_demo_simple" >&2
    return 1
  fi
  [[ -n "$SLOT_ID" ]] || { echo "no slot id found" >&2; return 1; }

  echo "[3] upload + analyse slot $SLOT_ID"
  beefont_slot_upload "$SLOT_ID" "$IMG" || return 1
  beefont_slot_analyse "$SLOT_ID" || return 1

  echo "[4] list glyphs"
  beefont_glyphs "$SID" || return 1

  echo
  echo "Now:"
  echo "  - inspect variants via beefont_glyph $SID LETTER"
  echo "  - select best per letter via beefont_select $SID LETTER PAGE_INDEX"
  echo "  - build font via beefont_build $SID"
  echo "  - download via beefont_download_ttf $SID"
}
# One-shot DE demo for BeeFont
#  - fetch DE template list
#  - download prefilled + blank grids for A4_DE_6x5_1/2/3
#  - create a job with A–Z (for now)
#  - upload prefills as "scans" for each slot and analyse
#  - auto-select first variant for each letter A–Z
#  - build font + download TTF & ZIP
# Usage:
#   beefont_demo_de [BeeHand_DE]
beefont_demo_de() {
  local FAMILY="${1:-BeeHand_DE}"

  # For now, demo only auto-selects A–Z.
  # The templates also contain digits/symbols, but the job only
  # requires these 26 chars in this smoke test.
  local CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZ"

  # Template codes for the 3 DE pages
  local TPL1="A4_DE_6x5_1"
  local TPL2="A4_DE_6x5_2"
  local TPL3="A4_DE_6x5_3"

  mkdir -p django/media/beefont/uploads django/media/beefont/builds django/media/beefont/downloads 

  # ensure token cached for the session
  _beefont_token >/dev/null || { echo "failed to get token"; return 1; }

  echo "#1 list DE templates"
  beefont_templates DE || return 1

  # ------------------------------------------------------------------
  # 2) Download prefills + blankpure for all three pages
  # ------------------------------------------------------------------
  local PREF1="django/media/beefont/uploads/prefill_${TPL1}.png"
  local PREF2="django/media/beefont/uploads/prefill_${TPL2}.png"
  local PREF3="django/media/beefont/uploads/prefill_${TPL3}.png"

  echo "#2-a fetch prefilled templates"
  beefont_template_image "$TPL1" prefill "$PREF1" || return 1
  beefont_template_image "$TPL2" prefill "$PREF2" || return 1
  beefont_template_image "$TPL3" prefill "$PREF3" || return 1

  echo "#2-b fetch blankpure templates (for printing if needed)"
  beefont_template_image "$TPL1" blankpure "django/media/beefont/uploads/blank_${TPL1}.png" || return 1
  beefont_template_image "$TPL2" blankpure "django/media/beefont/uploads/blank_${TPL2}.png" || return 1
  beefont_template_image "$TPL3" blankpure "django/media/beefont/uploads/blank_${TPL3}.png" || return 1

  # ------------------------------------------------------------------
  # 3) Create job (for now: only A–Z as required charset)
  # ------------------------------------------------------------------
  echo "#3 create job (family=$FAMILY, language=DE, page_format=A4, chars=$CHARS)"
  beefont_job_create "$FAMILY" "DE" "A4" "$CHARS" || return 1
  local SID="${BEEFONT_JOB_SID:?BEEFONT_JOB_SID not set}"
  echo "SID=$SID"

  # ------------------------------------------------------------------
  # 4) List slots for job
  # ------------------------------------------------------------------
  echo "#4 list slots for job"
  local SLOTS_JSON
  SLOTS_JSON="$(_beefont_curl_auth "$(_beefont_base)/jobs/${SID}/slots")" || return 1
  if command -v jq >/dev/null 2>&1; then
    echo "$SLOTS_JSON" | jq .
  else
    echo "$SLOTS_JSON"
  fi

  # ------------------------------------------------------------------
  # 5-a) Upload prefills to the matching slots and analyse them
  # ------------------------------------------------------------------
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required to map slots to template_code in beefont_demo_de" >&2
    return 1
  fi

  # Extract slot id + template_code pairs
  local SLOT_COUNT
  SLOT_COUNT="$(echo "$SLOTS_JSON" | jq '.results | length')" || SLOT_COUNT=0
  if [[ "$SLOT_COUNT" -eq 0 ]]; then
    echo "no slots found for job $SID" >&2
    return 1
  fi

  echo "#5 upload prefills + analyse"
  local idx slot_id tpl scan
  for (( idx=0; idx< SLOTS_COUNT; idx++ )); do :; done
  # the above is a placeholder to avoid typo; we actually compute again:
  for (( idx=0; idx< SLOT_COUNT; idx++ )); do
    slot_id="$(echo "$SLOTS_JSON" | jq -r ".results[$idx].id")"
    tpl="$(echo "$SLOTS_JSON" | jq -r ".results[$idx].template_code")"

    case "$tpl" in
      "$TPL1") scan="$PREF1" ;;
      "$TPL2") scan="$PREF2" ;;
      "$TPL3") scan="$PREF3" ;;
      *)
        echo "  slot $slot_id: unknown template_code '$tpl', skipping" >&2
        continue
        ;;
    esac

    echo "  slot $slot_id (template=$tpl) ← $scan"
    beefont_slot_upload "$slot_id" "$scan" || { echo "upload failed for slot $slot_id" >&2; continue; }
    beefont_slot_analyse "$slot_id" || { echo "analyse failed for slot $slot_id" >&2; continue; }
  done


  # ------------------------------------------------------------------
  # 5-b) Simulate a second scan for each slot (page_index=1)
  #      This will create variants like A_1.png, B_1.png, ...
  # ------------------------------------------------------------------
  echo "#5-b retry slots to simulate second scans (page_index=1)"

  for (( idx=0; idx< SLOT_COUNT; idx++ )); do
    slot_id="$(echo "$SLOTS_JSON" | jq -r ".results[$idx].id")"
    tpl="$(echo "$SLOTS_JSON" | jq -r ".results[$idx].template_code")"

    case "$tpl" in
      "$TPL1") scan="$PREF1" ;;
      "$TPL2") scan="$PREF2" ;;
      "$TPL3") scan="$PREF3" ;;
      *)
        echo "  slot $slot_id: unknown template_code '$tpl' on retry, skipping" >&2
        continue
        ;;
    esac

    echo "  slot $slot_id (template=$tpl): retry → page_index+1"
    beefont_slot_retry "$slot_id" || {
      echo "    retry failed for slot $slot_id" >&2
      continue
    }

    echo "  slot $slot_id (template=$tpl) second scan ← $scan"
    beefont_slot_upload "$slot_id" "$scan" || {
      echo "    second upload failed for slot $slot_id" >&2
      continue
    }
    beefont_slot_analyse "$slot_id" || {
      echo "    second analyse failed for slot $slot_id" >&2
      continue
    }
  done


  # ------------------------------------------------------------------
  # 6) Inspect glyphs
  # ------------------------------------------------------------------
  echo "#6 list glyphs before selection"
  beefont_glyphs "$SID" || true

  # ------------------------------------------------------------------
  # 7) Auto-select first available variant for A–Z
  # ------------------------------------------------------------------
  echo "#7 auto-select variants for some letter (A–Z), preferring *_1.png"
  local i ch GLYPH_JSON fname pgidx
  #for (( i=0; i<${#CHARS}; i++ )); do
  for (( i=0; i<3; i++ )); do
    ch="${CHARS:i:1}"
    GLYPH_JSON="$(_beefont_curl_auth "$(_beefont_base)/jobs/${SID}/glyphs/${ch}")" || {
      echo "  $ch: glyph endpoint failed" >&2
      continue
    }

    # Try to pick a variant ending in "_1.png" (second scan)
    fname="$(echo "$GLYPH_JSON" \
      | jq -r '.variants[]? | select(endswith("_1.png"))' \
      | head -n 1)"

    # Fallback: first variant if no *_1.png exists
    if [[ -z "$fname" || "$fname" == "null" ]]; then
      fname="$(echo "$GLYPH_JSON" | jq -r '.variants[0] // empty')"
    fi

    if [[ -z "$fname" || "$fname" == "null" ]]; then
      echo "  $ch: no variants at all"
      continue
    fi

    # fname like "A_1.png" → extract page_index=1
    pgidx="${fname#*_}"    # "1.png"
    pgidx="${pgidx%.png}"  # "1"
    echo "  $ch: selecting variant $fname (page_index=$pgidx)"
    beefont_select "$SID" "$ch" "$pgidx" --delete-others >/dev/null 2>&1 || {
      echo "    selection failed for $ch" >&2
    }
  done


  # ------------------------------------------------------------------
  # 8) Build font + download
  # ------------------------------------------------------------------
  echo "#8 build TTF"
  beefont_build "$SID" || return 1

  echo "#9 download artifacts"
  local TTF_OUT="django/media/beefont/downloads/${FAMILY}.ttf"
  local ZIP_OUT="django/media/beefont/downloads/${SID}_bundle.zip"
  beefont_download_ttf "$SID" "$TTF_OUT" || true
  beefont_download_zip "$SID" "$ZIP_OUT" || true

  echo "#10 inspect font (optional)"
  beefont_inspectfont "${FAMILY}" || true

  echo "Done. SID=$SID"
  echo "TTF: $TTF_OUT"
  echo "ZIP: $ZIP_OUT"
}

beefont_inspectfont() {
  local FONTNAME="${1:?Font name missing}"
  dcdjango python BeeFontCore/services/inspect_font.py \
    "/app/media/beefont/downloads/${FONTNAME}.ttf"
}

beefont_desinstall() {

rm ~/.local/share/fonts/BeeHandDE.ttf 2>/dev/null
rm ~/.fonts/BeeHandDE.ttf 2>/dev/null


}
# -------------------------------------------------------------------
# HELP DCBF (BeeFont )
# -------------------------------------------------------------------
beefonthelp() {
  cat <<'EOF'
# --- BeeFont  testing quick guide -----------------------------------------

Concepts ():
- Job         : one font project (family, language, page_format, characters)
- TemplateSlot: one template sheet (e.g. DE_A4_1) with a page_index (attempt)
- Glyph       : per letter, multiple variant PNGs (LETTER_pageIndex.png) and
                one canonical PNG (LETTER.png) used for TTF.

Important URLs (dev):
- Base:   http://localhost:9001/api/beefont
- Auth:   http://localhost:9001/api/user/auth/demo/start/

Prereqs:
- Django stack up (dcdjup)
- jq installed (for most helpers)

 

-------------------------------------------------------------------------------
# 2) Template catalogue ( REST)

# List DE templates:
  beefont_templates DE

# Download a template PNG (blank, blankpure, prefill):
  beefont_template_image A4_DE_6x5_1 blank \
    django/media/beefont/uploads/blank_DE.png

  beefont_template_image A4_DE_6x5_1 prefill \
    django/media/beefont/uploads/prefill_DE.png

-------------------------------------------------------------------------------
# 3) Manual  flow (low level)

# 3.1 Create a job (A–Z)
  beefont_job_create BeeHand_ DE A4 "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  # → exports BEEFONT_JOB_SID

# 3.2 Inspect job and slots
  beefont_job "$BEEFONT_JOB_SID"
  beefont_slots "$BEEFONT_JOB_SID"

# 3.3 Upload and analyse a slot
  beefont_slot_upload SLOT_ID path/to/scan.png
  beefont_slot_analyse SLOT_ID

# 3.4 Inspect glyphs
  beefont_glyphs "$BEEFONT_JOB_SID"
  beefont_glyph "$BEEFONT_JOB_SID" A

# 3.5 Select the best variant per letter
  beefont_select "$BEEFONT_JOB_SID" A 0 --delete-others
  beefont_select "$BEEFONT_JOB_SID" B 0 --delete-others
  # etc. (page_index from variant filename, e.g. A_0.png → 0)

# 3.6 Build font and download
  beefont_build "$BEEFONT_JOB_SID"
  beefont_download_ttf "$BEEFONT_JOB_SID" django/media/beefont/builds/BeeHand_.ttf
  beefont_download_zip "$BEEFONT_JOB_SID" django/media/beefont/builds/${BEEFONT_JOB_SID}__bundle.zip

-------------------------------------------------------------------------------
# 4) Minimal raw curl (manual, no aliases)

TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ \
  | python -c 'import sys,json;print(json.load(sys.stdin)["access"])')

curl -sS -H "Authorization: Bearer $TOKEN" \
  'http://localhost:9001/api/beefont/templates?lang=DE' | jq .

curl -sS -o blank.png \
  'http://localhost:9001/api/beefont/templates/A4_DE_6x5_1/image?mode=blank'

curl -sS -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"family":"BeeHand_","language":"DE","page_format":"A4","characters":"ABCDEFGHIJKLMNOPQRSTUVWXYZ"}' \
  http://localhost:9001/api/beefont/jobs | jq .

# Then use /jobs/<sid>/slots, /slots/<id>/upload-scan, /slots/<id>/analyse,
# /jobs/<sid>/glyphs, /jobs/<sid>/glyphs/<letter>/select, /jobs/<sid>/build-ttf,
# /jobs/<sid>/download/ttf, /jobs/<sid>/download/zip.

-------------------------------------------------------------------------------
Notes / Troubleshooting ():

- If analysis fails on a slot, check the processed image path and logs in TemplateSlot.
- Make sure all four fiducials are visible and the template matches the JSON layout.
-  no longer does "upload one image → instant font". You must:
    Job → Slots (pages) → Analyse → Glyph selection → Build font.
- Auto-selection in beefont_demo_de is intentionally naive and only supports A–Z.
  For DE/FR special chars, use beefont_glyph + beefont_select manually.

dcdjango python BeeFontCore/services/inspect_font.py \
  /app/media/beefont/builds/BeeHand_DE_.ttf A B C germandbls


 ------------------------------------------------------------------------------- 
# 5) One-shot DE demo (V2)

# This demo does not need a real scan. It uses the prefilled templates
# themselves as input "scans" to smoke-test the full V2 pipeline.

  beefont_demo_de BeeHand_DE

Internally this will:
  1) List DE templates via /templates?lang=DE
  2) Download prefilled and blankpure templates for:
       - A4_DE_6x5_1
       - A4_DE_6x5_2
       - A4_DE_6x5_3
     and save them under django/media/beefont/uploads/.
     The prefilled PNGs are later reused as fake scans.

  3) Create a BeeFont job with:
       family      = BeeHand_DE (or the name you passed)
       language    = DE
       page_format = A4
       characters  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
     This exports BEEFONT_JOB_SID.

  4) Fetch all TemplateSlots for that job via /jobs/<sid>/slots.
     Each slot is bound to a template_code: A4_DE_6x5_1/2/3.

  5) For each slot:
       - Find the matching prefilled PNG:
           A4_DE_6x5_1 → prefill_A4_DE_6x5_1.png
           A4_DE_6x5_2 → prefill_A4_DE_6x5_2.png
           A4_DE_6x5_3 → prefill_A4_DE_6x5_3.png
       - Upload the PNG to /slots/<id>/upload-scan
       - Call /slots/<id>/analyse to run fiducials + segmentation

  6) Call /jobs/<sid>/glyphs to list all glyphs and their variants.

  7) For each letter A–Z:
       - Call /jobs/<sid>/glyphs/<LETTER>
       - Take the first variant filename (for example A_0.png)
       - Extract page_index from the filename (0 in this example)
       - Call /jobs/<sid>/glyphs/<LETTER>/select with that page_index
         and delete_others=true, so LETTER.png becomes canonical.

  8) Trigger TTF build with /jobs/<sid>/build-ttf.

  9) Download the artifacts into django/media/beefont/builds/:
       - <family>_.ttf
       - <sid>__bundle.zip

 10) Optionally run:
       beefont_inspectfont <family>_
     to inspect the generated TTF inside the Django container.

After this, you have a complete V2 flow:
  Job → Slots (3 pages) → Analysis → Glyph selection → Font build.




EOF
}
