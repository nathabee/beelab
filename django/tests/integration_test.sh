#!/bin/bash
set -e  # Stop on error

#sudo apt update
#sudo apt install jq 

################################################################
# CONSTANT
#################################################################
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m" # No Color
#################################################################
HAS_ERRORS=0
API_URL="http://127.0.0.1:8000/api"
IMAGE_PATH="./media/images/orchard.jpg"
export IGNORE_VOLATILE=true
MODE="default"
#################################################################
SNAPSHOT_DIR="./tests/snapshots/example"
SNAPSHOT_NORMALIZED_DIR="./tests/snapshots/normalized"
NB_IMAGE_LIST_NORMALIZED=3
NB_ESTIMATION_LIST_NORMALIZED=3
#################################################################






echo -e "${GREEN}Integration test.${NC}"


# 🛑 Check if we're in the correct root folder
if [ ! -f "manage.py" ]; then
  echo -e "${RED}❌ ERROR: Please run this script from the Django project root (where manage.py is located)." >&2
  echo "💡 Tip: cd to the root directory (e.g., PomoloBeeDjango) and run:" >&2
  echo "       ./core/tests/integration_workflow.sh" >&2
  exit 1 
fi

command -v jq >/dev/null 2>&1 || { echo >&2 "❌ jq is required but not installed."; exit 1; }




# Optionally: check image exists
if [ ! -f "$IMAGE_PATH" ]; then
  echo -e "${RED}❌ ERROR: Image not found at $IMAGE_PATH" >&2
  exit 1
fi

mkdir -p "$SNAPSHOT_DIR"
mkdir -p "$SNAPSHOT_NORMALIZED_DIR"

# Parse mode flag
if [[ "$1" == "--snapshot" ]]; then
  MODE="snapshot"
  echo "📸 Snapshot generation mode"
elif [[ "$1" == "--nonreg" ]]; then
  MODE="nonreg"
  echo "🔍 Non-regression test mode"
  IMAGE_ID=$(cat "$SNAPSHOT_DIR/image_id.txt")
elif [[ "$1" == "--integ" ]]; then
  MODE="integ"
  echo "🧪 Integration test mode"
else
  echo -e "${RED}❌ ERROR: Invalid parameter '$1'" >&2
  echo -e "${RED}Usage: $0 [--snapshot | --nonreg | --integ]" >&2
  exit 1
fi
 

# Function: normalize response (removes volatile keys)
normalize_json() {
if [ "$IGNORE_VOLATILE" = true ]; then
  jq --sort-keys 'walk(
    if type == "object" then
      with_entries(select(.key | IN("image_id", "estimation_id", "timestamp", "processed_at", "upload_date", "image_url") | not))
    else .
    end
  )'
else
  jq --sort-keys 'walk(if type == "object" then . else . end)'
fi

}


 
# Function: save snapshot (raw + normalized)
save_snapshot() {
  local name="$1"
  local content="$2"
  
  # Save raw (for app team or visual inspection)
  echo "$content" | jq . > "$SNAPSHOT_DIR/${name}.json"

  # Save normalized version (for nonreg test comparison)
  echo "$content" | normalize_json > "$SNAPSHOT_NORMALIZED_DIR/${name}_normalized.json"
}

 
# Function: compare to snapshot (uses normalized version)
compare_snapshot() {
  local name="$1"
  local content="$2"

  expected="$SNAPSHOT_NORMALIZED_DIR/${name}_normalized.json"
  if [ ! -f "$expected" ]; then 
    echo -e "${RED}❌ No normalized snapshot found for $name${NC}" >&2
    return 1
  fi

  diff_output=$(diff -u <(echo "$content" | normalize_json) <(cat "$expected"))
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Regression detected in $name:${NC}" >&2
    echo -e "${RED}$diff_output" >&2
    HAS_ERRORS=1
  else
    echo "${GREEN}✅ $name OK${NC}"
  fi
}




############################################################################


echo "-------------------------------"
echo "🍃 Integration Test: PomoloBee"
echo "-------------------------------"



############################################################################
# 🌱 STEP 0 — Load Static Data
############################################################################
echo "🔹 Step 0: App initializes orchard structure"

echo "📡 GET /fields/"
FIELDS=$(curl -s $API_URL/fields/)

case "$MODE" in
  snapshot)
    save_snapshot "step_00_fields" "$FIELDS"
    ;;
  nonreg)
    compare_snapshot "step_00_fields" "$FIELDS"  || HAS_ERRORS=1
    ;;
  *)
    echo "$FIELDS" | jq .
    ;;
