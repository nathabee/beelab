#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."  # repo root

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

echo "✅ BeeFontCore redeployed in prod (code + migrations + fixtures)."
