# Developer Tips

## 0) One-time setup

This setup is supposed to be done during the beelab project initialisation (using total-reset.sh)

###  Environment files

#### Dev: `.env.dev`

Create it from the template and adjust ports, keys, etc.

```bash
cp .env.dev.example .env.dev
# edit .env.dev
```

Dev typically uses `http`, `localhost` + ports.

#### Prod: `.env.prod`

Create it from the template and set real domains, HTTPS, certs, secrets.

```bash
cp .env.prod.example .env.prod
# edit .env.prod
# change SSL key
# modify subdomains and domain for DNS
```

### Create Aliases

 make shortcuts in your `~/.bashrc` so you can switch quickly: 
```bash
# edit paths to your cloned repo
alias cdbeelab='cd ~/coding/project/docker/beelab'
alias beelab-dev='source ~/coding/project/docker/beelab/scripts/alias.sh dev'
alias beelab-prod='source ~/coding/project/docker/beelab/scripts/alias.sh prod'
```

Then, when you open a terminal:

```bash
cdbeelab
beelab-dev   # or beelab-prod
```
You can also switch inside the same shell any time with:

```bash
blenv dev     # or: blenv prod
```


## 1) load the aliases

When you open a terminal:

```bash
cdbeelab
beelab-dev   # or beelab-prod
```



---

## 2) Start / stop the stack

### Dev

```bash
beelab-dev
dcup              # start dev stack
dcps              # list services
dclogs            # follow all logs
dcdown            # stop stack (keeps volumes)
```

### Prod

```bash
beelab-prod
dcup              # start prod stack
dcps
dclogs
dcdown
```

**Rebuild after Dockerfile/compose changes:**

```bash
dcdown
dcup --build      # rebuild images and start
# (optional) dcup --build --no-cache
```

**Service-only start/stop (handy while iterating):**

```bash
# Django
dcdjup;   dcdjdown;   dcdjlogs

# WordPress
dcwpup;   dcwpdown;   dcwplogs

# Web (Next.js)
dcwebup;  dcwebdown;  dcweblogs
```

---

## 3) Dev vs Prod (big picture)

| Area                        | Dev                                                                  | Prod                                                      |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| **Code (Django / Next.js)** | Bind mounts (`./django:/app`, `./web:/app`) for instant reload.      | Baked into image; **no bind mounts**. Redeploy to change. |
| **DB**                      | Named volume `db_data`.                                              | Named volume `db_data_prod`.                              |
| **WordPress**               | `wp_data` + bind `./wordpress/wp-content`.                           | `wp_data_prod` only (no host bind).                       |
| **Static / Media**          | Mounted into WP (ro) from `./django/staticfiles` + `./django/media`. | Served from volumes or baked files; no host binds.        |
| **Logs**                    | `dcdjlogs`, `dcwplogs`, `dcweblogs`.                                 | Same aliases, different services.                         |

---

## 4) Django: migrations & static files

Make sure you’re in the right env first (`beelab-dev` or `beelab-prod`).

### Migrations

```bash
echo "🛠 makemigrations"
dcdjango python manage.py makemigrations --noinput

echo "🛠 migrate"
dcdjango python manage.py migrate --noinput
```

### Collect static (admin, etc.)

```bash
dcdjango python manage.py collectstatic --noinput
```

---

## 5) Django: fixtures / seeds
```bash
dcdjango python manage.py flush --no-input

dcdjseed_competence
```

---

## 6) Health checks

If you have the script:

```bash
./scripts/health-check.sh
```

Otherwise, quick manual checks 
### (dev):

