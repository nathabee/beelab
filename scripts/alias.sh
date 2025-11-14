# scripts/alias.sh
# Usage:  source scripts/alias.sh [dev|prod]
# Then:   dcdjango python manage.py changepassword pomofarmer
# Also:   dcup / dcdown / dcps / dclogs / dcexec
#         dcdjpwd USER [NEWPWD]
#         dcdjlogs | dcwplogs | dcweblogs
#         dcdjup|dcdjdown  dcwpup|dcwpdown  dcwebup|dcwebdown

# must be sourced
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file must be sourced, not executed. Use: source scripts/alias.sh [dev|prod]"
  exit 1
fi

# repo root (works no matter where you source from)
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

# initialize with arg or default dev
_beelab_set_env "${1:-dev}"

# switch env in the same shell after sourcing: blenv dev|prod
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

# generic exec: dcexec SERVICE [cmd...]
dcexec() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" ]] && { echo "Usage: dcexec SERVICE [cmd]"; return 1; }
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$svc" "$@"
}

# -------------------------------------------------------------------
# SERVICE HELPERS
# -------------------------------------------------------------------
_beelab_ensure_wpcli() {
  if [[ -z "$(dc ps -q "$BEELAB_WPCLI_SVC")" ]]; then
    dc up -d "$BEELAB_WPCLI_SVC"
  fi
}
_beelab_ensure_django() {
  if [[ -z "$(dc ps -q "$BEELAB_DJANGO_SVC")" ]]; then
    echo "Starting $BEELAB_DJANGO_SVC..."
    dc up -d "$BEELAB_DJANGO_SVC"
    sleep 1
  fi
}

# -------------------------------------------------------------------
# DJANGO
# -------------------------------------------------------------------
dcdjango() {
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_DJANGO_SVC" "$@"
}
dcdjlogs()   { dclogs "$BEELAB_DJANGO_SVC" "$@"; }
dcdjup()     { dc up -d "$BEELAB_DJANGO_SVC"; }
dcdjdown()   { dc stop  "$BEELAB_DJANGO_SVC"; }
dcdjlsmedia(){ dcexec "$BEELAB_DJANGO_SVC" bash -lc "ls -lAh --group-directories-first /app/media/${1:-}"; }

# Change Django password for a user:
# - Interactive:  dcdjpwd alice
# - Non-interactive: dcdjpwd alice "NewPass123!"
dcdjpwd() {
  local user="${1:-}"; local pwd="${2:-}"
  if [[ -z "$user" ]]; then echo "Usage: dcdjpwd USER [NEW_PASSWORD]"; return 1; fi
  if [[ -z "$pwd" ]]; then
    dcdjango python manage.py changepassword "$user"
  else
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

# Demo utilities
dcdjshow_demos() {
  dcdjango bash -lc '
python - <<PY
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
django.setup()
from django.utils import timezone
from UserCore.models import DemoAccount
now = timezone.now()
total = DemoAccount.objects.count()
active = DemoAccount.objects.filter(active=True).count()
expired = DemoAccount.objects.filter(expires_at__lte=now).count()
print(f"DemoAccounts -> total={total} active={active} expired={expired}")
for da in DemoAccount.objects.select_related("user").order_by("expires_at")[:10]:
    print(f"- {da.user.username:20} active={da.active} expires_at={da.expires_at.isoformat()}")
PY'
}
dcdjexpire_demo_all() {
  local flag="${1:-}"
  dcdjango bash -lc "
python - <<'PY'
import django, os
from datetime import timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.utils import timezone
from UserCore.models import DemoAccount
now = timezone.now()
qs = DemoAccount.objects.all()
updated = qs.update(expires_at=now - timedelta(seconds=1))
print('Set expires_at to past for', updated, 'DemoAccount(s).')
if '${flag}' == '--deactivate':
    deact = qs.update(active=False)
    print('Also deactivated', deact, 'DemoAccount(s).')
PY"
}
dcdjexpire_demo_user() {
  local user="${1:-}"; local flag="${2:-}"
  if [[ -z "$user" ]]; then echo "Usage: dcdjexpire_demo_user USERNAME [--deactivate]"; return 1; fi
  dcdjango bash -lc "
U='$user'
python - <<'PY'
import django, os
from datetime import timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.utils import timezone
from django.contrib.auth import get_user_model
from UserCore.models import DemoAccount
User = get_user_model()
try:
    u = User.objects.get(username=os.environ['U'])
except User.DoesNotExist:
    print('No such user:', os.environ['U']); raise SystemExit(1)
try:
    da = u.demo_account
except DemoAccount.DoesNotExist:
    print('User has no DemoAccount:', u.username); raise SystemExit(1)
da.expires_at = timezone.now() - timedelta(seconds=1)
print('Expired demo for', u.username)
if '${flag}' == '--deactivate':
    da.active = False
    print('Deactivated demo for', u.username)
da.save(update_fields=['expires_at','active'])
PY"
}
dcdjcleanup_demos() { dcdjango python manage.py cleanup_demo; }

# -------------------------------------------------------------------
# WORDPRESS
# -------------------------------------------------------------------
dcwplogs()   { dclogs "$BEELAB_WP_SVC" "$@"; }
dcwplog()    { dcwplogs "$@"; }
dcwpup()     { dc up -d "$BEELAB_WP_SVC"; }
dcwpdown()   { dc stop  "$BEELAB_WP_SVC"; }
dcwplsmedia(){ dcexec "$BEELAB_WP_SVC" bash -lc "ls -lAh --group-directories-first /var/www/html/media/${1:-}"; }
dcwpcurlmedia(){ local path="${1:-/media}"; curl -I "http://localhost:9082${path}"; }

dcwpcliup()   { dc up -d "$BEELAB_WPCLI_SVC"; }
dcwpclidown() { dc stop  "$BEELAB_WPCLI_SVC"; }
dcwpcli() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" "$@"
}
dcwp() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" wp "$@"
}
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
dcwpcheck_leftovers() {
  local slug="${1:-}"
  if [[ -z "$slug" ]]; then echo "Usage: dcwpcheck_leftovers <plugin-slug>"; return 1; fi
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi

  local opt_keys=() cpt="" roles=() crons=() transients_pattern=""
  case "$slug" in
    pomolobee)
      opt_keys=("pomolobee_api_url"); cpt="pomolobee_page"; crons=("pomolobee_cron"); transients_pattern="^pomolobee_"
      ;;
    competence)
      opt_keys=("competence_settings"); cpt="competence_item"
      ;;
  esac

  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