esac

echo "📡 GET /fruits/"
FRUITS=$(curl -s $API_URL/fruits/)

case "$MODE" in
  snapshot)
    save_snapshot "step_00_fruits" "$FRUITS"
    ;;
  nonreg)
    compare_snapshot "step_00_fruits" "$FRUITS"   || HAS_ERRORS=1
    ;;
  *)
    echo "$FRUITS" | jq .
    ;;
esac

echo "📡 GET /locations/"
REQ=$(curl -s $API_URL/locations/)

case "$MODE" in
  snapshot)
    save_snapshot "step_00_locations" "$REQ"
    ;;
  nonreg)
    compare_snapshot "step_00_locations" "$REQ"   || HAS_ERRORS=1
    ;;
  *)
    echo "$REQ" | jq .
    ;;
esac

 


echo "📡 GET /ml/version/"
REQ=$(curl -s $API_URL/ml/version/)

case "$MODE" in
  snapshot)
    save_snapshot "step_00_versions" "$REQ"
    ;;
  nonreg)
    compare_snapshot "step_00_versions" "$REQ"   || HAS_ERRORS=1
    ;;
  *)
    echo "$REQ" | jq .
    ;;
esac 



############################################################################
# 📸 STEP 1 — make manual estimation
############################################################################

echo ""
echo "✍️ Step 1: Manual estimation WITHOUT image with xy_location"

MANUAL_NO_IMAGE=$(curl -s -X POST "$API_URL/manual_estimation/" \
  -F "row_id=1" \
  -F "date=2024-04-15" \
  -F "fruit_plant=9" \
  -F "confidence_score=0.6"\
  -F "xy_location=")

# 🧪 Validate JSON
if ! echo "$MANUAL_NO_IMAGE" | jq -e . >/dev/null 2>&1; then
  echo -e "${RED}❌ Invalid response (not JSON) for manual estimation without image${NC}"
  echo "$MANUAL_NO_IMAGE" > /tmp/manual_no_image_error.html
  echo -e "${RED}🔍 Saved to /tmp/manual_no_image_error.html${NC}"
  exit 1
fi

# ✅ Parse image_id
MANUAL_NO_IMAGE_ID=$(echo "$MANUAL_NO_IMAGE" | jq -r .data.image_id)

if [[ -z "$MANUAL_NO_IMAGE_ID" || "$MANUAL_NO_IMAGE_ID" == "null" ]]; then
  echo -e "${RED}❌ Could not extract image_id from manual estimation without image${NC}"
  echo "$MANUAL_NO_IMAGE" | jq .
  exit 1
fi

echo "✅ Manual estimation without image created with image_id: $MANUAL_NO_IMAGE_ID"

# Save or compare snapshot
if [[ "$MODE" == "snapshot" ]]; then
  save_snapshot "step_01_manual_estimation_no_img" "$MANUAL_NO_IMAGE"
elif [[ "$MODE" == "nonreg" ]]; then
  compare_snapshot "step_01_manual_estimation_no_img" "$MANUAL_NO_IMAGE" || HAS_ERRORS=1
fi

echo ""
echo "✍️ Step 1: Manual estimation WITH image"

MANUAL_WITH_IMAGE=$(curl -s -X POST "$API_URL/manual_estimation/" \
  -F "row_id=1" \
  -F "date=2024-04-15" \
  -F "fruit_plant=8" \
  -F "confidence_score=0.7" \
  -F "image=@$IMAGE_PATH")
MANUAL_NO_IMAGE_ID=$(echo "$MANUAL_NO_IMAGE" | jq .data.image_id)

echo "$MANUAL_WITH_IMAGE" | jq .

MANUAL_IMAGE_ID=$(echo "$MANUAL_WITH_IMAGE" | jq .data.image_id)

if [[ "$MODE" == "snapshot" ]]; then
  save_snapshot "step_01_manual_estimation_with_img" "$MANUAL_WITH_IMAGE"
elif [[ "$MODE" == "nonreg" ]]; then
  compare_snapshot "step_01_manual_estimation_with_img" "$MANUAL_WITH_IMAGE" || HAS_ERRORS=1
fi

# Again, check estimation exists
ESTIMATION=$(curl -s "$API_URL/images/$MANUAL_IMAGE_ID/estimations/")
echo "$ESTIMATION" | jq .



