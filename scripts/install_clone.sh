#!/usr/bin/env bash
set -euo pipefail

# BeeLab — install/clone orchestrator
# - Orchestrates: git pull, docker build/up, django migrate,
#   wp theme reset+install, wp db restore, wp uploads restore,
#   wp search-replace, rewrites flush, cache flush.
#
# No troubleshooting. No implicit cloning. No magic.

echo "CAREFUL NOT TESTED YET!!!!!!!!!!!!!!"

REQUIRED_USER="beelab"
REPO_DIR="${HOME}/beelab"

die() { echo "❌ $*" >&2; exit 1; }
log() { echo "== $*"; }

usage() {
  cat <<'EOF'
Usage:
  scripts/install_clone.sh --env dev|prod [options]

Core options:
  --git-pull
  --docker-build
  --docker-up
  --django-migrate

WordPress theme (style) options:
  --wp-theme-switch-away <theme>        (default: twentytwentyfive)
  --wp-theme-reset <theme-dir>          (e.g. beelab-theme)
  --wp-theme-zip <path.zip>             (theme ZIP artifact)
  --wp-theme-dir <theme-dir>            (default: beelab-theme)
  --wp-theme-activate <theme-dir>       (e.g. beelab-theme)

WordPress DB + uploads options:
  --wp-db-restore <path.sql>
  --wp-uploads-restore <path.tgz>
  --wp-uploads-mode --wipe|--keep       (default: --keep)

URL fixes + flush:
  --search-replace <from> <to>          (runs wp search-replace with --all-tables --precise --recurse-objects)
  --rewrite-flush
  --cache-flush

Other:
  --dry-run                             (print what would run)
  -h|--help

WordPress backup options:
  --wp-db-backup <exports-relpath.sql>           (e.g. wp-db/daily/prod.2025-12-17.sql)
  --wp-uploads-backup <exports-relpath.tgz>      (e.g. wp-files/daily/prod.2025-12-17.uploads.tgz)
  --wp-backup-auto daily|monthly                 (auto path in ~/exports/wp-db/* and ~/exports/wp-files/*)

WordPress restore convenience:
  --wp-restore <db.sql> <uploads.tgz> [--wipe|--keep]
      (same as --wp-db-restore + --wp-uploads-restore + --wp-uploads-mode)


Examples:

1) Reset docker + migrate (prod):
  scripts/install_clone.sh --env prod --git-pull --docker-build --docker-up --django-migrate

2) Install theme ZIP into prod (clean overrides):
  scripts/install_clone.sh --env prod \
    --wp-theme-switch-away twentytwentyfive \
    --wp-theme-reset beelab-theme \
    --wp-theme-zip ~/path/beelab-theme.zip \
    --wp-theme-activate beelab-theme \
    --cache-flush

3) Restore DB+uploads into dev + rewrite URLs:
  scripts/install_clone.sh --env dev --docker-up \
    --wp-db-restore ~/exports/wp-db/prod.sql \
    --wp-uploads-restore ~/exports/wp-files/prod_uploads.tgz --wp-uploads-mode --wipe \
    --search-replace "https://beelab-wp.nathabee.de" "http://localhost:9082" \
    --rewrite-flush --cache-flush

4) Backup prod (daily auto):
  scripts/install_clone.sh --env prod --docker-up --wp-backup-auto daily

5) Restore prod from monthly snapshot:
  scripts/install_clone.sh --env prod --docker-up \
    --wp-restore ~/exports/wp-db/monthly/prod.2025-12.sql ~/exports/wp-files/monthly/prod.2025-12.uploads.tgz --wipe \
    --rewrite-flush --cache-flush

EOF
}

# ------------------------
# Parse args
# ------------------------
ENV_NAME=""
DO_GIT_PULL=0
DO_DOCKER_BUILD=0
DO_DOCKER_UP=0
DO_DJANGO_MIGRATE=0
DO_WP_FIX_CLONE_URLS=0

WP_SWITCH_AWAY_THEME="twentytwentyfive"
DO_WP_THEME_RESET=0
WP_THEME_RESET_DIR=""
WP_THEME_ZIP=""
WP_THEME_DIR="beelab-theme"
WP_THEME_ACTIVATE=""

WP_DB_RESTORE=""
WP_UPLOADS_RESTORE=""
WP_UPLOADS_MODE="--keep"

DO_SEARCH_REPLACE=0
SR_FROM=""
SR_TO=""

DO_REWRITE_FLUSH=0
DO_CACHE_FLUSH=0
DRY_RUN=0

# WordPress backup
WP_DB_BACKUP_OUT=""          # relative under ~/exports, like wp-db/daily/....
WP_UPLOADS_BACKUP_OUT=""     # relative under ~/exports, like wp-files/daily/....
WP_BACKUP_AUTO=""            # daily|monthly


while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_NAME="${2:-}"; shift 2;;
    --git-pull) DO_GIT_PULL=1; shift;;
    --docker-build) DO_DOCKER_BUILD=1; shift;;
    --docker-up) DO_DOCKER_UP=1; shift;;
    --django-migrate) DO_DJANGO_MIGRATE=1; shift;;

    --wp-theme-switch-away)
      WP_SWITCH_AWAY_THEME="${2:-}"; shift 2;;
    --wp-theme-reset)
      DO_WP_THEME_RESET=1
      WP_THEME_RESET_DIR="${2:-}"; shift 2;;
    --wp-theme-zip)
      WP_THEME_ZIP="${2:-}"; shift 2;;
    --wp-theme-dir)
      WP_THEME_DIR="${2:-}"; shift 2;;
    --wp-theme-activate)
      WP_THEME_ACTIVATE="${2:-}"; shift 2;;

    --wp-db-restore)
      WP_DB_RESTORE="${2:-}"; shift 2;;
    --wp-uploads-restore)
      WP_UPLOADS_RESTORE="${2:-}"; shift 2;;
    --wp-uploads-mode)
      WP_UPLOADS_MODE="${2:-}"; shift 2;;

    --search-replace)
      DO_SEARCH_REPLACE=1
      SR_FROM="${2:-}"
      SR_TO="${3:-}"
      shift 3;;
    --wp-fix-clone-urls) DO_WP_FIX_CLONE_URLS=1; shift;;

    --rewrite-flush) DO_REWRITE_FLUSH=1; shift;;
    --cache-flush) DO_CACHE_FLUSH=1; shift;;
    --dry-run) DRY_RUN=1; shift;;
    
    --wp-db-backup)
      WP_DB_BACKUP_OUT="${2:-}"; shift 2;;
    --wp-uploads-backup)
      WP_UPLOADS_BACKUP_OUT="${2:-}"; shift 2;;
    --wp-backup-auto)
      WP_BACKUP_AUTO="${2:-}"; shift 2;;
    --wp-restore)
      WP_DB_RESTORE="${2:-}"
      WP_UPLOADS_RESTORE="${3:-}"
      WP_UPLOADS_MODE="${4:---wipe}"
      shift 4;;


    -h|--help) usage; exit 0;;
    *) die "Unknown arg: $1 (use --help)";;
  esac
done

[[ -n "$ENV_NAME" ]] || die "Missing --env dev|prod"
[[ "$ENV_NAME" == "dev" || "$ENV_NAME" == "prod" ]] || die "--env must be dev or prod"

[[ "$(id -un)" == "$REQUIRED_USER" ]] || die "Must run as user: $REQUIRED_USER"

[[ -d "$REPO_DIR" ]] || die "Repo not found at: $REPO_DIR"

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %q ' "$@"; echo
  else
    "$@"
  fi
}

run_bashlc() {
  local cmd="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] bash -lc $cmd"
  else
    bash -lc "$cmd"
  fi
}

# ------------------------
# Bootstrapping
# ------------------------
log "Repo: $REPO_DIR"
run_bashlc "cd '$REPO_DIR'"

# Load BeeLab aliases for the chosen env.
# This should define dc*, dcdjango, dcwp*, etc.
log "Sourcing BeeLab aliases (env=$ENV_NAME)"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] source '$REPO_DIR/scripts/alias.sh' '$ENV_NAME'"
else
  # shellcheck disable=SC1090
  source "$REPO_DIR/scripts/alias.sh" "$ENV_NAME"
fi


# ------------------------
# Auto backup path resolution
# ------------------------
if [[ -n "$WP_BACKUP_AUTO" ]]; then
  [[ "$WP_BACKUP_AUTO" == "daily" || "$WP_BACKUP_AUTO" == "monthly" ]] || die "--wp-backup-auto must be daily or monthly"

  # env-aware prefix
  PREFIX="$ENV_NAME"

  # timestamp format: daily => YYYY-MM-DD ; monthly => YYYY-MM
  if [[ "$WP_BACKUP_AUTO" == "daily" ]]; then
    TS="$(date +%F)"
    WP_DB_BACKUP_OUT="wp-db/daily/${PREFIX}.${TS}.sql"
    WP_UPLOADS_BACKUP_OUT="wp-files/daily/${PREFIX}.${TS}.uploads.tgz"
  else
    TS="$(date +%Y-%m)"
    WP_DB_BACKUP_OUT="wp-db/monthly/${PREFIX}.${TS}.sql"
    WP_UPLOADS_BACKUP_OUT="wp-files/monthly/${PREFIX}.${TS}.uploads.tgz"
  fi
fi

# ------------------------
# Operations
# ------------------------
if [[ "$DO_GIT_PULL" -eq 1 ]]; then
  log "git pull"
  run_bashlc "cd '$REPO_DIR' && git pull"
fi

if [[ "$DO_DOCKER_BUILD" -eq 1 ]]; then
  log "Docker build (dcbuild)"
  run dcbuild
fi

if [[ "$DO_DOCKER_UP" -eq 1 ]]; then
  log "Docker up (dcup)"
  run dcup
fi

if [[ "$DO_DJANGO_MIGRATE" -eq 1 ]]; then
  log "Django migrate (dcdjango python manage.py migrate)"
  run dcdjango python manage.py migrate
fi

# ------------------------
# WordPress theme clone steps
# ------------------------
if [[ -n "$WP_THEME_ZIP" || "$DO_WP_THEME_RESET" -eq 1 || -n "$WP_THEME_ACTIVATE" || -n "$WP_DB_RESTORE" || -n "$WP_UPLOADS_RESTORE" || -n "$WP_DB_BACKUP_OUT" || -n "$WP_UPLOADS_BACKUP_OUT" ]]; then
  # If any WP theme operation is requested, ensure WP CLI is up.
  log "Ensuring WP CLI is up"
  run dcwpcliup
fi

if [[ -n "$WP_THEME_ZIP" ]]; then
  [[ -f "$WP_THEME_ZIP" ]] || die "Theme ZIP not found: $WP_THEME_ZIP"
fi

if [[ "$DO_WP_THEME_RESET" -eq 1 ]]; then
  [[ -n "$WP_THEME_RESET_DIR" ]] || die "--wp-theme-reset requires a theme dir (e.g. beelab-theme)"
  log "Switch away theme: $WP_SWITCH_AWAY_THEME"
  run dcwp theme activate "$WP_SWITCH_AWAY_THEME"

  log "Reset FSE DB overrides + remove theme dir: $WP_THEME_RESET_DIR"
  run dcwpthemereset "$WP_THEME_RESET_DIR"
fi

if [[ -n "$WP_THEME_ZIP" ]]; then
  log "Install theme ZIP into theme dir: $WP_THEME_DIR"
  run dcwpthemeinstall "$WP_THEME_ZIP" "$WP_THEME_DIR"
fi

if [[ -n "$WP_THEME_ACTIVATE" ]]; then
  log "Activate theme: $WP_THEME_ACTIVATE"
  run dcwp theme activate "$WP_THEME_ACTIVATE"
fi

# ------------------------
# WordPress DB + uploads backup
# ------------------------
if [[ -n "$WP_DB_BACKUP_OUT" ]]; then
  log "Backup WP DB -> ~/exports/$WP_DB_BACKUP_OUT"
  run dcwpdbdump "$WP_DB_BACKUP_OUT"
fi

if [[ -n "$WP_UPLOADS_BACKUP_OUT" ]]; then
  log "Backup WP uploads -> ~/exports/$WP_UPLOADS_BACKUP_OUT"
  run dcwpuploadszip "$WP_UPLOADS_BACKUP_OUT"
fi
 
if [[ -n "$WP_DB_RESTORE" ]]; then
  [[ -f "$WP_DB_RESTORE" ]] || die "SQL file not found: $WP_DB_RESTORE"
  log "Restore WP DB from: $WP_DB_RESTORE"
  run dcwpdbrestore "$WP_DB_RESTORE"
fi

if [[ -n "$WP_UPLOADS_RESTORE" ]]; then
  [[ -f "$WP_UPLOADS_RESTORE" ]] || die "Uploads archive not found: $WP_UPLOADS_RESTORE"
  [[ "$WP_UPLOADS_MODE" == "--wipe" || "$WP_UPLOADS_MODE" == "--keep" ]] || die "--wp-uploads-mode must be --wipe or --keep"
  log "Restore WP uploads from: $WP_UPLOADS_RESTORE (mode=$WP_UPLOADS_MODE)"
  run dcwpuploadsunzip "$WP_UPLOADS_RESTORE" "$WP_UPLOADS_MODE"
fi
# ------------------------
# Post-clone URL fix (recommended)
# ------------------------
if [[ "$DO_WP_FIX_CLONE_URLS" -eq 1 ]]; then
  log "Fix clone URLs (env-aware)"
  run dcwpfixcloneurls
fi

# ------------------------
# URL fix + flush
# ------------------------
if [[ "$DO_SEARCH_REPLACE" -eq 1 ]]; then
  [[ -n "$SR_FROM" && -n "$SR_TO" ]] || die "--search-replace requires <from> <to>"
  log "Search-replace: '$SR_FROM' -> '$SR_TO'"
  run dcwp search-replace "$SR_FROM" "$SR_TO" --all-tables --precise --recurse-objects
fi

if [[ "$DO_REWRITE_FLUSH" -eq 1 ]]; then
  log "Rewrite flush --hard"
  run dcwp rewrite flush --hard
fi

if [[ "$DO_CACHE_FLUSH" -eq 1 ]]; then
  log "Cache flush"
  run dcwpcachflush
fi

log "Done (env=$ENV_NAME)."