declare -a opt_keys=('"${opt_keys[@]@Q}"')
declare -a roles=('"${roles[@]@Q}"')
declare -a crons=('"${crons[@]@Q}"')
cpt="'"$cpt"'"
transients_pattern="'"$transients_pattern"'"
check_site() {
  local url="$1"
  echo "============================"
  echo "Site: ${url:-(single-site)}"
  echo "============================"
  if ((${#opt_keys[@]})); then
    for k in "${opt_keys[@]}"; do
      if wp ${url:+--url="$url"} option get "$k" >/dev/null 2>&1; then
        echo "❌ Option still exists: $k = $(wp ${url:+--url="$url"} option get "$k" 2>/dev/null)"
      else
        echo "✅ Option removed: $k"
      fi
    done
  fi
  if [[ -n "$cpt" ]]; then
    local cnt
    cnt=$(wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --format=count 2>/dev/null || echo 0)
    if [[ "$cnt" -gt 0 ]]; then
      echo "❌ $cpt posts remaining: $cnt"
      wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_title --posts_per_page=10 2>/dev/null || true
    else
      echo "✅ No $cpt posts remain"
    fi
  fi
  if ((${#roles[@]})); then
    for r in "${roles[@]}"; do
      if wp ${url:+--url="$url"} role exists "$r" >/dev/null 2>&1; then
        echo "❌ Role still exists: $r"
      else
        echo "✅ Role removed: $r"
      fi
    done
  fi
  if ((${#crons[@]})); then
    for h in "${crons[@]}"; do
      if wp ${url:+--url="$url"} cron event list | grep -qE "^\s*$h\b"; then
        echo "❌ Cron hook still scheduled: $h"
      else
        echo "✅ Cron hook not found: $h"
      fi
    done
  fi
  if [[ -n "$transients_pattern" ]]; then
    if wp ${url:+--url="$url"} cli has-command transient >/dev/null 2>&1; then
      local n
      n=$(wp ${url:+--url="$url"} transient list --search="$transients_pattern" --format=count 2>/dev/null || echo 0)
      [[ "$n" -gt 0 ]] && echo "❌ Transients matching $transients_pattern: $n" || echo "✅ No transients matching $transients_pattern"
    else
      local n
      n=$(wp ${url:+--url="$url"} db query --skip-column-names --quick \
        "SELECT COUNT(*) FROM $(wp ${url:+--url="$url"} db prefix --quiet)options WHERE option_name REGEXP '${transients_pattern}'" 2>/dev/null || echo 0)
      [[ "$n" -gt 0 ]] && echo "❌ Options matching $transients_pattern: $n" || echo "✅ No options matching $transients_pattern"
    fi
  fi
}
if wp core is-installed --network >/dev/null 2>&1; then
  while IFS= read -r url; do
    check_site "$url"
  done < <(wp site list --field=url)
else
  check_site ""
fi
'
}
dcwproutediagnose() {
  local slug="${1:-pomolobee}"
  local cpt="${2:-${slug}_page}"
  local name="${3:-$slug}"
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
slug="'"$slug"'"
cpt="'"$cpt"'"
name="'"$name"'"
echo "========================"; echo "🌐 Site basics"; echo "========================"
echo -n "home: "; wp option get home
echo -n "siteurl: "; wp option get siteurl
echo -n "permalinks: "; wp option get permalink_structure
echo; echo "========================"; echo "🔌 Active plugins"; echo "========================"
wp plugin list --status=active --field=name | sed "s/^/- /"
echo; echo "========================"; echo "🧱 Post type + content checks"; echo "========================"
if wp cli has-command "post-type"; then
  if wp post-type list --field=name | grep -qx "$cpt"; then echo "✅ CPT registered: $cpt"; else echo "❌ CPT NOT registered: $cpt"; fi
fi
echo -n "CPT post count ($cpt): "; wp post list --post_type="$cpt" --post_status=any --format=count || true
echo "First few:"; wp post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_name,post_title --posts_per_page=5 || true
echo; echo "========================"; echo "🧭 Slug collisions"; echo "========================"
wp db query --skip-column-names --quick "
SELECT ID, post_type, post_status, post_name, post_title
FROM $(wp db prefix --quiet)posts
WHERE post_name = '${name}'
ORDER BY FIELD(post_type, '${cpt}','page','post') DESC, ID ASC
LIMIT 10"
echo; echo "========================"; echo "🔁 Rewrite rules containing /$slug"; echo "========================"
wp rewrite list | awk -v s="^'"$slug"'(/|$)" '\''$0 ~ s {print} '\'' || true
echo; echo "========================"; echo "❓ Public query var?"; echo "========================"
wp eval "
global \$wp; \$vars = \$wp->public_query_vars;
echo in_array(\"${cpt}\", \$vars, true) ? \"✅ query var '${cpt}' is public\n\" : \"ℹ️ query var '${cpt}' is NOT a public query var\n\";"
echo; echo "========================"; echo "🧰 Hard flush"; echo "========================"
wp rewrite flush --hard >/dev/null && echo "Flushed rewrite rules."
echo; echo "Done."
'
}
dcwproute() {
  local path="${1:-/}"
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
P="'"$path"'"
php -r '\''require "wp-load.php"; global $wp;
  $_GET=$_POST=[];
  $_SERVER["REQUEST_URI"]=getenv("P");
  $_SERVER["REQUEST_METHOD"]="GET";
  $wp->parse_request();
  printf("=== %s ===\n", getenv("P"));
  printf("matched_rule:  %s\n", $wp->matched_rule ?? "(none)");
  printf("matched_query: %s\n", $wp->matched_query ?? "(none)");
  printf("query_vars:    %s\n", json_encode($wp->query_vars, JSON_UNESCAPED_SLASHES));'\''
'
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
# zero *file logs inside* a service container (paths you pass)
# Usage: dclogzero_in SERVICE /path/to/log [/path2 ...]
dclogzero_in() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" || $# -lt 1 ]] && { echo "Usage: dclogzero_in SERVICE /path [/path...]"; return 1; }
  local cmd="set -e; "
  for p in "$@"; do cmd+="if [[ -e '$p' ]]; then : > '$p' || true; echo 'zeroed: $p'; else echo 'missing: $p'; fi; "; done
  dcexec "$svc" bash -lc "$cmd"
}

# -------------------------------------------------------------------
# TEST STACK (pytest)
# -------------------------------------------------------------------
dt() {
  ( cd "$_BEELAB_ROOT" && \
    docker compose \
      -p "beelab_test" \
      --env-file "$BEELAB_ENV_FILE" \
      --profile "test" \
      "$@" )
}
dtup()    { dt up -d "$@"; }
dtdown()  { dt down --remove-orphans "$@"; }
dtstop()  { dt stop "$@"; }
dtps()    { dt ps "$@"; }
dtlogs()  { dt logs -f "$@"; }
dtbuild() { dt build "$@"; }
dtexec()  { local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi; dt exec $tty_flags "${1:?SERVICE}" "${@:2}"; }
dtdjango(){ local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi; dt exec $tty_flags django-tests "$@"; }
dttest()  { dt run --rm django-tests pytest -q "$@"; }
dttestcov(){
  dt run --rm django-tests \
    pytest --cov=UserCore --cov=CompetenceCore --cov=PomoloBeeCore \
    --cov-report=term-missing \
    --cov-report=html:/app/media/test-coverage/user \
    --junitxml=/app/media/test-reports/junit_user.xml \
    -o cache_dir=/app/media/.pytest_cache -q "$@"
}
dttestfile(){ local t="${1:-}"; shift || true; [[ -z "$t" ]] && { echo "Usage: dttestfile path/to/test.py[::node]"; return 1; }; dt run --rm django-tests pytest -q "$t" "$@"; }
dttestk()  { local k="${1:-}"; shift || true; [[ -z "$k" ]] && { echo "Usage: dttestk 'pattern'"; return 1; }; dt run --rm django-tests pytest -q -k "$k" "$@"; }
dttest_usercore(){
  dt run --rm django-tests pytest -q --ignore=PomoloBeeCore --ignore=CompetenceCore --cov=UserCore "$@"
}
dttestcov_usercore(){
  dt run --rm django-tests \
    pytest -q UserCore/tests \
    --cov=UserCore \
    --cov-report=term-missing \
    --cov-report=html:/app/media/test-coverage/user \
    --junitxml=/app/media/test-reports/junit_user.xml \
    -o cache_dir=/app/media/.pytest_cache "$@"
}

# -------------------------------------------------------------------
# SEEDING
# -------------------------------------------------------------------
dcdjseed_pomolobee() {
  _beelab_ensure_django
  dcdjango python manage.py seed_pomolobee --mode copy --clear
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_groups.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_superuser.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_farms.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_fields.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_fruits.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_rows.json
}
dcdjseed_competence() {
  _beelab_ensure_django
  dcdjango python manage.py seed_competence --mode copy --clear
  dcdjango python manage.py populate_data_init
  dcdjango python manage.py create_groups_and_permissions
  dcdjango python manage.py populate_demo 
}
dcdjseed_all() { dcdjseed_pomolobee && dcdjseed_competence; }

# DEV RESET / RESEED HELPERS
dcdjmm() {
  echo "🛠 django makemigrations/migrate (env=$BEELAB_ENV)"
  if [[ "$BEELAB_ENV" == "dev" ]]; then
    dcdjango python manage.py makemigrations --noinput || true
  else
    echo "ℹ️ skipping makemigrations (not dev)"
  fi
  dcdjango python manage.py migrate --noinput
}
__beelab_loaddata_all_json_in_core() {
  local core="${1:-}"
  local dir="${core}/fixtures"
  if [[ -d "$dir" ]]; then
    echo "📥 Loading fixtures from $dir ..."
    local f; for f in "$dir"/*.json; do
      [[ -f "$f" ]] || continue
      echo "  -> loaddata $f"
      dcdjango python manage.py loaddata "$f" || true
    done
  else
    echo "ℹ️ No fixtures dir: $dir"
  fi
}
dcdjreseed() {
  local mode="soft" args=()
  while (( "$#" )); do
    case "$1" in
      --soft|--flush|--hard) mode="${1#--}"; shift ;;
      -h|--help)
        cat <<'EOF'
Usage: dcdjreseed [--soft|--flush|--hard] [Core ...]
Cores: CompetenceCore PomolobeeCore UserCore (default: all)
--soft  : migrate, then seed
--flush : migrate, flush DB, then seed
--hard  : dc down -v (drop DB), dc up, migrate, then seed
EOF
        return 0;;
      *) args+=("$1"); shift ;;
    esac
  done
  local cores=()
  if ((${#args[@]}==0)); then
    cores=("CompetenceCore" "PomoloBeeCore" "UserCore")
  else
    for c in "${args[@]}"; do
      case "${c,,}" in
        competencecore|competence) cores+=("CompetenceCore");;
        pomolobeecore|pomolobee)   cores+=("PomoloBeeCore");;
        usercore|user)             cores+=("UserCore");;
        *) echo "⚠️ Unknown core: $c (skipping)";;
      esac
    done
  fi

  echo "🔁 dcdjreseed mode=$mode cores=${cores[*]}"
  if [[ "$mode" == "hard" ]]; then
    echo "💣 Bringing stack down and dropping volumes..."
    dcdown -v
    echo "🚀 Bringing stack up..."
    dcup -d
  fi

  _beelab_ensure_django
  dcdjmm

  if [[ "$mode" == "flush" ]]; then
    echo "🧹 Flushing DB ..."
    dcdjango python manage.py flush --no-input
  fi


  for c in "${cores[@]}"; do
    case "$c" in
      CompetenceCore) echo "🌱 Seeding CompetenceCore ..."; dcdjseed_competence ;;
      PomoloBeeCore)  echo "🌱 Seeding PomoloBeeCore ...";  dcdjseed_pomolobee ;;
      UserCore)       echo "🌱 Seeding UserCore fixtures ..."; __beelab_loaddata_all_json_in_core "UserCore" ;;
    esac
  done

  echo "🧺 collectstatic (best-effort) ..."
  dcdjango python manage.py collectstatic --noinput || true
  echo "✅ reseed finished. (mode=$mode cores=${cores[*]})"
}

# Generate BeeFont test sheets (PNG) into django/media/beefont/uploads
dcmakesheet() {
  if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    cat <<'EOF'
Usage:
  dcmakesheet --text "ABCDabcd0123" --outfile media/beefont/uploads/sheet.png
  dcmakesheet --grid 1 --rows 10 --cols 10 --outfile media/beefont/uploads/grid.png
  dcmakesheet --grid 1 --rows 3 --cols 10 --outfile media/beefont/uploads/grid_3x10.png

What gets drawn:

• Default GRID (10 × 10) fills row-major as:
  A B C D E F G H I J
  K L M N O P Q R S T
  U V W X Y Z a b c d
  e f g h i j k l m n
  o p q r s t u v w x
  y z 0 1 2 3 4 5 6 7
  8 9 ...

Tip: use --order BeeFontCore/services/templates/order/order_DE_8x10.json
EOF
    return 0
  fi
  dcdjango python scripts/make_font_sheet.py "$@"
}

 
# Run a BeeFont job with a local PNG; resolves common paths
# Run a BeeFont job with a local PNG; legacy smoke test (prefer dcbf_* for E2E)
dctestfont() {
  if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    cat <<'EOF'
dctestfont [image] [family] [template]
  • Quick smoke test for the BeeFont pipeline.
  • Prefer the dcbf_* helpers for full end-to-end flows.

Examples:
  dctestfont django/media/beefont/uploads/sheet.png BeeHand AUTO
  dctestfont django/media/beefont/uploads/grid_de.png BeeHand_DE A4_DE_8x10
EOF
    return 0
  fi

  local IMG_ARG="${1:-}" FAMILY="${2:-BeeHand}" TEMPLATE="${3:-AUTO}"

  # Resolve image path
  local CANDIDATES=()
  [[ -n "$IMG_ARG" ]] && CANDIDATES+=("$IMG_ARG")
  CANDIDATES+=(
    "sheet.png"
    "grid.png"
    "media/beefont/uploads/sheet.png"
    "media/beefont/uploads/grid.png"
    "django/media/beefont/uploads/sheet.png"
    "django/media/beefont/uploads/grid.png"
    "$(ls -t django/media/beefont/uploads/*.png 2>/dev/null | head -n1)"
  )
  local IMG=""
  for p in "${CANDIDATES[@]}"; do
    [[ -n "$p" && -f "$p" ]] && { IMG="$p"; break; }
  done
  if [[ -z "$IMG" ]]; then
    echo "❌ No input image found. Use dcmakesheet or pass a path."
    return 1
  fi

  local TOKEN; TOKEN="$(_bf_token)" || { echo "❌ Failed to obtain token"; return 1; }

  echo "🧪 BeeFont job:"
  echo "   image:    $IMG"
  echo "   family:   $FAMILY"
  echo "   template: $TEMPLATE"
  echo

  local RESP
  RESP=$(curl -fsS -H "Authorization: Bearer $TOKEN" \
    -F "image=@${IMG}" \
    -F "family=${FAMILY}" \
    -F "template_name=${TEMPLATE}" \
    "$(_bf_base)/jobs") || { echo "❌ request failed"; return 1; }

  if command -v jq >/dev/null 2>&1; then echo "$RESP" | jq .; else echo "$RESP"; fi

  echo
  echo "ℹ️  Prefer dcbf_* helpers for listing/polling/downloading."
  echo "✔  Check django/media/beefont/segments/ and builds/ for outputs."
}


# List templates (optionally filter by lang=DE|EN|FR…)
dclisttemplates() {
  local LANG="${1:-}"
  local URL="http://localhost:9001/api/beefont/templates"
  [[ -n "$LANG" ]] && URL="${URL}?lang=${LANG}"
  curl -sS "$URL" | (command -v jq >/dev/null && jq . || cat)
}

# Download a template PNG (blank|prefill) to ./template.png (or a given path)
# Simple alias to fetch a template PNG (supports blank|blankpure|prefill)
dcgettemplate() {
  local NAME="${1:?Usage: dcgettemplate TEMPLATE_NAME [blank|blankpure|prefill] [outfile.png]}"
  local MODE="${2:-blank}" OUT="${3:-template.png}"
  curl -fSs -H 'Accept: image/png' \
    "$(_bf_base)/templates/${NAME}/image?mode=${MODE}" \
    -o "$OUT" && echo "saved → $OUT"
}


# Poll a job (requires $SID)
dcjobget() {
  local SID="${1:?Usage: dcjobget SID}"
  local TOKEN
  TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ \
    | python -c 'import sys,json; print(json.load(sys.stdin)["access"])') || return 1
  curl -sS -H "Authorization: Bearer $TOKEN" \
    "http://localhost:9001/api/beefont/jobs/${SID}" | (jq . 2>/dev/null || cat)
}

# List my jobs
dcjoblist() {
  local TOKEN
  TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ \
    | python -c 'import sys,json; print(json.load(sys.stdin)["access"])') || return 1
  curl -sS -H "Authorization: Bearer $TOKEN" \
    "http://localhost:9001/api/beefont/jobs" | (jq . 2>/dev/null || cat)
}

# Download artifacts (ttf|zip)
dcjobdl() {
  local SID="${1:?Usage: dcjobdl SID ttf|zip [outfile]}"
  local WHAT="${2:?ttf|zip}"
  local OUT="${3:-out.${WHAT}}"
  local PATH_SEG
  case "$WHAT" in
    ttf) PATH_SEG="download/ttf" ;;
    zip) PATH_SEG="download/zip" ;;
    *) echo "second arg must be ttf|zip"; return 1 ;;
  esac
  curl -L -sS -o "$OUT" "http://localhost:9001/api/beefont/jobs/${SID}/${PATH_SEG}" \
    && echo "saved → $OUT"
}

# Segments listing (JSON)
dcsegments() {
  local SID="${1:?Usage: dcsegments SID}"
  local TOKEN
  TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ \
    | python -c 'import sys,json; print(json.load(sys.stdin)["access"])') || return 1
  curl -sS -H "Authorization: Bearer $TOKEN" \
    "http://localhost:9001/api/beefont/jobs/${SID}/segments" | (jq . 2>/dev/null || cat)
}

# ====================== BeeFont REST test helpers ============================
_bf_base() { echo "http://localhost:9001/api/beefont"; }

# Get a fresh token
_bf_token_fresh() {
  curl -sS -X POST "http://localhost:9001/api/user/auth/demo/start/" \
    | python -c 'import sys,json;print(json.load(sys.stdin)["access"])'
}

# Cached token helper (exports BEEFONT_TOKEN if missing)
_bf_token() {
  local resp status
  # -sS silent, --fail-with-body to keep body on 4xx
  resp=$(curl -sS --fail-with-body -X POST "http://localhost:9001/api/user/auth/demo/start/") || {
    echo "ERR: demo/start failed"; echo "$resp" >&2; return 1; }
  local tok; tok=$(printf '%s' "$resp" | jq -r '.access // empty')
  [[ -z "$tok" ]] && { echo "ERR: no .access in response: $resp" >&2; return 1; }
  printf '%s' "$tok"
}


# 1) List templates (optionally by language, default DE)
dcbf_templates() {
  local LANG="${1:-DE}"
  curl -sS "http://localhost:9001/api/beefont/templates?lang=${LANG}" | jq .
}


# 2) Download a template image (blank|prefill) to a file 
# Usage: dcbf_template_image A4_DE_8x10 [blank|blankpure|prefill] [outfile.png]
dcbf_template_image() {
  local NAME="${1:?template name missing}"
  local MODE="${2:-blank}" OUT="${3:-template.png}"
  local URL="$(_bf_base)/templates/${NAME}/image?mode=${MODE}"

  curl -fSs -H 'Accept: image/png' "$URL" -o "$OUT" || { echo "download failed"; return 1; }

  # Verify PNG
  if head -c 8 "$OUT" | xxd -p -c8 | grep -qi '^89504e470d0a1a0a$'; then
    echo "saved → $OUT"
  else
    echo "⚠ not a PNG (server likely returned an error page)."
    file "$OUT" 2>/dev/null || true
    return 1
  fi
}



# 4) Create a job from a scan/photo
#    Usage: dcbf_job_create django/media/beefont/uploads/scan.png BeeHand_DE A4_DE_8x10
#    Prints the JSON and exports SID (shell var) for this session.
# Create a job from a scan/photo; prints JSON and exports SID
# Usage: dcbf_job_create path/to/scan.png [FamilyName] [TemplateName]
dcbf_job_create() {
  local IMG="${1:?path to image missing}" FAMILY="${2:-BeeHand}" TPL="${3:-AUTO}"
  [[ -f "$IMG" ]] || { echo "image not found: $IMG"; return 1; }
  local TOKEN; TOKEN="$(_bf_token)" || { echo "failed to get token"; return 1; }

  local RESP
  RESP=$(curl -fsS -H "Authorization: Bearer $TOKEN" \
    -F "image=@${IMG}" -F "family=${FAMILY}" -F "template_name=${TPL}" \
    "$(_bf_base)/jobs") || { echo "❌ request failed"; return 1; }

  if command -v jq >/dev/null 2>&1; then echo "$RESP" | jq .; else echo "$RESP"; fi
  export SID="$(echo "$RESP" | python -c 'import sys,json;print(json.load(sys.stdin)["sid"])' 2>/dev/null)"
  [[ -n "$SID" ]] && echo "SID=$SID" || { echo "⚠ could not parse SID"; return 1; }
}


# 5) Poll a job until done/failed (default 60s timeout)
#    Usage: dcbf_job_poll $SID [timeout_seconds]
# Poll a job until done/failed (default 60s timeout)
# Usage: dcbf_job_poll SID [timeout_seconds]
dcbf_job_poll() {
  local SID="${1:?sid missing}" TIMEOUT="${2:-60}"
  local TOKEN; TOKEN="$(_bf_token)" || { echo "failed to get token"; return 1; }

  local start now status
  start=$(date +%s)
  while :; do
    now=$(date +%s)
    if (( now - start > TIMEOUT )); then
      echo "timeout ($TIMEOUT s)"; return 2
    fi
    local J
    J=$(curl -fsS -H "Authorization: Bearer $TOKEN" "$(_bf_base)/jobs/${SID}") || { echo "❌ poll failed"; return 1; }
    status=$(echo "$J" | python -c 'import sys,json;print(json.load(sys.stdin)["status"])' 2>/dev/null)
    (command -v jq >/dev/null && echo "$J" | jq .) || echo "$J"
    case "$status" in
      done|failed) return 0 ;;
      *) sleep 1 ;;
    esac
  done
}


# 6) Download artifacts (requires download endpoints in your API)
#    Usage: dcbf_download_ttf $SID out.ttf
#           dcbf_download_zip $SID bundle.zip
dcbf_download_ttf() {
  local SID="${1:?sid missing}" OUT="${2:-out.ttf}"
  curl -fSL -o "$OUT" "$(_bf_base)/jobs/${SID}/download/ttf" && echo "saved → $OUT"
}
dcbf_download_zip() {
  local SID="${1:?sid missing}" OUT="${2:-bundle.zip}"
  curl -fSL -o "$OUT" "$(_bf_base)/jobs/${SID}/download/zip" && echo "saved → $OUT"
}


# 7) List segments for a job (JSON). If your API supports ?zip=1 you can add a zip helper.
#    Usage: dcbf_segments $SID


dcbf_segments() {
  local SID="${1:?sid missing}"
  local TOKEN; TOKEN="$(_bf_token)" || { echo "failed to get token"; return 1; }
  curl -fsS -H "Authorization: Bearer $TOKEN" \
    "$(_bf_base)/jobs/${SID}/segments" | (jq . 2>/dev/null || cat)
}

dcbf_delete() {
  local SID="${1:?sid missing}"
  local TOKEN; TOKEN="$(_bf_token)" || { echo "failed to get token"; return 1; }
  curl -fsS -X DELETE -H "Authorization: Bearer $TOKEN" \
    "$(_bf_base)/jobs/${SID}" | (jq . 2>/dev/null || cat)
}


# One-shot DE demo:
#  - fetch DE template list
#  - download prefilled grid
#  - (you print/fill by hand)
#  - run job on a provided scan path
#  - poll, then download TTF & ZIP
# Usage: dcbf_demo_de path/to/scan.jpg [BeeHand_DE] [A4_DE_8x10]
# One-shot DE demo: list → fetch prefill → create → poll → download
# Usage: dcbf_demo_de path/to/scan.jpg [BeeHand_DE] [A4_DE_8x10]
dcbf_demo_de() {
  local SCAN="${1:?path to scan missing}" FAMILY="${2:-BeeHand_DE}" NAME="${3:-A4_DE_8x10}"
  mkdir -p django/media/beefont/uploads

  # ensure token cached for the session
  _bf_token >/dev/null || { echo "failed to get token"; return 1; }

  echo "#1 list DE templates"
  dcbf_templates DE || return 1

  echo "#2-a fetch prefilled template"
  dcbf_template_image "$NAME" prefill "django/media/beefont/uploads/prefill_${NAME}.png" || return 1


  echo "#2-b fetch blankpure template"
  dcbf_template_image "$NAME" blankpure "django/media/beefont/uploads/blank_${NAME}.png" || return 1


  echo "#3 submit job"
  dcbf_job_create "$SCAN" "$FAMILY" "$NAME" || return 1

  echo "#4 poll"
  dcbf_job_poll "$SID" 60 || return 1

  echo "#5 download artifacts"
  dcbf_download_ttf "$SID" "django/media/beefont/builds/${FAMILY}.ttf" || true
  dcbf_download_zip "$SID" "django/media/beefont/builds/${SID}_bundle.zip" || true

  echo "#6 testfont"
  dcbf_inspectfont ${FAMILY}  || true

  echo "Done. SID=$SID"
}

dcbf_inspectfont()
{
  local FONTNAME="${1:?Font name missing}"
  dcdjango python BeeFontCore/services/inspect_font.py   /app/media/beefont/builds/${FONTNAME}.ttf
 

}
# ============================================================================

# -------------------------------------------------------------------
# HELP DCBF
# -------------------------------------------------------------------
dcbfhelp() {
  cat <<'EOF'
# --- BeeFont testing quick guide --------------------------------------------


# Quick smoke tests
# • Plain line test:
#   dcmakesheet --text "ABCDabcd0123" --outfile django/media/beefont/uploads/sheet.png --grid 0
#   dctestfont django/media/beefont/uploads/sheet.png BeeHand AUTO
#
# • German grid test (order-driven):
#   dcmakesheet --grid 1 --rows 8 --cols 10 \
#     --order BeeFontCore/services/templates/order/order_DE_8x10.json \
#     --outfile django/media/beefont/uploads/grid_de.png
#   dctestfont django/media/beefont/uploads/grid_de.png BeeHand_DE A4_DE_8x10

# What dcmakesheet produces
# • --grid 0: a single centered text line (useful for AUTO detection).
# • --grid 1: a rectangular grid filled row-major with glyph targets.
#   When --order is provided, it maps tokens (e.g., Adieresis) to a printable char (Ä, etc.)
#   to align the visual sheet with the internal order/mapping.

# Verifying outputs
# • Segments: django/media/beefont/segments/<SID>/*.png
#   Expect token-named PNGs (A.png, germandbls.png, etc.). See _debug_boxes.png for AUTO mode.
# • Font files: django/media/beefont/builds/
#   BeeHand*.ttf and <SID>_bundle.zip (includes mapping.json and sample segments).
# • API poll:
#   curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:9001/api/beefont/jobs/$SID | jq .

# Troubleshooting
# • Path not found when generating sheets:
#   Use paths relative to the django container working dir:
#   BeeFontCore/services/templates/order/order_DE_8x10.json (not prefixed with django/).
# • Mapping/order mismatch:
#   Make sure template JSON refers to the correct order_file and mapping_file.
#   The sheet used for writing must visually match the order tokens used for segmentation.
# • Blank segments or early cut-off:
#   For AUTO mode use high-contrast text and avoid touching image borders.
#   For grid mode ensure the printed grid exactly matches the template’s rows/cols/margins.
# • Perspective or lighting issues:
#   Prefer the template endpoints and print them. Phone photos are supported, but keep
#   all four fiducial corners fully visible and the sheet flat; avoid shadows on cells.
# • fontforge missing:
#   Install fontforge-nox in the django image (apt-get install -y fontforge).
# • OpenCV headless:
#   Ensure opencv-contrib-python-headless is in requirements (already set).
# • Auth problems:
#   All helpers mint a fresh demo token via /api/user/auth/demo/start/. If calling manually,
#   pass Authorization: Bearer <access>.

# Minimal curl set (manual)
# TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ | python -c 'import sys,json;print(json.load(sys.stdin)["access"])')
# curl -sS -H "Authorization: Bearer $TOKEN" 'http://localhost:9001/api/beefont/templates?lang=DE' | jq .
# curl -sS -o blank.png 'http://localhost:9001/api/beefont/templates/A4_DE_8x10/image?mode=blank'
# curl -sS -H "Authorization: Bearer $TOKEN" \
#   -F image=@django/media/beefont/uploads/grid_de.png \
#   -F family=BeeHand_DE -F template_name=A4_DE_8x10 \
#   http://localhost:9001/api/beefont/jobs | jq .
# -----------------------------------------------------------------------------

# Typical flow
# 1) list all template available in deutsch
dcbf_templates DE

# 2-1) we choose the  A4_DE_8x10 template we look for a prefill template
dcbf_template_image A4_DE_8x10 prefill django/media/beefont/uploads/prefill_DE.png
 
# 2-2) Save a BLANK without number grid (no letters, mo number) to print and fill by hand:
dcbf_template_image A4_DE_8x10 blankpure django/media/beefont/uploads/blank_DE.png

# 2-3) alternative Save a BLANK grid (no letters) to print and fill by hand:
dcbf_template_image A4_DE_8x10 blank django/media/beefont/uploads/blank_DE.png


# 3) Print and fill sheet by hand (or mock with an editor)
# 4) dcbf_job_create path/to/scan.jpg BeeHand_DE A4_DE_8x10
# 5) dcbf_job_poll $SID 60
# 6) dcbf_download_ttf $SID django/media/beefont/builds/BeeHand_DE.ttf
# 7) Optional: dcbf_segments $SID
# 8) Optional: dcbf_delete $SID
 
EOF
}
 
# -------------------------------------------------------------------
# HELP
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

###### DJANGO ########
dcdjango CMD...      # run manage.py, shell, etc.
dcdjlogs             # follow django logs
dcdjup / dcdjdown    # start/stop django only
dcdjpwd USER [NEW]   # change password (interactive if NEW omitted)
dcdjlsmedia [subdir] # list MEDIA inside django container
dcdjshow_demos       # list DemoAccount summary
dcdjexpire_demo_user USER [--deactivate]
dcdjexpire_demo_all [--deactivate]
dcdjcleanup_demos    # run the cleaner NOW

###### WORDPRESS #####
dcwplogs | dcwplog   # follow wordpress logs
dcwpup / dcwpdown    # start/stop wordpress only
dcwp ARGS...         # run wp-cli (e.g. dcwp plugin list)
dcwpcachflush        # flush wp cache (object + /wp-content/cache)
dcwpcliup / dcwpclidown
dcwplsmedia [subdir] # list MEDIA inside wordpress container
dcwpcurlmedia [path] # HEAD request to WP media URL
dcwpfixroutes        # fix home/siteurl, permalinks, flush rewrites
dcwpcheck_leftovers <plugin-slug>
dcwproutediagnose [slug [cpt [post_name]]]
dcwproute /slug/path

###### WEB (Next.js) ##
dcweblogs            # follow web logs
dcwebup / dcwebdown  # start/stop web only

###### SEED / RESET ###
dcdjseed_pomolobee   # seed pomolobee core (media + fixtures)
dcdjseed_competence  # seed competence core (media + commands)
dcdjseed_all         # seed both cores
dcdjmm               # makemigrations (dev) + migrate
dcdjreseed [mode] [cores]
  modes: --soft (default), --flush, --hard
  cores: CompetenceCore PomolobeeCore UserCore (default: all)
  examples:
    dcdjreseed --flush CompetenceCore
    dcdjreseed --hard
    dcdjreseed PomoloBeeCore UserCore

###### TESTS (dev only) ####
dtup / dtdown        # start/stop test stack
dtps / dtlogs        # ps / logs (test stack)
dtbuild              # build (test profile)
dtexec SERVICE CMD   # exec (test)
dtdjango CMD...      # manage.py in django-tests container
dttest [args]        # run full pytest suite
dttestcov [args]     # with coverage (UserCore/CompetenceCore/PomoloBeeCore)
dttestfile path[..]  # run specific file/node
dttestk 'expr'       # run tests matching -k expression
dttest_usercore      # run only UserCore tests
dttestcov_usercore   # run UserCore tests with coverage
# --- BeeFont integration (Django ↔ REST ↔ WP simulation) ---
# Generate printable handwriting sheets and run font build jobs locally

dcmakesheet           # create test sheet PNGs using make_font_sheet.py
dcmakesheet --help    # usage guide (grid, order, text)
dcmakesheet --text "ABCDabcd0123" \
                    --outfile media/beefont/uploads/sheet.png --grid 0
# → simple 1-page sheet for unit tests

# Example: generate a full German 8×10 grid from order file
dcmakesheet --grid 1 --rows 8 --cols 10 \
            --order BeeFontCore/services/templates/order/order_DE_8x10.json \
            --outfile django/media/beefont/uploads/grid_de.png

# --- Font build test ---
# Uses the BeeFont REST API via demo JWT and uploads a local sheet
dctestfont                      # auto-picks ./sheet.png or media/beefont/uploads/sheet.png
dctestfont --help
dctestfont django/media/beefont/uploads/grid_de.png BeeHand_DE A4_DE_8x10
# → triggers full backend flow: upload → segmentation → fontforge build → zip bundle
#   Check results in django/media/beefont/segments/ and django/media/beefont/builds/
dcbf_inspectfont FONTNAME check font
dcbfhelp   # show help about REST test with django beefont with dcbf alias

EOF
}

echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try:"
dchelp
