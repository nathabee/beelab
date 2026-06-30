#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-dev}"
[[ "$ENV" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod]"; exit 1; }

ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.${ENV}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

set -a
source "$ENV_FILE"
set +a

API_URL="${DJANGO_BASE_URL:-http://127.0.0.1:9001}"
API_URL="${API_URL%/}"
INGO_API_URL="${INGO_BASE_URL:-$API_URL}"
INGO_API_URL="${INGO_API_URL%/}"
TOKEN="${INGO_TOKEN:-}"
COMPOSE_PROJECT="beelab_${ENV}"
DJANGO_SERVICE=$([[ "$ENV" == "prod" ]] && echo "django-prod" || echo "django")
ACTION="${2:-menu}"

is_set() {
  [[ -n "${!1+x}" ]]
}

mask_secret() {
  local value="${1:-}"
  if [[ -z "$value" ]]; then
    echo "<missing>"
  elif ((${#value} <= 4)); then
    echo "****"
  else
    echo "${value:0:2}****${value: -2}"
  fi
}

setting_value() {
  local name="$1"
  local fallback="${2:-}"
  if is_set "$name" && [[ -n "${!name}" ]]; then
    echo "${!name}"
  elif [[ -n "$fallback" ]]; then
    echo "$fallback (default)"
  else
    echo "<missing>"
  fi
}

setting_secret() {
  local name="$1"
  if is_set "$name" && [[ -n "${!name}" ]]; then
    mask_secret "${!name}"
  else
    echo "<missing>"
  fi
}

warn_defaults() {
  local has_warning=0

  if ! is_set DJANGO_BASE_URL || [[ -z "${DJANGO_BASE_URL:-}" ]]; then
    echo "WARNING: DJANGO_BASE_URL is not set; using http://127.0.0.1:9001"
    has_warning=1
  fi
  for name in INGO_BASE_URL INGO_TENANT_NAME INGO_CLIENT_ID INGO_CLIENT_SECRET; do
    if ! is_set "$name" || [[ -z "${!name}" ]]; then
      echo "WARNING: $name is not set; direct mock InGo calls will fail"
      has_warning=1
    fi
  done
  return "$has_warning"
}

show_env_report() {
  echo
  echo "InGo helper environment"
  echo "  ENV_FILE              $ENV_FILE"
  echo "  ENV                   $ENV"
  echo "  COMPOSE_PROJECT       $COMPOSE_PROJECT"
  echo "  DJANGO_SERVICE        $DJANGO_SERVICE"
  echo "  DJANGO_BASE_URL       $(setting_value DJANGO_BASE_URL "http://127.0.0.1:9001")"
  echo "  INGO_BASE_URL         $(setting_value INGO_BASE_URL)"
  echo "  INGO_TENANT_NAME      $(setting_value INGO_TENANT_NAME)"
  echo "  INGO_CLIENT_ID        $(setting_value INGO_CLIENT_ID)"
  echo "  INGO_CLIENT_SECRET    $(setting_secret INGO_CLIENT_SECRET)"
  echo "  INGO_TOKEN            $(is_set INGO_TOKEN && [[ -n "${INGO_TOKEN:-}" ]] && echo "<provided>" || echo "<not set>")"
  echo
  warn_defaults || true
}

confirm_prod() {
  if [[ "$ENV" != "prod" ]]; then
    return 0
  fi

  echo
  echo "DANGER: You are targeting PROD."
  echo "Target InGo API: $INGO_API_URL"
  read -r -p "Type PROD to continue: " confirm
  [[ "$confirm" == "PROD" ]] || { echo "Cancelled."; exit 1; }
}

json_pretty() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool 2>/dev/null || cat
  else
    cat
  fi
}

print_command() {
  echo
  echo ">>> $*"
}

run_curl() {
  print_command "$@"
  "$@" | json_pretty
  echo
}

connect() {
  local payload
  payload=$(printf '{"client_id":"%s","client_secret":"%s"}' "$INGO_CLIENT_ID" "$INGO_CLIENT_SECRET")

  print_command curl -sS -X POST "$INGO_API_URL/api/GetToken/$INGO_TENANT_NAME" -H "Content-Type: application/json" -d "$payload"
  local response
  response=$(curl -sS -X POST "$INGO_API_URL/api/GetToken/$INGO_TENANT_NAME" \
    -H "Content-Type: application/json" \
    -d "$payload")
  printf '%s\n' "$response" | json_pretty
  echo

  TOKEN=$(printf '%s' "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null || true)
  if [[ -n "$TOKEN" ]]; then
    echo "InGo access token loaded for this session."
  else
    echo "No access_token found in response."
  fi
}

create_test_user() {
  print_command docker compose -p "$COMPOSE_PROJECT" --env-file "$ENV_FILE" --profile "$ENV" exec -T "$DJANGO_SERVICE" python manage.py migrate --noinput
  docker compose -p "$COMPOSE_PROJECT" --env-file "$ENV_FILE" --profile "$ENV" exec -T "$DJANGO_SERVICE" \
    python manage.py migrate --noinput

  print_command docker compose -p "$COMPOSE_PROJECT" --env-file "$ENV_FILE" --profile "$ENV" exec -T "$DJANGO_SERVICE" python manage.py create_ingo_test_user
  docker compose -p "$COMPOSE_PROJECT" --env-file "$ENV_FILE" --profile "$ENV" exec -T "$DJANGO_SERVICE" \
    python manage.py create_ingo_test_user
}

post_project() {
  if [[ -z "$TOKEN" ]]; then
    echo "No InGo token loaded. Run connect first, or export INGO_TOKEN=..."
    return 1
  fi

  local payload
  payload='{
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
      },
      "coordinates": "8.12345,49.98765"
    },
    "localContact": {
      "localContactName": "Max Mustermann",
      "localContactPhone": "+49 123456789"
    },
    "startDate": "2026-07-01",
    "nuLevel": 2
  }'

  run_curl curl -sS -X POST "$INGO_API_URL/api/projectimport" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

menu() {
  while true; do
    echo
    echo "InGo mock helper ($ENV) -> $INGO_API_URL"
    echo "1) create/update InGo client user ($INGO_CLIENT_ID)"
    echo "2) connect: POST /api/GetToken/$INGO_TENANT_NAME"
    echo "3) post project: POST /api/projectimport"
    echo "4) exit"
    read -r -p "> " choice

    case "$choice" in
      1|user|"create user"|"test user"|"create client") create_test_user ;;
      2|connect) connect ;;
      3|post|project|"post project") post_project ;;
      4|exit|quit|q) exit 0 ;;
      *) echo "Choose: create client, connect, post project, or exit." ;;
    esac
  done
}

show_env_report
confirm_prod

case "$ACTION" in
  create-user|user) create_test_user ;;
  connect) connect ;;
  post-project|post_project|post) post_project ;;
  menu) menu ;;
  *) echo "Usage: $0 [dev|prod] [menu|create-user|connect|post-project]"; exit 1 ;;
esac
