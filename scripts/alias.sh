# scripts/alias.sh
# Usage:  source scripts/alias.sh [dev|prod]
# Then:   dcdjango python manage.py changepassword pomofarmer
# Also:   dcup / dcdown / dcps / dclogs / dcexec
# Added:  dcdjpwd USER [NEWPWD]   # change Django password (interactive if NEWPWD omitted)
#         dcdjlogs | dcwplogs | dcweblogs
#         dcdjup|dcdjdown  dcwpup|dcwpdown  dcwebup|dcwebdown

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

# initialize with arg or default dev
_beelab_set_env "${1:-dev}"

_beelab_ensure_wpcli() {
  # start wpcli if not running
  if [[ -z "$(dc ps -q "$BEELAB_WPCLI_SVC")" ]]; then
    dc up -d "$BEELAB_WPCLI_SVC"
  fi
}


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
# build images (optionally specify services, e.g. dcbuild web django)
dcbuild() { dc build "$@"; }

# generic exec: dcexec SERVICE [cmd...]
dcexec() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" ]] && { echo "Usage: dcexec SERVICE [cmd]"; return 1; }
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$svc" "$@"
}

# django-specific: dcdjango [cmd...]
dcdjango() {
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_DJANGO_SVC" "$@"
}

# ---- New helpers you asked for ----

# Change Django password for a user:
# - Interactive:  dcdjpwd alice
# - Non-interactive: dcdjpwd alice "NewPass123!"
dcdjpwd() {
  local user="${1:-}"; local pwd="${2:-}"
  if [[ -z "$user" ]]; then
    echo "Usage: dcdjpwd USER [NEW_PASSWORD]"
    return 1
  fi
  if [[ -z "$pwd" ]]; then
    # interactive built-in
    dcdjango python manage.py changepassword "$user"
  else
    # set via a tiny Python snippet (non-interactive)
    local esc_user esc_pwd
    esc_user=$(printf "%q" "$user")
    esc_pwd=$(printf "%q" "$pwd")
    dcdjango bash -lc "
U=$esc_user P=$esc_pwd python - <<'PY'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(username=os.environ['U'])
u.set_password(os.environ['P'])
u.save()
print('Password updated for', u.username)
PY"
  fi
}

# Logs
dcdjlogs()  { dclogs "$BEELAB_DJANGO_SVC" "$@"; }
dcwplogs()  { dclogs "$BEELAB_WP_SVC" "$@"; }
dcweblogs() { dclogs "$BEELAB_WEB_SVC" "$@"; }
# singular alias requested
dcwplog()   { dcwplogs "$@"; }

# Up/Down per service (stop = down-for-that-service)
dcdjup()    { dc up -d "$BEELAB_DJANGO_SVC"; }
dcdjdown()  { dc stop  "$BEELAB_DJANGO_SVC"; }

dcwpup()    { dc up -d "$BEELAB_WP_SVC"; }
dcwpdown()  { dc stop  "$BEELAB_WP_SVC"; }
 
# Run WP-CLI: dcwp <args...>  e.g.  dcwp plugin list
dcwp() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" wp "$@"
}

# Flush WP object cache + clear file cache
dcwpcachflush() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc \
    'wp cache flush || true; rm -rf /var/www/html/wp-content/cache/* || true; echo "WP cache cleared."'
}


dcwebup()   { dc up -d "$BEELAB_WEB_SVC"; }
dcwebdown() { dc stop  "$BEELAB_WEB_SVC"; }

# wpcli

dcwpcliup()   { dc up -d "$BEELAB_WPCLI_SVC"; }
dcwpclidown() { dc stop  "$BEELAB_WPCLI_SVC"; }


dcwpfixroutes() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
    echo "home:"; wp option get home;
    echo "siteurl:"; wp option get siteurl;
    echo "permalink before:"; wp option get permalink_structure;
    wp option update permalink_structure "/%postname%/" >/dev/null;
    wp rewrite flush --hard;
    echo "permalink after:"; wp option get permalink_structure;
    wp plugin list;
  '
}

# ---- Tests (pytest) ----

# ensure django service is running before exec'ing into it
_beelab_ensure_django() {
  if [[ -z "$(dc ps -q "$BEELAB_DJANGO_SVC")" ]]; then
    echo "Starting $BEELAB_DJANGO_SVC..."
    dcdjup
    # give it a moment to boot (healthcheck will still gate dependent services)
    sleep 1
  fi
}

