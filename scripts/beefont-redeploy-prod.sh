#!/usr/bin/env bash
set -euo pipefail

########################################
# Ensure the script is run as user "beelab"
########################################

REQUIRED_USER="beelab"
CURRENT_USER="$(id -un)"

if [[ "$CURRENT_USER" != "$REQUIRED_USER" ]]; then
    echo "ERROR: This script must be run as user '$REQUIRED_USER', but you are '$CURRENT_USER'." >&2
    exit 1
fi

########################################

# repo root
cd ~/beelab

# 1) pull latest code
git pull

# 2) set prod env
source scripts/alias.sh prod

# 3) rebuild and restart django-prod
dcbuild django-prod
dcup django-prod

# 4) migrate BeeFontCore
dcdjango python manage.py migrate beefontcore

# 5) reseed BeeFont
dcdjseed_beefont

echo "✓ BeeFontCore redeployed in prod (code + migrations + fixtures)."
echo "check migration on https://beelab-api.nathabee.de/admin/"
echo "Install now the plugin that fit this version"
