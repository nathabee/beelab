
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

cd ~
source beelab/scripts/alias.sh prod
ts="$(date +'%Y%m%d-%H%M')"
dcwpdbdump "prod.${ts}.sql"
dcwpuploadszip "prod.${ts}.uploads.tgz"
cp "/home/beelab/exports/prod.${ts}.sql" /tmp
cp "/home/beelab/exports/prod.${ts}.uploads.tgz" /tmp

