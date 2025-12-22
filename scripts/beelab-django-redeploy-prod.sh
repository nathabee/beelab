#!/usr/bin/env bash
set -euo pipefail

########################################
# Must be run as user "beelab"
########################################
REQUIRED_USER="beelab"
CURRENT_USER="$(id -un)"
if [[ "$CURRENT_USER" != "$REQUIRED_USER" ]]; then
  echo "ERROR: Run as user '$REQUIRED_USER' (you are '$CURRENT_USER')." >&2
  exit 1
fi

########################################
# Usage
########################################
usage() {
  cat <<'EOF'
Usage:
  scripts/redeploy_django_partial_prod.sh <app> [app2 app3 ...]

Examples:
  scripts/redeploy_django_partial_prod.sh beefontcore
  scripts/redeploy_django_partial_prod.sh beefontcore pomolobeecore
  scripts/redeploy_django_partial_prod.sh usercore competencecore

Behavior:
  - Pull latest code from GitHub
  - Switch to prod env
  - Rebuild + restart django-prod
  - Run migrations only for the given apps
  - Seed only the corresponding cores (best-effort)
EOF
}

if (( $# < 1 )); then
  usage
  exit 1
fi

########################################
# Normalize and validate app list
########################################
declare -a APPS=()
declare -A SEED=()  # map canonical core -> 1

for raw in "$@"; do
  a="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"

  case "$a" in
    beefontcore|beefont)
      APPS+=("beefontcore")
      SEED["BeeFontCore"]=1
      ;;
    pomolobeecore|pomolobee)
      APPS+=("pomolobeecore")
      SEED["PomoloBeeCore"]=1
      ;;
    competencecore|competence)
      APPS+=("competencecore")
      SEED["CompetenceCore"]=1
      ;;
    usercore|user)
      APPS+=("usercore")
      SEED["UserCore"]=1
      ;;
    *)
      echo "ERROR: Unknown app '$raw'. Allowed: beefontcore, pomolobeecore, competencecore, usercore" >&2
      exit 1
      ;;
  esac
done

########################################
# Repo root + pull
########################################
cd ~/beelab
echo "== Pull latest code =="
git pull

########################################
# Prod env + rebuild/restart django-prod
########################################
echo "== Switch env: prod =="
source scripts/alias.sh prod

echo "== Rebuild + restart: django-prod =="
dcbuild django-prod
dcup django-prod

########################################
# Migrate only selected apps
########################################
echo "== Migrate selected apps: ${APPS[*]} =="
for app in "${APPS[@]}"; do
  echo "-- migrate $app"
  dcdjango python manage.py migrate "$app"
done

########################################
# Seed only selected cores (best-effort)
########################################
echo "== Seed selected cores (best-effort) =="
set +e
if [[ -n "${SEED[BeeFontCore]:-}" ]]; then
  echo "-- seed BeeFontCore"
  dcdjseed_beefont
fi
if [[ -n "${SEED[PomoloBeeCore]:-}" ]]; then
  echo "-- seed PomoloBeeCore"
  dcdjseed_pomolobee
fi
if [[ -n "${SEED[CompetenceCore]:-}" ]]; then
  echo "-- seed CompetenceCore"
  dcdjseed_competence
fi
if [[ -n "${SEED[UserCore]:-}" ]]; then
  echo "-- seed UserCore fixtures"
  # Uses your internal helper if it exists; otherwise just runs nothing.
  if declare -F __beelab_loaddata_all_json_in_core >/dev/null 2>&1; then
    __beelab_loaddata_all_json_in_core "UserCore"
  else
    echo "WARN: __beelab_loaddata_all_json_in_core not found; skipping UserCore fixtures."
  fi
fi
set -e

########################################
# Static (best-effort)
########################################
echo "== collectstatic (best-effort) =="
dcdjango python manage.py collectstatic --noinput || true

echo
echo "✅ Partial Django redeploy finished."
echo "Migrated apps: ${APPS[*]}"
echo "Admin: https://beelab-api.nathabee.de/admin/"
echo "Reminder: install/upgrade matching WordPress plugin ZIP manually if needed."