############################################################################
# 📸 STEP 2 — Upload Image  
############################################################################
echo ""
echo "🖼️ Step 2: Uploading image"
UPLOAD_RESPONSE=$(curl -s -F "image=@$IMAGE_PATH" -F "row_id=1" -F "date=2024-03-14" "$API_URL/images/")

# Try to parse JSON
if echo "$UPLOAD_RESPONSE" | jq -e . >/dev/null 2>&1; then
  echo "$UPLOAD_RESPONSE" | jq .

  IMAGE_ID_001=$(echo "$UPLOAD_RESPONSE" | jq .data.image_id)
  if [[ "$IMAGE_ID_001" == "null" || -z "$IMAGE_ID_001" ]]; then
    echo "❌ Failed to get image ID from JSON. Aborting."
    exit 1
  fi
else
  echo -e "${RED}⚠️ Warning: Response is not valid JSON:" >&2
  echo -e "${RED}$UPLOAD_RESPONSE" >&2
  echo -e "${RED}❌ Cannot extract image ID. Aborting." >&2
  exit 1 
fi

echo "✅ Image uploaded with ID: $IMAGE_ID_001"




############################################################################
# 🧠 STEP 3 - Wait for ML (mock delay or real)
############################################################################
echo ""
echo "⏳ Step 3 END : Waiting for ML to process (4s delay)"
sleep 4

# You can skip this if ML is already responding for real during the test
# echo ""
# echo "🧠 Step 3: Simulating ML result (for manual test)"
# ML_RESPONSE=$(curl -s -X POST "$API_URL/images/$IMAGE_ID/ml_result" \
#   -H "Content-Type: application/json" \
#   -d '{"nb_fruit": 10, "confidence_score": 0.95}')



############################################################################
# 🔍 STEP 4 — Poll for status
############################################################################
echo ""
echo "🔁 Step 4 : Polling image metadata for image ${IMAGE_ID_001}"
IMAGE_META=$(curl -s "$API_URL/images/$IMAGE_ID_001/details/")

case "$MODE" in
  snapshot)
    save_snapshot "step_02_image_details" "$IMAGE_META"
    ;;
  nonreg)
    compare_snapshot "step_02_image_details" "$IMAGE_META"  || HAS_ERRORS=1 
    ;;
  *)
    echo "$IMAGE_META" | jq .
    ;;
esac

PROCESSED=$(echo "$IMAGE_META" | jq .data.processed)
if [ "$PROCESSED" != "true" ]; then
  echo ""
  echo "🔁 Retrying processing (optional fallback)"
  RETRY=$(curl -s -X POST "$API_URL/retry_processing/" \
    -H "Content-Type: application/json" \
    -d "{\"image_id\": $IMAGE_ID}")
  
  echo "$RETRY" | jq .

  if [[ "$MODE" == "snapshot" ]]; then
    save_snapshot "step_02_retry_response" "$RETRY"
  elif [[ "$MODE" == "nonreg" ]]; then
    compare_snapshot "step_02_retry_response" "$RETRY"  || HAS_ERRORS=1
  fi
fi




############################################################################
# 📊 STEP 4 — Fetch Estimation for image
############################################################################
echo ""
echo "📈 Step 4: Getting Estimation for image ${IMAGE_ID_001}"
ESTIMATION=$(curl -s "$API_URL/images/$IMAGE_ID_001/estimations/")

case "$MODE" in
  snapshot)
    save_snapshot "step_04_estimation" "$ESTIMATION"
    ;;
  nonreg)
    compare_snapshot "step_04_estimation" "$ESTIMATION"  || HAS_ERRORS=1
    ;;
  *)
    echo "$ESTIMATION" | jq .
    ;;
esac
 

 
############################################################################
# 📸 STEP 5 — Upload 3 Images and test image list
############################################################################
echo ""
echo "🖼️ Step 5: Uploading 3 images"

declare -a IMAGE_IDS=()

IMAGE_IDS=()
for ROW_ID in 1 15 25; do
  echo "🔹 Uploading image for row_id=$ROW_ID"
  UPLOAD_RESPONSE=$(curl -s -F "image=@$IMAGE_PATH" -F "row_id=$ROW_ID" -F "date=2024-03-14" -F "user_fruit_plant=105" "$API_URL/images/")
  
  IMAGE_ID=$(echo "$UPLOAD_RESPONSE" | jq .data.image_id)
  if [[ "$IMAGE_ID" == "null" || -z "$IMAGE_ID" ]]; then
    echo -e "${RED}❌ Could not upload image for row_id=$ROW_ID${NC}"
    exit 1
  fi

  echo "✅ Uploaded image ID: $IMAGE_ID"
  IMAGE_IDS+=($IMAGE_ID)

