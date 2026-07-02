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
        "state": "Musterbundesland",
        "postalCode": "123456",
        "country": "deu"
      },
      "coordinates": "8.0, 54.0"
    },
    "localContact": {
      "localContactName": "Karl Kontakt",
      "localContactPhone": "+49 30 123456"
    },
    "firstResponder": {
      "firstResponderName": "Emil Erster",
      "firstResponderNumber": "+49 30 321321"
    },
    "fireDepartment": {
      "fireDepartmentName": "Fabian Feuer",
      "fireDepartmentNumber": "+49 30 987987"
    },
    "startDate": "2024-03-25",
    "nuLevel": 2
  }'

echo
