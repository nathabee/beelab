#!/usr/bin/env bash
# scripts/alias.sh
# Usage:  source scripts/alias.sh [dev|prod]

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file must be sourced, not executed. Use: source scripts/alias.sh [dev|prod]"
  exit 1
fi

_BEELAB_ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# -------------------------------------------------------------------
# ENVIRONMENT
# -------------------------------------------------------------------
_beelab_set_env() {
  local env="${1:-dev}"
  case "$env" in
    dev|prod) ;;
    *) echo "env must be 'dev' or 'prod'"; return 1 ;;
  esac

  export BEELAB_ENV="$env"
  export BEELAB_PROJECT="beelab_${env}"
  export BEELAB_ENV_FILE=".env.${env}"
  export BEELAB_PROFILE="$env"

  if [[ "$env" == "prod" ]]; then
    export BEELAB_DJANGO_SVC="django-prod"
    export BEELAB_WP_SVC="wordpress-prod"
    export BEELAB_WEB_SVC="web-prod"
    export BEELAB_WPCLI_SVC="wpcli-prod"
  else
    export BEELAB_DJANGO_SVC="django"
    export BEELAB_WP_SVC="wordpress"
    export BEELAB_WEB_SVC="web"
    export BEELAB_WPCLI_SVC="wpcli"
  fi
}

_beelab_set_env "${1:-dev}"
blenv() { _beelab_set_env "$1" && echo "beelab env → $BEELAB_ENV"; }

# -------------------------------------------------------------------
# DOCKER COMPOSE WRAPPERS
# -------------------------------------------------------------------
dc() {
  ( cd "$_BEELAB_ROOT" && \
    docker compose \
      -p "$BEELAB_PROJECT" \
      --env-file "$BEELAB_ENV_FILE" \
      --profile "$BEELAB_PROFILE" \
      "$@" )
}
dcup()   { dc up -d "$@"; }
dcdown() { dc down --remove-orphans "$@"; }
dcstop() { dc stop "$@"; }
dcps()   { dc ps "$@"; }
dclogs() { dc logs -f "$@"; }
dcbuild(){ dc build "$@"; }

dcexec() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" ]] && { echo "Usage: dcexec SERVICE [cmd]"; return 1; }
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$svc" "$@"
}

# -------------------------------------------------------------------
# WEB
# -------------------------------------------------------------------
dcweblogs() { dclogs "$BEELAB_WEB_SVC" "$@"; }
dcwebup()   { dc up -d "$BEELAB_WEB_SVC"; }
dcwebdown() { dc stop  "$BEELAB_WEB_SVC"; }

# -------------------------------------------------------------------
# LOGS (host json-file driver + in-container files)
# -------------------------------------------------------------------
_dc_container_ids() {
  if [[ $# -gt 0 ]]; then
    for svc in "$@"; do dc ps -q "$svc"; done | awk 'NF'
  else
    dc ps -q
  fi
}
dclogspath() {
  local cids; cids=$(_dc_container_ids "$@")
  [[ -z "$cids" ]] && { echo "No containers found."; return 0; }
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    docker inspect --format='{{.Name}} {{.LogPath}}' "$cid" 2>/dev/null
  done <<< "$cids"
}
dclogsize() {
  local cids; cids=$(_dc_container_ids "$@")
  [[ -z "$cids" ]] && { echo "No containers found."; return 0; }
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    local name path
    name=$(docker inspect --format='{{.Name}}' "$cid" | sed 's#^/##')
    path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null)
    if [[ -n "$path" && -e "$path" ]]; then
      du -h "$path" | awk -v n="$name" '{print "• " n ": " $1 "  " $2}'
    else
      echo "• $name: (no log path)"
    fi
  done <<< "$cids"
}
dclogzero() {
  local cids; cids=$(_dc_container_ids "$@")
  [[ -z "$cids" ]] && { echo "No containers found."; return 0; }
  local ok=0 fail=0
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    local name path
    name=$(docker inspect --format='{{.Name}}' "$cid" | sed 's#^/##')
    path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null)
    if [[ -z "$path" ]]; then
      echo "⚠️  $name: no log path (driver?)"; ((fail++)); continue
    fi
    if truncate -s 0 "$path" 2>/dev/null || : > "$path" 2>/dev/null; then
      echo "✅ $name: truncated $path"; ((ok++))
    elif command -v sudo >/dev/null 2>&1 && sudo sh -lc ": > '$path'"; then
      echo "✅ $name: truncated with sudo $path"; ((ok++))
    else
      echo "❌ $name: cannot truncate $path (need permissions?)"; ((fail++))
    fi
  done <<< "$cids"
  echo "Done. success=$ok fail=$fail"
}
dclogzero_in() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" || $# -lt 1 ]] && { echo "Usage: dclogzero_in SERVICE /path [/path...]"; return 1; }
  local cmd="set -e; "
  for p in "$@"; do cmd+="if [[ -e '$p' ]]; then : > '$p' || true; echo 'zeroed: $p'; else echo 'missing: $p'; fi; "; done
  dcexec "$svc" bash -lc "$cmd"
}

# -------------------------------------------------------------------
# BeeFont aliases (externalised, already)
# -------------------------------------------------------------------
if [[ -f "$_BEELAB_ROOT/scripts/alias_beefont.sh" ]]; then
  source "$_BEELAB_ROOT/scripts/alias_beefont.sh"
fi

# -------------------------------------------------------------------
# Django + WordPress aliases (externalised now)
# -------------------------------------------------------------------
if [[ -f "$_BEELAB_ROOT/scripts/alias_django.sh" ]]; then
  source "$_BEELAB_ROOT/scripts/alias_django.sh"
fi
if [[ -f "$_BEELAB_ROOT/scripts/alias_wordpress.sh" ]]; then
  source "$_BEELAB_ROOT/scripts/alias_wordpress.sh"
fi

# -------------------------------------------------------------------
# HELP (now composes from sub-helps)
# -------------------------------------------------------------------
dchelp() {
  cat <<'EOF'
###### MISC ##########
blenv dev|prod       # switch env in this shell (updates compose flags)

###### DOCKER ########
dcup                 # start current env stack
dcbuild              # build images (optionally: dcbuild web django)
dcdown               # stop stack (remove orphans)
dcstop SERVICE       # stop one service
dcps                 # docker compose ps
dclogs [SERVICE]     # follow logs for the whole stack or a service
dcexec SERVICE CMD   # exec inside a service (tty-aware)

###### LOGS ##########
dclogspath [SVC...]      # show docker log file paths
dclogsize  [SVC...]      # show docker log file sizes
dclogzero  [SVC...]      # truncate docker JSON logs (all if no SVC)
dclogzero_in SVC /path   # zero file logs inside container

###### WEB (Next.js) ##
dcweblogs            # follow web logs
dcwebup / dcwebdown  # start/stop web only
EOF

  # appended sections (if defined)
  type dchelp_django >/dev/null 2>&1 && dchelp_django
  type dchelp_wordpress >/dev/null 2>&1 && dchelp_wordpress
  echo "use beefonthelp to get help on beefont"
}

echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try:"
dchelp
