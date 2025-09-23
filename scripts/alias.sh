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
# Tail wpcli logs (like you have for wordpress)
dcwpclogs()  { dclogs "$BEELAB_WPCLI_SVC" "$@"; }

# Exec into wpcli (auto-starts it)
dcwpcli() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" "$@"
}


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




dcwebup()   { dc up -d "$BEELAB_WEB_SVC"; }
dcwebdown() { dc stop  "$BEELAB_WEB_SVC"; }

# wpcli

dcwpcliup()   { dc up -d "$BEELAB_WPCLI_SVC"; }
dcwpclidown() { dc stop  "$BEELAB_WPCLI_SVC"; }

# Exec into wpcli (auto-starts it)
dcwpcli() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" "$@"
}



# List MEDIA inside containers (defaults to the root of media)
dcdjlsmedia() {
  local sub="${1:-}"
  dcexec "$BEELAB_DJANGO_SVC" bash -lc "ls -lAh --group-directories-first /app/media/${sub}"
}
dcwplsmedia() {
  local sub="${1:-}"
  dcexec "$BEELAB_WP_SVC" bash -lc "ls -lAh --group-directories-first /var/www/html/media/${sub}"
}

# Quick HTTP check from host
dcwpcurlmedia() {
  local path="${1:-/media}"
  curl -I "http://localhost:9082${path}"
}






###########################################################################
# TEST
#############################################################################
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
        #if [[ -f package-lock.json ]]; then
        #  npm ci
        #else
        #  npm install
        #fi
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
__obsolete_makeplugin() {
  local plugin="${1:-}"; local mode="${2:-auto}"
  [[ -z "$plugin" ]] && { echo "Usage: makeplugin <plugin> [host|docker]"; return 1; }

  local src="wordpress/plugin-src/$plugin"
  [[ -d "$src" ]] || { echo "Plugin not found: $src"; return 1; }

  (
    set -euo pipefail
    cd "$_BEELAB_ROOT"

    # 1) compile (host or docker)
    compile_plugin "$plugin" "$mode"
    # npm run build

    # 2) run plugin scripts
    cd "$src"
    [[ -x ./build_zip.sh ]]     || chmod +x ./build_zip.sh
    [[ -x ./install_plugin.sh ]]|| chmod +x ./install_plugin.sh
 
    ./build_zip.sh
    ./install_plugin.sh
  )

  echo "[makeplugin] done: $plugin"
}


###########################################################################
# DEVELOPMENT ANALYSIS
#############################################################################

# Flush WP object cache + clear file cache
dcwpcachflush() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc \
    'wp cache flush || true; rm -rf /var/www/html/wp-content/cache/* || true; echo "WP cache cleared."'
}


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


# Check if a plugin left any data behind (options, CPT posts, roles, etc.)
# Usage:
#   dcwpcheck_leftovers pomolobee
#   dcwpcheck_leftovers competence   # (extend map below if you want)
dcwpcheck_leftovers() {
  local slug="${1:-}"
  if [[ -z "$slug" ]]; then
    echo "Usage: dcwpcheck_leftovers <plugin-slug>"
    return 1
  fi

  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi

  # ---- per-plugin probes (extend as needed) ----
  # Default: no CPT, no options — override per plugin
  local opt_keys=()           # e.g. ("pomolobee_api_url" "pomolobee_other")
  local cpt=""                # e.g. "pomolobee_page"
  local roles=()              # e.g. ("pomolobee_manager" "pomolobee_editor")
  local crons=()              # e.g. ("pomolobee_cron")
  local transients_pattern="" # e.g. "^pomolobee_"

  case "$slug" in
    pomolobee)
      opt_keys=("pomolobee_api_url")
      cpt="pomolobee_page"
      crons=("pomolobee_cron")            # if you ever had one
      transients_pattern="^pomolobee_"
      roles=()                             # add if you create roles
      ;;
    competence)
      # Example — fill with real things if you have them
      opt_keys=("competence_settings")
      cpt="competence_item"
      ;;
    *)
      echo "ℹ️ No plugin-specific probes defined for '$slug'. Running generic checks only."
      ;;
  esac

  # ---- runner (handles single-site or multisite) ----
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail

