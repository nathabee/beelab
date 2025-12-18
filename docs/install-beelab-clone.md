# BeeLab — Wordpress clone Guide 

 
This document explains how to **update, reset, and clone BeeLab environments** using the standard scripts and aliases, with `install_clone.sh` as the orchestration point.

It covers **four core operations**:

1. Update Django backend from GitHub
2. Reset / rebuild Docker services from GitHub state
3. Clone WordPress style (theme) from a source to a target environment
4. Clone WordPress database and media uploads

Troubleshooting and recovery procedures live in a **separate document**.

---

## Assumptions

* You are logged in as the system user owning the BeeLab stack (usually `beelab`)
* Repository lives in `~/beelab`
* Docker is managed via BeeLab aliases
* You always source the environment explicitly (`dev` or `prod`)
* WordPress themes and plugins are treated as **ZIP artifacts**, not git-tracked runtime files

---

## Directory conventions

```
~/beelab/              # git repository
~/exports/             # backups & clones (DB + uploads)
  ├── wp-db/
  └── wp-files/
```

---

## 1) Update Django backend from GitHub

This updates **code only**, then rebuilds and migrates.

### Manual steps

```bash
cd ~/beelab
git pull
source scripts/alias.sh prod

dcbuild django-prod
dcup django-prod
dcdjango python manage.py migrate
```

### Typical use case

* Backend code change
* New migrations
* No schema corruption

---

## 2) Reset Docker services from GitHub state

Use this when:

* Dockerfiles changed
* Dependencies changed
* You want containers to reflect the repo exactly

```bash
cd ~/beelab
git pull
source scripts/alias.sh prod

dcbuild
dcup
```

This **does not touch databases** by itself.

---

## 3) Clone WordPress style (theme) from source → target

Goal: replace theme files and clear FSE DB overrides **without touching content**.

### 3.1 On source WordPress (usually DEV)

* Site Editor → Export theme
* You obtain a ZIP (source of truth)

---

### 3.2 On target environment (usually PROD)

```bash
source scripts/alias.sh prod
```

1. Switch temporarily to a core theme (keeps site stable):
UI-based:

* WP Admin → Appearance → Themes

alternative command :
```bash
dcwp theme activate twentytwentyfive
```

2. Remove FSE DB overrides + old theme files:

```bash
dcwpthemereset beelab-theme
```

3. Install new theme ZIP (UI-based):

* WP Admin → Appearance → Themes → Add New → Upload Theme

Alternative (file-based) :

```bash
dcwpthemeinstall /path/to/beelab-theme.zip beelab-theme
```

4. Reactivate your theme:

```bash
dcwp theme activate beelab-theme
```
 



6 . example:  

```bash
# source scripts/alias.sh prod
dcwp theme activate twentytwentyfive
dcwpthemereset beelab-theme
dcwpthemeinstall ~/path-to-zip/beelab-theme.zip beelab-theme
dcwp theme activate beelab-theme 
dcwpcachflush

```
---

## 4) Clone WordPress database and media uploads

Used for:

* Backups
* Cloning prod → dev
* Disaster recovery

### 4.1 Export from source (usually PROD)

Backup helper (`beelab-dump.sh`)

Run from `~` to snapshot WordPress state.

```bash
cp beelab/scripts/beelab-dump.sh ~
chmod +x beelab-dump.sh 

./beelab-dump.sh 
```


Artifacts are written to:

```txt
~/exports/wp-db/
~/exports/wp-files/
/tmp  (copy)
```

---

### 4.2 Restore into target (usually DEV)

```bash
source scripts/alias.sh dev
dcup

# copy the files from prod server (copy on /tmp) into ~/exports
dcwpdbrestore ~/exports/wp-db/prod.<timestamp>.sql
dcwpuploadsunzip ~/exports/wp-files/prod.<timestamp>.uploads.tgz --wipe
dcwpfixcloneurls 
```

 

---

## 5) Clone Tool


use `./scripts/install_clone.sh`
This script **orchestrates** the steps above.
It does not contain troubleshooting logic.

 

### How you should use it

For prod → dev clone: (we run on the dev server)

```bash
scripts/install_clone.sh --env dev --docker-up \
  --wp-db-restore ~/exports/wp-db/prod.sql \
  --wp-uploads-restore ~/exports/wp-files/prod_uploads.tgz --wp-uploads-mode --wipe \
  --wp-fix-clone-urls \
  --rewrite-flush --cache-flush
```

And for dev → prod clone: (we run on the prod server)

```bash
scripts/install_clone.sh --env prod --docker-up \
  --wp-db-restore ~/exports/wp-db/dev.sql \
  --wp-uploads-restore ~/exports/wp-files/dev_uploads.tgz --wp-uploads-mode --wipe \
  --wp-fix-clone-urls \
  --rewrite-flush --cache-flush
```

 

---

## What this document intentionally does NOT cover

* Migration corruption recovery
* Django schema drift fixes
* Manual SQL surgery
* Permission debugging
* Docker volume repair

Those belong in **install-beelab-troubleshooting.md**.

---

## Philosophy (important)

* **Git**: code only
* **ZIPs**: WordPress themes & plugins
* **DB + uploads**: explicit exports
* **Aliases**: single source of operational truth
 