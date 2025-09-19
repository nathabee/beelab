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
    dev|prod ) ;;    
    *) echo "env must be 'dev'  or 'prod' (put dev for test)"; return 1 ;;
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

# initialize with arg or default dev
_beelab_set_env "${1:-dev}"

_beelab_ensure_wpcli() {
  # start wpcli if not running
  if [[ -z "$(dc ps -q "$BEELAB_WPCLI_SVC")" ]]; then
    dc up -d "$BEELAB_WPCLI_SVC"
  fi
}


# core compose wrapper (always runs from repo root) just for dev and prod
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

###########################################################################
# TEST
#############################################################################

dt() {
  ( cd "$_BEELAB_ROOT" && \
    docker compose \
      -p "beelab_test" \
      --env-file "$BEELAB_ENV_FILE" \
      --profile "test" \
      "$@" )
}

# handy wrappers
dtup()   { dt up -d "$@"; }
dtdown() { dt down   --remove-orphans "$@"; }
dtstop() { dt stop "$@"; }
dtps()   { dt ps "$@"; }
dtlogs() { dt logs -f "$@"; }
# build images (optionally specify services, e.g. dcbuild web django)
dtbuild() { dt build "$@"; }

# generic exec: dcexec SERVICE [cmd...]
dtexec() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" ]] && { echo "Usage: dtexec SERVICE [cmd]"; return 1; }
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dt exec $tty_flags "$svc" "$@"
}

# django-specific: dcdjango [cmd...]
dtdjango() {
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dt exec $tty_flags django-tests "$@"
}



# run the full pytest suite (test profile)
# run the full pytest suite (test profile)
dttest() {
  dt run --rm django-tests pytest -q "$@"
}

dttestcov() {
  dt run --rm django-tests \
    pytest --cov=UserCore --cov=CompetenceCore --cov=PomoloBeeCore \
    --cov-report=term-missing \
    --cov-report=html:/app/media/test-coverage/user \
    --junitxml=/app/media/test-reports/junit_user.xml \
    -o cache_dir=/app/media/.pytest_cache -q "$@"
}

dttestfile() {
  local target="${1:-}"; shift || true
  [[ -z "$target" ]] && { echo "Usage: dctestfile path/to/test.py[::node]"; return 1; }
  dt run --rm django-tests pytest -q "$target" "$@"
}

dttestk() {
  local expr="${1:-}"; shift || true
  [[ -z "$expr" ]] && { echo "Usage: dctestk 'pattern'"; return 1; }
  dt run --rm django-tests pytest -q -k "$expr" "$@"
}

dttest_usercore() {
  dt run --rm django-tests pytest -q --ignore=PomoloBeeCore --ignore=CompetenceCore --cov=UserCore "$@"
}

dttestcov_usercore() {
  dt run --rm django-tests \
    pytest -q UserCore/tests \
    --cov=UserCore \
    --cov-report=term-missing \
    --cov-report=html:/app/media/test-coverage/user \
    --junitxml=/app/media/test-reports/junit_user.xml \
    -o cache_dir=/app/media/.pytest_cache "$@"
}

##########################################################
# DEVELOPPEMENT
########################################################
 

# Build + install a WP plugin from wordpress/plugin-src/<plugin>
# Usage:
#   makeplugin <plugin-name>
# Example:
#   makeplugin pomolobee
# Build a WP plugin from wordpress/plugin-src/<plugin>
# Usage:
#   compile_plugin <plugin> [host|docker]
#   makeplugin <plugin> [host|docker]
#
# If you omit the mode, we auto-detect:
#  - use "host" if npm exists
#  - otherwise fallback to "docker"
#
# You can override the Node image with: export BEELAB_NODE_IMAGE=node:20-bullseye

compile_plugin() {
  local plugin="${1:-}"; local mode="${2:-auto}"
  [[ -z "$plugin" ]] && { echo "Usage: compile_plugin <plugin> [host|docker]"; return 1; }

  local src="wordpress/plugin-src/$plugin"
  [[ -d "$src" ]] || { echo "Plugin not found: $src"; return 1; }
  [[ -f "$src/package.json" ]] || { echo "No package.json in $src — cannot build."; return 1; }

  # decide mode
  if [[ "$mode" == "auto" ]]; then
    if command -v npm >/dev/null 2>&1; then mode="host"; else mode="docker"; fi
  fi

  echo "[compile_plugin] plugin=$plugin mode=$mode"

  if [[ "$mode" == "host" ]]; then
    (
      set -euo pipefail
      cd "$_BEELAB_ROOT/$src"
      # install deps if needed
      if [[ -f package-lock.json ]]; then
        npm ci
      else
        npm install
      fi
      npm run build
    )
  elif [[ "$mode" == "docker" ]]; then
    local image="${BEELAB_NODE_IMAGE:-node:20-bullseye}"
    echo "[compile_plugin] using Docker image: $image"
    docker run --rm \
      -v "$_BEELAB_ROOT/$src":/app \
      -w /app \
      "$image" \
      bash -lc '
        set -euo pipefail
        if [[ -f package-lock.json ]]; then
          npm ci
        else
          npm install
        fi
        npm run build
      '
  else
    echo "Unknown mode: $mode (expected host|docker)"
    return 1
  fi

  echo "[compile_plugin] build completed for $plugin"
}