check_site() {
  local url="$1"
  echo "============================"
  echo "Site: ${url:-(single-site)}"
  echo "============================"

  # Options
  if ((${#opt_keys[@]})); then
    for k in "${opt_keys[@]}"; do
      if wp ${url:+--url="$url"} option get "$k" >/dev/null 2>&1; then
        echo "❌ Option still exists: $k = $(wp ${url:+--url="$url"} option get "$k" 2>/dev/null)"
      else
        echo "✅ Option removed: $k"
      fi
    done
  fi

  # CPT posts
  if [[ -n "$cpt" ]]; then
    local cnt
    cnt=$(wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --format=count 2>/dev/null || echo 0)
    if [[ "$cnt" -gt 0 ]]; then
      echo "❌ $cpt posts remaining: $cnt"
      # show a few IDs/titles to inspect
      wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_title --posts_per_page=10 2>/dev/null || true
    else
      echo "✅ No $cpt posts remain"
    fi
  fi

  # Roles (presence only)
  if ((${#roles[@]})); then
    for r in "${roles[@]}"; do
      if wp ${url:+--url="$url"} role exists "$r" >/dev/null 2>&1; then
        echo "❌ Role still exists: $r"
      else
        echo "✅ Role removed: $r"
      fi
    done
  fi

  # Cron hooks (presence only)
  if ((${#crons[@]})); then
    for h in "${crons[@]}"; do
      if wp ${url:+--url="$url"} cron event list | grep -qE "^\s*$h\b"; then
        echo "❌ Cron hook still scheduled: $h"
      else
        echo "✅ Cron hook not found: $h"
      fi
    done
  fi

  # Transients by pattern (best-effort)
  if [[ -n "$transients_pattern" ]]; then
    # wp transient list is not always available; fall back to direct query if needed
    if wp ${url:+--url="$url"} cli has-command transient >/dev/null 2>&1; then
      local n
      n=$(wp ${url:+--url="$url"} transient list --search="$transients_pattern" --format=count 2>/dev/null || echo 0)
      if [[ "$n" -gt 0 ]]; then
        echo "❌ Transients matching $transients_pattern: $n"
      else
        echo "✅ No transients matching $transients_pattern"
      fi
    else
      # fallback SQL count
      local n
      n=$(wp ${url:+--url="$url"} db query --skip-column-names --quick \
        "SELECT COUNT(*) FROM $(wp ${url:+--url="$url"} db prefix --quiet)options WHERE option_name REGEXP '${transients_pattern}'" 2>/dev/null || echo 0)
      if [[ "$n" -gt 0 ]]; then
        echo "❌ Options matching $transients_pattern: $n"
      else
        echo "✅ No options matching $transients_pattern"
      fi
    fi
  fi
}

# import arrays and vars from the outer shell via env
declare -a opt_keys=('"${opt_keys[@]}"')
declare -a roles=('"${roles[@]}"')
declare -a crons=('"${crons[@]}"')
cpt="'"$cpt"'"
transients_pattern="'"$transients_pattern"'"

# multisite?
if wp core is-installed --network >/dev/null 2>&1; then
  while IFS= read -r url; do
    check_site "$url"
  done < <(wp site list --field=url)
else
  check_site ""  # single-site
fi
'
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


# Diagnose WP routing for a given SPA base path (default: pomolobee)
dcwproutediagnose() {
  local slug="${1:-pomolobee}"            # e.g. pomolobee
  local cpt="${2:-${slug}_page}"          # e.g. pomolobee_page
  local name="${3:-$slug}"                # expected post_name (e.g. pomolobee)

  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi

  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
slug="'"$slug"'"
cpt="'"$cpt"'"
name="'"$name"'"

echo "========================"
echo "🌐 Site basics"
echo "========================"
echo -n "home:     "; wp option get home
echo -n "siteurl:  "; wp option get siteurl
echo -n "permalinks: "; wp option get permalink_structure

echo
echo "========================"
echo "🔌 Active plugins"
echo "========================"
wp plugin list --status=active --field=name | sed "s/^/- /"

echo
echo "========================"
echo "🧱 Post type + content checks"
echo "========================"
if wp cli has-command "post-type"; then
  if wp post-type list --field=name | grep -qx "$cpt"; then
    echo "✅ CPT registered: $cpt"
  else
    echo "❌ CPT NOT registered: $cpt"
  fi
fi

echo -n "CPT post count ($cpt): "
wp post list --post_type="$cpt" --post_status=any --format=count || true
echo "First few:"
wp post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_name,post_title --posts_per_page=5 || true

echo
echo "========================"
echo "🧭 Slug collisions across types"
echo "========================"
wp db query --skip-column-names --quick "
SELECT ID, post_type, post_status, post_name, post_title
FROM $(wp db prefix --quiet)posts
WHERE post_name = '${name}'
ORDER BY FIELD(post_type, '${cpt}','page','post') DESC, ID ASC
LIMIT 10
"

echo
echo "========================"
echo "🔁 Rewrite rules containing /$slug"
echo "========================"
wp rewrite list | awk -v s="^'"$slug"'(/|$)" '\''$0 ~ s {print} '\'' || true

echo
echo "========================"
echo "❓ Is custom query var present?"
echo "========================"
wp eval "
global \$wp;
\$vars = \$wp->public_query_vars;
echo in_array(\"${cpt}\", \$vars, true) ? \"✅ query var '${cpt}' is public\n\" : \"ℹ️ query var '${cpt}' is NOT a public query var\n\";
"

echo
echo "========================"
echo "🧪 Parse-request simulation"
echo "========================"
SLUG="'"$slug"'" php <<'\''PHP'\''
<?php
require_once 'wp-load.php';
global $wp;

function simulate($path){
    $_GET = $_POST = [];
    $_SERVER['REQUEST_URI'] = $path;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    // Do not call $wp->init(); WP is already initialized by wp-load
    $wp->parse_request();
    echo "== $path ==\n";
    echo "matched_rule: ".($wp->matched_rule ?? "(none)")."\n";
    echo "matched_query: ".($wp->matched_query ?? "(none)")."\n";
    echo "query_vars: ".json_encode($wp->query_vars, JSON_UNESCAPED_SLASHES)."\n\n";
}

$slug = getenv("SLUG") ?: "pomolobee";
simulate("/{$slug}");
simulate("/{$slug}/");
simulate("/{$slug}/login");
simulate("/{$slug}/dashboard");
PHP

echo
echo "========================"
echo "🧰 Hard flush (no structure change)"
echo "========================"
wp rewrite flush --hard >/dev/null && echo "Flushed rewrite rules."

echo
echo "Done."
'
}



# switch env in the same shell after sourcing: blenv dev|prod
blenv() { _beelab_set_env "$1" && echo "beelab env -> $BEELAB_ENV"; }

dchelp() {
  cat <<'EOF'
###### MISC ##########
blenv dev|prod       # switch env in this shell (updates compose flags)

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
dcdjlsmedia          # List MEDIA inside containers (defaults to the root of media)

###### WORDPRESS ######
dcwplogs | dcwplog   # follow wordpress logs
dcwpup / dcwpdown    # start/stop wordpress only
dcwp ARGS...         # run wp-cli (e.g. dcwp plugin list)
dcwpcachflush        # flush wp cache (object + /wp-content/cache)
dcwpcliup / dcwpclidown # start/stop wpcli sidecar
dcwpfixroutes        # fix home/siteurl, permalinks, flush rewrites
dcwplsmedia          # List MEDIA inside containers (defaults to the root of media)

dcwpcheck_leftovers  # check if a plugin left any data behind (options, CPT posts, roles, etc.)
Usage:   dcwpcheck_leftovers pomolobee 

dcwproutediagnose pluginname  #diagnose the routing in wordpress for the plugin

dcwpcliup                 # ensure wpcli is running
dcwpclogs                 # watch why it might be stopping

# reseed everything
dcdjseed_all
# or only the plugin side
dcdjseed_pomolobee

# CLI tools
dcwpcli bash              # shell inside wpcli
dcwpcli wp plugin list    # run wp commands


########################################################
###### WEB (Next.js) ##
dcweblogs            # follow web logs
dcwebup / dcwebdown  # start/stop web only


EOF

if [[ "$BEELAB_ENV" == "dev" ]]; then
    cat <<'EOF'
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


 
###### DEVELOPMENT ##########
 to be listed

 




EOF
fi
}


#__obsolete_ <plugin>  # build and install WP plugin from wordpress/plugin-src/<plugin> 
# Build+install using host npm (if available)
#__obsolete_ pomolobee
# Force Dockerized build (ignores host npm completely)
#__obsolete_ pomolobee docker
# Just compile (no install/zip), then you can run scripts manually
#__obsolete_compile_plugin pomolobee


echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try:"
dchelp