# Let ML process at least 2 of them
  # 👇 Insert delay after uploading image for row_id=15
  if [[ "$ROW_ID" == "15" ]]; then
    echo "⏳ Sleeping 4s to allow ML time to process first two images..."
    sleep 4
  fi
done


for IMAGE_ID in "${IMAGE_IDS[@]}"; do
  echo "📈 Checking estimation for image $IMAGE_ID"
  IMAGE_ESTIMATION=$(curl -s "$API_URL/images/$IMAGE_ID/estimations/")
  echo "$IMAGE_ESTIMATION" | jq .

  # JUST FOR DEBUG...WE DO NOT NEED WHEN IT WORKS
  #if [[ "$MODE" == "snapshot" ]]; then
  #  save_snapshot "step_05_image_${IMAGE_ID}_estimation" "$IMAGE_ESTIMATION"
  #elif [[ "$MODE" == "nonreg" ]]; then
  #  compare_snapshot "step_05_image_${IMAGE_ID}_estimation" "$IMAGE_ESTIMATION" || HAS_ERRORS=1
  #fi
done


# 📂 STEP 5 — Get image list
echo ""
echo "📂 Step 5: Listing all images"
IMAGE_LIST_RAW=$(curl -s "$API_URL/images/list/")

# Extract just the last NB_IMAGE_LIST_NORMALIZED processed images (ordered by processed_at DESC)
 
IMAGE_LIST_TOP=$(echo "$IMAGE_LIST_RAW" | jq --argjson N "$NB_IMAGE_LIST_NORMALIZED" '
  {
    status,
    data: {
      images: (
        .data.images
        | map(select(.processed == true))
        | sort_by(.processed_at)
        | reverse
        | .[0:$N]
      )
    }
  }
')




case "$MODE" in
  snapshot)
    save_snapshot "step_05_image_list" "$IMAGE_LIST_RAW"
    echo "$IMAGE_LIST_TOP" | normalize_json > "$SNAPSHOT_NORMALIZED_DIR/step_05_image_list_normalized.json"
    ;;
  nonreg)
    compare_snapshot "step_05_image_list" "$IMAGE_LIST_TOP" || HAS_ERRORS=1
    ;;
  *)
    echo "$IMAGE_LIST_RAW" | jq .
    ;;
esac

 
############################################################################
# 🗂️ STEP 6 — Get Estimation History for Field
############################################################################
echo ""
echo "📚 Step 6: Getting field estimation history"
FIELD_ID=1
FIELD_HISTORY_RAW=$(curl -s "$API_URL/fields/$FIELD_ID/estimations/")

# Full data (for visual inspection)
FIELD_HISTORY_ALL=$(echo "$FIELD_HISTORY_RAW" | jq '{status, data: {estimations: .data.estimations}}')

# Most recent 3 estimations (normalized version)
FIELD_HISTORY_TOP=$(echo "$FIELD_HISTORY_ALL" | jq --argjson N "$NB_ESTIMATION_LIST_NORMALIZED" '
  {
    status,
    data: {
      estimations: (
        .data.estimations
        | sort_by(.timestamp)
        | reverse
        | .[0:$N]
      )
    }
  }
')


case "$MODE" in
  snapshot)
    save_snapshot "step_06_field_estimations" "$FIELD_HISTORY_ALL"
    # Normalized file will only contain top 3
    echo "$FIELD_HISTORY_TOP" | normalize_json > "$SNAPSHOT_NORMALIZED_DIR/step_06_field_estimations_normalized.json"
    ;;
  nonreg)
    compare_snapshot "step_06_field_estimations" "$FIELD_HISTORY_TOP" || HAS_ERRORS=1
    ;;
  *)
    echo "$FIELD_HISTORY_ALL" | jq .
    ;;
esac




############################################################################
# ♻️ STEP 7 - OPTIONAL: Retry if not processed
############################################################################
if [ "$PROCESSED" != "true" ]; then
  echo ""
  echo "🔁 Retrying processing (optional fallback)"
  curl -s -X POST "$API_URL/retry_processing/" \
    -H "Content-Type: application/json" \
    -d "{\"image_id\": $IMAGE_ID_001}" | jq .
fi


if [ "$MODE" == "snapshot" ]; then
  echo "$IMAGE_ID_001" > "$SNAPSHOT_DIR/image_id.txt"