# Build + zip + install into WordPress
# Usage:
#   makeplugin <plugin> [host|docker]
makeplugin() {
  local plugin="${1:-}"; local mode="${2:-auto}"
  [[ -z "$plugin" ]] && { echo "Usage: makeplugin <plugin> [host|docker]"; return 1; }

  local src="wordpress/plugin-src/$plugin"
  [[ -d "$src" ]] || { echo "Plugin not found: $src"; return 1; }

  (
    set -euo pipefail
    cd "$_BEELAB_ROOT"

    # 1) compile (host or docker)
    compile_plugin "$plugin" "$mode"

    # 2) run plugin scripts
    cd "$src"
    [[ -x ./build_zip.sh ]]     || chmod +x ./build_zip.sh
    [[ -x ./install_plugin.sh ]]|| chmod +x ./install_plugin.sh

    ./build_zip.sh
    ./install_plugin.sh
  )

  echo "[makeplugin] done: $plugin"
}

# --- PomoloBee seeding (media + fixtures) ---
dcdjseed_pomolobee() {
  _beelab_ensure_django
  # Media: copy/symlink from script_db -> MEDIA_ROOT
  dcdjango python manage.py seed_pomolobee --mode copy --clear

  # Fixtures (order matters)
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_groups.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_superuser.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_farms.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_fields.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_fruits.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_rows.json
  # optional: demo-visible seed if you have it
  # dcdjango python manage.py loaddata PomoloBeeCore/fixtures/pomolobee_demo.json
}

# --- Competence seeding (media + data commands) ---
dcdjseed_competence() {
  _beelab_ensure_django
  dcdjango python manage.py seed_competence --mode copy --clear
  dcdjango python manage.py populate_data_init
  dcdjango python manage.py create_groups_and_permissions
  dcdjango python manage.py populate_teacher
  dcdjango python manage.py populate_translation
}

# Reseed everything
dcdjseed_all() { dcdjseed_pomolobee && dcdjseed_competence; }



# switch env in the same shell after sourcing: blenv dev|prod
blenv() { _beelab_set_env "$1" && echo "beelab env -> $BEELAB_ENV"; }

dchelp() {
  cat <<'EOF'
###### DOCKER ALIAS ##########
dcup                 # start current env stack
dcbuild              # build images (optionally: dcbuild web django)
dcdown               # stop stack (remove orphans)
dcstop SERVICE       # stop one service
dcps                 # docker compose ps
dclogs [SERVICE]     # follow logs for the whole stack or a service
dcexec SERVICE CMD   # exec inside a service (tty-aware)

###### DJANGO ##########
dcdjango CMD...      # run manage.py, shell, etc.
dcdjlogs             # follow django logs
dcdjup / dcdjdown    # start/stop django only
dcdjpwd USER [NEW]   # change password (interactive if NEW omitted)

###### WORDPRESS ######
dcwplogs | dcwplog   # follow wordpress logs
dcwpup / dcwpdown    # start/stop wordpress only
dcwp ARGS...         # run wp-cli (e.g. dcwp plugin list)
dcwpcachflush        # flush wp cache (object + /wp-content/cache)
dcwpcliup / dcwpclidown # start/stop wpcli sidecar
dcwpfixroutes        # fix home/siteurl, permalinks, flush rewrites

###### WEB (Next.js) ##
dcweblogs            # follow web logs
dcwebup / dcwebdown  # start/stop web only

###### TESTS (pytest) ###
dtup                 # start test stack
dtdown               # stop test stack (remove orphans)
dtstop               # stop one service in test stack
dtps                 # ps (test)
dtlogs               # logs (test)
dtbuild              # build (test)
dtexec SERVICE CMD   # exec (test)
dtdjango CMD...      # manage.py in django-tests container
dttest [args]        # run full pytest suite
dttestcov [args]     # run with coverage (UserCore/CompetenceCore/PomoloBeeCore)
dttestfile path[..]  # run a specific file/node
dttestk 'expr'       # run tests matching -k expression
dttest_usercore      # run only UserCore tests
dttestcov_usercore   # run UserCore tests with coverage

###### MISC ##########
blenv dev|prod       # switch env in this shell (updates compose flags)
EOF

if [[ "$BEELAB_ENV" == "dev" ]]; then
    cat <<'EOF'

################
###### DEVELOPMENT ##########
makeplugin <plugin>  # build and install WP plugin from wordpress/plugin-src/<plugin> 
# Build+install using host npm (if available)
makeplugin pomolobee
# Force Dockerized build (ignores host npm completely)
makeplugin pomolobee docker
# Just compile (no install/zip), then you can run scripts manually
compile_plugin pomolobee
# reseed everything
dcdjseed_all
# or only the plugin side
dcdjseed_pomolobee


EOF
fi
}





echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try:"
dchelp
