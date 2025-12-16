#!/usr/bin/env bash
# Django aliases for BeeLab
# This file is sourced by scripts/alias.sh

# must be sourced
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file must be sourced, not executed."
  exit 1
fi

# expects: _BEELAB_ROOT, dc, dclogs, dcexec, dcup, dcdown, dcstop, BEELAB_* vars

# -------------------------------------------------------------------
# SERVICE HELPERS (Django)
# -------------------------------------------------------------------
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

dcdjsuperuser() { dcdjango python manage.py createsuperuser; }

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
dcdjseed_beefont() {
  _beelab_ensure_django
  dcdjango python manage.py seed_beefont --mode copy --clear || true
  dcdjango python manage.py loaddata BeeFontCore/fixtures/initial_beefont_languages.json
  dcdjango python manage.py loaddata BeeFontCore/fixtures/initial_beefont_templates.json
  dcdjango python manage.py loaddata BeeFontCore/fixtures/initial_beefont_palettes.json
}
dcdjseed_all() { dcdjseed_pomolobee && dcdjseed_competence && dcdjseed_beefont; }

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
        beefontcore|beefont)       cores+=("BeeFontCore");;
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
      BeeFontCore)    echo "🌱 Seeding BeeFontCore ...";    dcdjseed_beefont ;;
      UserCore)       echo "🌱 Seeding UserCore fixtures ..."; __beelab_loaddata_all_json_in_core "UserCore" ;;
    esac
  done

  echo "🧺 collectstatic (best-effort) ..."
  dcdjango python manage.py collectstatic --noinput || true
  echo "✅ reseed finished. (mode=$mode cores=${cores[*]})"
}

# -------------------------------------------------------------------
# HELP SECTION (Django only)
# -------------------------------------------------------------------
dchelp_django() {
  cat <<'EOF'
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
dcdjsuperuser        # create a superuser

###### SEED / RESET ###
dcdjseed_pomolobee   # seed pomolobee core (media + fixtures)
dcdjseed_competence  # seed competence core (media + commands)
dcdjseed_beefont     # seed beefont core (media + fixtures)
dcdjseed_all         # seed all
dcdjmm               # makemigrations (dev) + migrate
dcdjreseed [mode] [cores]
  modes: --soft (default), --flush, --hard
  cores: CompetenceCore PomolobeeCore UserCore BeeFontCore

###### TESTS (dev only) ####
dtup / dtdown        # start/stop test stack
dtps / dtlogs        # ps / logs (test stack)
dtbuild              # build (test profile)
dtexec SERVICE CMD   # exec (test)
dtdjango CMD...      # manage.py in django-tests container
dttest [args]        # run full pytest suite
dttestcov [args]     # with coverage
dttestfile path[..]  # run specific file/node
dttestk 'expr'       # run tests matching -k expression
dttest_usercore
dttestcov_usercore
EOF
}
