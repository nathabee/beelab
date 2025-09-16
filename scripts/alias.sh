# scripts/alias.sh
# Usage:  source scripts/alias.sh [dev|prod]
# Then:   dcdjango python manage.py changepassword pomofarmer
# Also:   dcup / dcdown / dcps / dclogs / dcexec


##############################################
# 
# Dev session
# source scripts/alias.sh dev
# dcup                    # start dev stack
# dcdjango python manage.py changepassword pomofarmer
# dclogs django           # follow django logs
# dcdown                  # stop dev

# Switch this same shell to prod
# blenv prod
# dcup
# dcdjango python manage.py createsuperuser

###############################################


# must be sourced
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file must be sourced, not executed. Use: source scripts/alias.sh [dev|prod]"
  exit 1
fi

# repo root (works no matter where you source from)
_BEELAB_ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

  # service names differ in prod
  if [[ "$env" == "prod" ]]; then
    export BEELAB_DJANGO_SVC="django-prod"
  else
    export BEELAB_DJANGO_SVC="django"
  fi
}

# initialize with arg or default dev
_beelab_set_env "${1:-dev}"

# core compose wrapper (always runs from repo root)
dc() {
  ( cd "$_BEELAB_ROOT" && \
    docker compose \
      -p "$BEELAB_PROJECT" \
      --env-file "$BEELAB_ENV_FILE" \
      --profile "$BEELAB_PROFILE" \
      "$@" )
}

# handy wrappers
dcup()   { dc up -d "$@"; }
dcdown() { dc down --remove-orphans "$@"; }
dcstop() { dc stop "$@"; }
dcps()   { dc ps "$@"; }
dclogs() { dc logs -f "$@"; }

# generic exec: dcexec SERVICE [cmd...]
dcexec() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" ]] && { echo "Usage: dcexec SERVICE [cmd]"; return 1; }
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$svc" "$@"
}

# django-specific: dcdjango [cmd...]
# (picks django vs django-prod automatically; interactive if you have a TTY)
dcdjango() {
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_DJANGO_SVC" "$@"
}

 

# switch env in the same shell after sourcing: blenv dev|prod
blenv() { _beelab_set_env "$1" && echo "beelab env -> $BEELAB_ENV"; }

dchelp() { 
    echo "###### DOCKER ALIAS ##########"
    echo "dcup"
    echo "dcdown"
    echo "dcstop"
    echo "dcps"
    echo "dclogs"
    echo "###### DJANGO ALIAS ##########"
    echo "dcdjango python manage.py check"
    echo "dcdjango python manage.py changepassword pomofarmer"
    echo "###### ALIAS LIST##########"
    echo "dchelp"

}


echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try: "
dchelp