# dctest [pytest args...]
# Run the full pytest suite inside the Django container.
dctest() {
  _beelab_ensure_django
  dcdjango pytest -q "$@"
}

# dctestcov [extra pytest args...]
# Run tests with coverage across your Django apps.
dctestcov() {
  _beelab_ensure_django
  dcdjango pytest --cov=UserCore --cov=CompetenceCore --cov=PomoloBeeCore --cov-report=term-missing --cov-report=html:/app/media/test-coverage/user --junitxml=/app/media/test-reports/junit_user.xml  -o cache_dir=/app/media/.pytest_cache  -q "$@"
}

# dctestfile path::node [extra pytest args...]
# Run a specific file / node, e.g.
#   dctestfile UserCore/tests/test_demo_auth.py::test_demo_start_sets_cookie
dctestfile() {
  local target="${1:-}"
  shift || true
  if [[ -z "$target" ]]; then
    echo "Usage: dctestfile path/to/test.py[::TestClass::test_name]"
    return 1
  fi
  _beelab_ensure_django
  dcdjango pytest -q "$target" "$@"
}

# dctestk EXPRESSION [extra pytest args...]
# Pattern match, e.g. dctestk demo and not throttling
dctestk() {
  local expr="${1:-}"
  shift || true
  if [[ -z "$expr" ]]; then
    echo "Usage: dctestk 'pattern'"
    return 1
  fi
  _beelab_ensure_django
  dcdjango pytest -q -k "$expr" "$@"
}

# Only UserCore tests
dctest_usercore() {
 # dc run --rm django-tests pytest -q UserCore/tests "$@"
  dc run --rm django-tests pytest -q --ignore=PomoloBeeCore --ignore=CompetenceCore --cov=UserCore -q "$@"
}
dctestcov_usercore() { 

  dc run --rm django-tests pytest -q UserCore/tests --cov=UserCore --cov-report=term-missing --cov-report=html:/app/media/test-coverage/user --junitxml=/app/media/test-reports/junit_user.xml  -o cache_dir=/app/media/.pytest_cache -q "$@"
  echo "result in "
  echo "- coverage in :  http://localhost:9001/media/test-coverage/user/index.html"
  echo "- JUnit XML: http://localhost:9001/media/test-reports/junit_user.xml"
}

 


# switch env in the same shell after sourcing: blenv dev|prod
blenv() { _beelab_set_env "$1" && echo "beelab env -> $BEELAB_ENV"; }

dchelp() {
  cat <<EOF
###### DOCKER ALIAS ##########
dcup                # start current env stack
dcbuild             # build
dcdown              # stop stack (remove orphans)
dcstop SERVICE      # stop one service
dcps                # ps
dclogs [SERVICE]    # follow logs (or use the service-specific ones below)
dcexec SERVICE CMD  # exec inside a service

###### DJANGO ##########
dcdjango CMD...     # run manage.py, shell, etc.
dcdjlogs            # follow django logs
dcdjup / dcdjdown   # start/stop django only
dcdjpwd USER [NEW]  # change password (interactive if NEW omitted)

###### WORDPRESS ######
dcwplogs | dcwplog  # follow wordpress logs
dcwpup / dcwpdown   # start/stop wordpress only
dcwp ARGS...           # run wp-cli (e.g. dcwp plugin list)
dcwpcachflush          # flush wp cache (object + /wp-content/cache)
dcwpcliup / dcwpclidown# start/stop wpcli sidecar (optional)
dcwpfixroutes


###### WEB (Next.js) ##
dcweblogs           # follow web logs
dcwebup / dcwebdown # start/stop web only


###### TESTS (pytest) ###
dctest [args]        # run full test suite (pytest -q)
dctestcov [args]     # run with coverage for UserCore/CompetenceCore/PomoloBeeCore
dctestfile path[..]  # run a specific file/node
dctestk 'expr'       # run tests matching -k expression
dctest_usercore      # run usercore tests 
dctestcov_usercore   # run all usercore tests
###### MISC ##########
blenv dev|prod      # switch env in this shell

### example:
dcdjango python manage.py makemigrations
dcdjango python manage.py migrate

EOF
}

echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try:"
dchelp