fi

 
############################################################################
# 🗑️ STEP 7 — Delete the Image
############################################################################
echo ""
echo "🗑️ Step 7: Deleting the uploaded image"
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/images/$IMAGE_ID_001/")


if ! echo "$DELETE_RESPONSE" | jq -e . >/dev/null 2>&1; then
  echo "$DELETE_RESPONSE" > /tmp/delete_debug.html
  echo -e "${RED}⚠️ Response is not valid JSON. Saved to /tmp/delete_debug.html${NC}"
fi



case "$MODE" in
  snapshot)
    save_snapshot "step_07_delete_response" "$DELETE_RESPONSE"
    ;;
  nonreg)
    compare_snapshot "step_07_delete_response" "$DELETE_RESPONSE" || HAS_ERRORS=1
    ;;
  *)
    if echo "$DELETE_RESPONSE" | jq -e . >/dev/null 2>&1; then
      echo "$DELETE_RESPONSE" | jq .
    else
      echo "$DELETE_RESPONSE"
    fi
    ;;
esac


# 🔍 Verify image deletion
echo ""
echo "🔍 Verifying deletion (should error or show missing):"
DELETE_VERIFY=$(curl -s "$API_URL/images/$IMAGE_ID_001/details/")

if echo "$DELETE_VERIFY" | jq -e . >/dev/null 2>&1; then
  echo "$DELETE_VERIFY" | jq .
else
  echo "$DELETE_VERIFY"
fi

############################################################################
# 🧠 STEP 8 — Simulate ML Result on Non-Existing Image
############################################################################
echo ""
echo "🧠 Step 8: Simulating ML result on a non-existing image (should fail)"
HTTP_STATUS=$(curl -s -o /tmp/ml_invalid_resp.json -w "%{http_code}" -X POST "$API_URL/images/999999/ml_result/" \
  -H "Content-Type: application/json" \
  -d '{"nb_fruit": 10, "confidence_score": 0.95, "processed": true}')

INVALID_ML_RESPONSE=$(cat /tmp/ml_invalid_resp.json)

# Combine response + status code into one JSON object
COMBINED_ML_RESULT=$(jq -n \
  --arg status "$HTTP_STATUS" \
  --argjson response "$(echo "$INVALID_ML_RESPONSE" | jq . 2>/dev/null)" \
  '{http_status: $status|tonumber, response: $response}' 2>/dev/null || \
  echo "{\"http_status\": $HTTP_STATUS, \"response\": \"$INVALID_ML_RESPONSE\"}")

case "$MODE" in
  snapshot)
    save_snapshot "step_08_invalid_ml_result" "$COMBINED_ML_RESULT"
    #echo "$COMBINED_ML_RESULT" | jq . > "$SNAPSHOT_DIR/step_08_invalid_ml_result.json"
    ;;
  nonreg)
    compare_snapshot "step_08_invalid_ml_result" "$COMBINED_ML_RESULT" || HAS_ERRORS=1
    ;;
  *)
    if echo "$COMBINED_ML_RESULT" | jq -e . >/dev/null 2>&1; then
      echo "$COMBINED_ML_RESULT" | jq .
    else
      echo "$COMBINED_ML_RESULT"
    fi
    ;;
esac




############################################################################
# 🗑️ STEP LAST   — Clean up uploaded images
echo ""
echo "🗑️ Step LAST : Cleaning up uploaded test images"

for ID in "${IMAGE_IDS[@]}"; do
  DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/images/$ID/")
  if ! echo "$DELETE_RESPONSE" | jq -e . >/dev/null 2>&1; then
    echo "$DELETE_RESPONSE" > /tmp/delete_debug_$ID.html
    echo -e "${RED}⚠️ Invalid JSON for delete response of image $ID${NC}"
  else
    echo "🧹 Deleted image $ID"
  fi
done


############################################################################
 

echo ""
echo -e "ℹ️  To update snapshots after legitimate changes, run:"
echo -e "   ${GREEN}$0 --snapshot${NC}"
echo ""


if [ "$MODE" == "nonreg" ]; then
  if [ "$HAS_ERRORS" -eq 1 ]; then
    echo -e "${RED}❌ Non-regression test failed due to detected differences.${NC}" >&2
    exit 1
  else
    echo -e "${GREEN}✅ No regression detected. All API responses are consistent.${NC}"
  fi
else 
  echo -e "$✅ Full integration test completed."
  echo -e "Run the script to check that there is no regression."
  echo -e "$0 --nonreg"
fi