* Web (Next.js): [http://localhost:9080](http://localhost:9080)
* Django API: [http://localhost:9001/health](http://localhost:9001/health)
* WordPress: [http://localhost:9082](http://localhost:9082)



### (prod):
* 🖥  Web:     [https://beelab-web.nathabee.de] (https://beelab-web.nathabee.de)
* 🔌 Django:  [https://beelab-api.nathabee.de] (https://beelab-api.nathabee.de)   (health: https://beelab-api.nathabee.de/health)
* 📝 WP:      [https://beelab-wp.nathabee.de] (https://beelab-wp.nathabee.de)
 
---

## 7) Django users & passwords

### Create superuser

```bash
dcdjango python manage.py createsuperuser
```

### Change a password (interactive)

```bash
dcdjango python manage.py changepassword <username>
```

### Change password (non-interactive helper)

```bash
# prompts if NEW omitted; otherwise sets directly
dcdjpwd <username> [NEW_PASSWORD]
```

### Quick inspect in shell

```bash
dcdjango python manage.py shell
# then:
from django.contrib.auth import get_user_model, authenticate
User = get_user_model()
print("USERNAME_FIELD =", User.USERNAME_FIELD)
print("auth by username:", authenticate(username="pomofarmer", password="DjangoPwd"))
```

---

## 8) Logs, exec & utilities

```bash
dclogs                 # follow all services
dclogs SERVICE         # follow a single service

# shortcuts:
dcdjlogs               # Django logs
dcwplogs               # WordPress logs  (alias: dcwplog)
dcweblogs              # Web logs

# exec inside a container:
dcexec SERVICE bash
dcexec SERVICE env
```

---

## 9) Cleaning up

* Stop and remove current env services:

```bash
dcdown                  # keeps volumes
dcdown --remove-orphans
```

* (Careful) remove dangling images/containers/networks:

```bash
docker system prune
# add -a to remove unused images too:
# docker system prune -a
```

* (Very careful) wipe **named volumes** for a full reset (data loss):
  Use your existing reset script or `docker volume rm ...`.

---

## 10) Notes on aliases (what they do)

* `dc*` wrappers always run `docker compose -p beelab_${env} --env-file .env.${env} --profile ${env}` from the repo root.
* `dcdjango` picks `django` in dev and `django-prod` in prod automatically.
* Same for WordPress (`wordpress`/`wordpress-prod`) and Web (`web`/`web-prod`).
* Use `blenv dev|prod` to switch the active env in the same shell.

---
 
Here’s a clean, copy-pasteable rewrite for your **Developer Tips** sections.

---

## 11) Django tests (pytest)

We ship a dedicated **test stack** (profile: `test`) that mirrors Django but includes pytest tools. Use the `dt*` aliases.

### Quick start

```bash
# 1) Load aliases in dev
source scripts/alias.sh dev

# 2) Build the test images
dtbuild

# 3) Start the test stack (db + django-tests)
dtup
```

### Run tests

```bash
dttest                  # run full pytest suite (quiet)
dttestk 'expr'          # run tests matching -k expression
dttestfile path[..]     # run a specific file/node

# Coverage
dttestcov               # full suite with coverage (UserCore/CompetenceCore/PomoloBeeCore)
dttest_usercore         # only UserCore tests
dttestcov_usercore      # UserCore tests with coverage
```

### Manage the test stack

```bash
dtps                    # docker compose ps (test)
dtlogs                  # follow logs (test)
dtexec SERVICE CMD      # exec into a test service
dtdjango CMD...         # run manage.py in django-tests (e.g., dtdjango python manage.py showmigrations)
dtdown                  # stop test stack (remove orphans)
```

> Coverage HTML reports are written inside the container under `/app/media/test-coverage/user` (per your aliases).

---

## 12) WordPress plugin

Use the `makeplugin` alias (available in **dev** only) to rebuild and deliver a plugin from `wordpress/plugin-src/<plugin>` into WordPress.

### Quick start

```bash
# 1) Load aliases in dev
source scripts/alias.sh dev

# 2) Ensure WordPress is up (optional)
dcwpup

# 3) Build & install (example: pomolobee)
makeplugin pomolobee
```

The plugin files are copied into `wp-content/plugins/<plugin>` (mounted into the container), so you can see them immediately at:

* Site: `http://localhost:8082/pomolobee`
* Admin: `http://localhost:8082/wp-admin`

If the page shows “unknown content,” first **activate the plugin** in **WP Admin → Plugins**.

### Troubleshooting

```bash
dcwplogs              # follow WordPress logs
dcwp plugin list      # list installed/active plugins via WP-CLI
dcwpcachflush         # flush WP object/file caches
dcwpfixroutes         # fix home/siteurl, set permalinks, flush rewrites
```

> Note: `install_plugin.sh` copies without preserving timestamps/ownership to avoid “Operation not permitted” errors when target files are owned by `www-data`.
