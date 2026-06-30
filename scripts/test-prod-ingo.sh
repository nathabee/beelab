#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://beelab-api.nathabee.de"
TENANT="ingo"
CLIENT_ID="ingo-client"
CLIENT_SECRET="ingo-secret"

TOKEN="$(
  curl -sS -X POST "$BASE_URL/api/GetToken/$TENANT" \
    -H "Content-Type: application/json" \
    -d "{\"client_id\":\"$CLIENT_ID\",\"client_secret\":\"$CLIENT_SECRET\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])'
)"

echo "Token received."

curl -sS -X POST "$BASE_URL/api/projectimport" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "ImportProject",
    "projectNumber": "1000",
    "location": {
      "address": {
        "streetName": "Musterstrasse",
        "streetNumber": "1",
        "city": "Musterstadt",
        "state": "Hessen",
        "postalCode": "64750",
        "country": "deu"
      }
    },
    "localContact": {
      "localContactName": "Max Mustermann",
      "localContactPhone": "+49 123456789"
    },
    "startDate": "2026-07-01",
    "nuLevel": 2
  }'

echo