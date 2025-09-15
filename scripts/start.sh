#!/usr/bin/env bash
set -euo pipefail

# usage: ./django-backup.sh [dev|prod] [--media]
ENV="${1:-undefinedEnv}"; [[ "${ENV}" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod] [--media]"; exit 1; }
MEDIA_FLAG="${2:-}"

ENV_FILE=".env.${ENV}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

PROJECT="beelab_${ENV}" 

# load env for names/creds
set -a; source "$ENV_FILE"; set +a
 
docker compose -p $PROJECT --env-file $ENV_FILE --profile $ENV up -d 