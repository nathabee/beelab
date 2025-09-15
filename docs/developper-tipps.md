# Developper Tipps


## Environnement variable
 
### .env.dev file for a dev environment 

  
initialise the .env.dev.example 
cp .env.dev.example .env.dev 
 
 change values that are necessary (key,port...etc)


normally on a local LAN (dev) we will use http, IP adresse and port 
change the KEY as metionned in the .env file
adapt to get port and ipadress and port instaead of domains name
 

docker compose -p beelab_dev --env-file .env.dev --profile dev up -d

 

### .env.prod file for a prod environment
On a VPS: we use https, certbot , domains and subdomains
Change the KEY as metionned in the .env.prod file
 

initialise the .env.prod.example 
cp .env.prod.example .prod.dev 
 
 change values that are necessary (key,port...etc)


# prod
docker compose -p beelab_prod --env-file .env.prod --profile prod up -d





### Dev and Prod environment

****ATTENTION: PROD env not TESTED yet****

**Big picture**
- **Dev** = live-editable containers with your source code mounted from the host.
- **Prod** = immutable images (no code mounts); only data lives in volumes.

**Filesystem / data differences**

| Area | Dev | Prod |
| --- | --- | --- |
| **App code (Django / Next.js)** | Bind mounts: `./django:/app`, `./web:/app` → instant reload when you edit files. | **No bind mounts.** Code is baked into the image via the `prod` build stage. Redeploy to change code. |
| **Database** | Named volume `db_data` (persists across `up/down`). Not wiped unless you run `down --volumes`. | Same named volume `db_data` (persistent). Back it up before upgrades. |
| **WordPress content** | `wp_data` volume + bind mount `./wordpress/wp-content` for local editing. | **No host bind.** Only `wp_data` volume persists content. |
| **Static / media files** | Mounted into WP read-only: `./django/media` → `/var/www/html/media:ro`, `./django/staticfiles` → `/var/www/html/static:ro`. | **No host mounts.** Serve from a volume, CDN, or bake/collect into the image (your choice). |
| **node_modules (web)** | Separate named volume `web_node_modules` to keep installs fast. | Installed during build; not mounted at runtime. |
| **Permissions** | Containers often run as your host UID/GID to avoid write issues on mounted folders. | Runs as image user; app FS is read-only/immutable in practice (no edits inside container). |

**Commands you’ll use**
- Keep data: `docker compose down` (volumes stay)  
- Wipe data (dev only): `docker compose down --volumes`  
- Rebuild app code in **prod**: change code → `--build` (because code is in the image)

**Env tips**
- Dev typically uses `DEBUG=1`, localhost + ports, HTTP.
- Prod flips to `DEBUG=0`, real domains, HTTPS/forwarded-proto headers, stricter cookies.




## Docker files and yaml

if you change a Dockefile or compose.yaml, it culd be necessary to remove the image anmd start the build again
set -a; source ./.env; set +a
echo $PROFILE
cd ~/coding/project/docker/beelab
docker compose --profile dev down --remove-orphans
docker compose --profile dev up -d --build





## Django Modele and database change


if you change the modele (modele.py) , you will need to run the migration on docker again (migrate + makemigration)

 



### --- migrations -------------------------------------------------

set -a; source ./.env; set +a
echo $PROFILE
cd ~/coding/project/docker/beelab

# if necessary : give yourself ownership of the whole app folder (safe in dev)
# sudo chown -R "$USER":"$USER" django/UserCore

#if necessary : make sure the directory is writable
# chmod -R u+rwX,g+rwX django/UserCore/migrations

echo "🛠 Running makemigrations..."
docker compose --profile "$PROFILE"  exec django python manage.py makemigrations --noinput

echo "🛠 Running migrate..."
docker compose --profile "$PROFILE"  exec django python manage.py migrate --noinput


 

 

### --- load Static lib foradmin console ---------------------------------------  
# it creates the django/staticfiles (host) <- /app/static (container django)
docker exec -it beelab-api bash -lc "python manage.py collectstatic --noinput"


 




### --- load Pomolobee fixtures ---------------------------------------  
echo "📥 Loading fixtures into Django..."
set +e
docker compose exec django python manage.py seed_pomolobee --clear 
docker compose exec django python manage.py loaddata PomoloBeeCore/fixtures/initial_groups.json || echo "⚠️ superuser fixture failed"
docker compose exec django python manage.py loaddata PomoloBeeCore/fixtures/initial_superuser.json || echo "⚠️ superuser fixture failed"
docker compose exec django python manage.py loaddata PomoloBeeCore/fixtures/initial_farms.json   || echo "⚠️ farms fixture failed"
docker compose exec django python manage.py loaddata PomoloBeeCore/fixtures/initial_fields.json  || echo "⚠️ fields fixture failed"
docker compose exec django python manage.py loaddata PomoloBeeCore/fixtures/initial_fruits.json  || echo "⚠️ fruits fixture failed"
docker compose exec django python manage.py loaddata PomoloBeeCore/fixtures/initial_rows.json    || echo "⚠️ rows fixture failed"


#### --- load Competence fixtures --------------------------------------- 
docker compose exec django python manage.py seed_competence --clear  
docker compose exec django python manage.py populate_data_init || true
docker compose exec django python manage.py create_groups_and_permissions || true
docker compose exec django python manage.py populate_teacher || true
#docker compose exec django python manage.py create_translations_csv || true
docker compose exec django python manage.py populate_translation || true
set -e
 

### --- health checks ----------------------------------------------
echo "Run health checks now?" 
if [[ -x ./scripts/health-check.sh ]]; then
  ./scripts/health-check.sh
else
  echo "⚠️ ./scripts/health-check.sh not found or not executable skipping."
fi
 

## user 

 
### Create a superuser

```bash
docker compose exec django python manage.py createsuperuser
```

### Change a password

```bash
docker compose exec django python manage.py changepassword <username>

docker compose exec django python manage.py changepassword pomofarmer

docker compose exec django python manage.py changepassword nathaprof

```

### Inspect users / auth quickly

```bash
docker compose exec django python manage.py shell
# In shell:
from django.contrib.auth import get_user_model, authenticate
User = get_user_model()
print("USERNAME_FIELD =", User.USERNAME_FIELD)
print("auth by username:", authenticate(username="pomofarmer", password="DjangoPwd"))


 


