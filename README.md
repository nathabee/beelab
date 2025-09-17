<a href="https://nathabee.github.io/beelab/index.html">
  <img src="./docs/beelab.svg" alt="BeeLab Logo" width="300" style="vertical-align:middle; margin-right:20px;">
  <img src="./docs/visitgithubpage.svg" alt="BeeLab Docs" width="300" style="vertical-align:middle;">
</a>



> [!WARNING]
> **Work in progress** — APIs, docs, and structure may change without notice.


[![status: work in progress](https://img.shields.io/badge/status-work_in_progress-orange)](#)




# BeeLab: Dockerized Multiservice (Django + Next.js plugins + WordPress + databases)



BeeLab provides a dockerized multi-service development stack:

* **Django 5** backend (REST API, JWT auth; apps: **UserCore**, **PomoloBeeCore**, **CompetenceCore**)
* **Next.js 14** frontend (calls Django)
* **PostgreSQL 16** for Django
* **WordPress 6 / PHP 8.3 (Apache)** with custom theme and plugins that interface with Django
* **MariaDB 11** for WordPress

Notes:

* “Competence” manages student development charts.
* “PomoloBee” helps farmers manage their orchards.

```mermaid
flowchart LR
  classDef svc fill:#eaf5ff,stroke:#1e88e5,color:#0b3a67;
  classDef db  fill:#fff8e6,stroke:#fb8c00,color:#5a3b00;
  classDef vol fill:#f6f6f6,stroke:#9e9e9e,stroke-dasharray:4 3,color:#333;
  classDef host fill:#ffffff,stroke:#bdbdbd,color:#333;

  subgraph Host["Host (localhost)"]
    direction TB
    H9080["localhost:9080 Web"]:::host
    H9001["localhost:9001 Django API"]:::host
    H9082["localhost:9082 WordPress"]:::host
  end

  subgraph Docker["Docker (default bridge network)"]
    direction LR

    Web["Next.js dev container: beelab-web port: 3000"]:::svc
    Django["Django dev server container: beelab-api port: 8000"]:::svc
    PG[("Postgres 16 service: db port: 5432")]:::db
    WP["WordPress 6 / PHP 8.3 container: beelab-wp port: 80"]:::svc
    WPDB[("MariaDB 11 service: wpdb port: 3306")]:::db

    Web -- "http://django:8000" --> Django
    Django -- "postgresql://app:app@db:5432/app" --> PG
    WP -- "wpdb:3306" --> WPDB

    Web --- VNM["volume: web_node_modules"]:::vol
    PG  --- VPG["volume: db_data"]:::vol
    WP  --- VWP["volume: wp_data"]:::vol
    WPDB --- VWPD["volume: wp_db_data"]:::vol

    Web --- BWEB["bind: ./web -> /app"]:::vol
    Django --- BDJ["bind: ./django -> /app"]:::vol
    WP --- BTH["bind: ./wordpress/wp-content/themes/pomolobee-theme -> /var/www/html/wp-content/themes/pomolobee-theme"]:::vol
    WP --- BPL["bind: ./wordpress/wp-content/plugins/pomolobee -> /var/www/html/wp-content/plugins/pomolobee"]:::vol
  end

  H9080 -->|"9080 -> 3000"| Web
  H9001 -->|"9001 -> 8000"| Django
  H9082 -->|"9082 -> 80"| WP
```

## Quickstart (dev)

<a href="https://github.com/nathabee/beelab/blob/main/docs/installation-vps.md" >
the exact installation manual on a VPS is available on docs/installation-vps.md
</a>

After installation you have acess to :

Service URLs (prod) : Example with domain nathabee.de:

* Django API: `https://beelab-api.nathabee.de`  (health: `/health`)
* Web (Next.js): `https://beelab-web.nathabee.de`
* WordPress: `https://beelab-wp.nathabee.de`

On a local LAN (dev), we do not use https, you may have used IP and port instead of subdomains :
* Django API: `http://localhost:9001`  (health: `/health`)
* Web (Next.js): `http://localhost:9080`
* WordPress: `http://localhost:9082`
 
to connect tpo WordPress admin : `https://beelab-wp.nathabee.de/wp-admin` use the wordpress login created precedently
activate the plugin you want ("competence WP" , "pomolobee WP") 
```bash
# for pomolobee plugin
docker compose exec django python manage.py changepassword pomofarmer
# for competence plugin
docker compose exec django python manage.py changepassword nathaprof
```
to test the plugins go to WordPress: `https://beelab-wp.nathabee.de/`, choose in the menu the plugin you want and enter login/password
 

to change some data in Django  `https://beelab-api.nathabee.de/admin` use the django login created precedently


## Screenshots

### Pomolobee Plugin in WordPress
<a href="./docs/screenshot_pomolobee_plugin.png">
  <img src="./docs/screenshot_pomolobee_plugin.png" alt="Pomolobee plugin screenshot" width="49%">
</a>

### Competence Plugin in WordPress
<a href="./docs/screenshot_competence_plugin.png">
  <img src="./docs/screenshot_competence_plugin.png" alt="Competence plugin screenshot" width="49%">
</a>

## Getting Started (detailled explanation)

### 0) Prerequisites

* Docker 24+ and Docker Compose v2


### 1) Clone the repo

```bash
git clone git@github.com:nathabee/beelab.git
cd beelab
mkdir -p ./django/media ./django/staticfiles
```

### 2) Configure

#### 2.1 Create `.env` at the project root

Use the provided example and adjust if needed:

```bash
cp .env.example .env
```

Tip: generate a strong Django key:

```bash
openssl rand -base64 48 | tr -d '\n'
# paste as SECRET_KEY=...
```


#### 2.2 Wordpress Logo (optional)

Put your logo at:

```
wordpress/wp-content/themes/pomolobee-theme/assets/images/logo.(png|svg)
```


#### 2.3 Skipping services or features (optional)

If you don’t want certain parts:

* Remove or reprofile the service in `compose.yaml` (e.g. move to a different profile).
* Remove unwanted WordPress plugins from `wordpress/wp-content/plugins` (e.g. `pomolobee`, `competence`).
* Remove unwanted Django apps (e.g. `PomoloBeeCore`, `CompetenceCore`) from `django/config/settings.py` `INSTALLED_APPS`.

If you do this, also adapt `compose.yaml` and any scripts that reference those components (e.g. `scripts/total-reset.sh`, fixtures, seed commands).

### 3) Run the installation script

```bash
chmod +x scripts/total-reset.sh
./scripts/total-reset.sh
```

This interactive script **fully rebuilds** the dev stack. It:

* Removes existing containers/images/volumes related to BeeLab.
* Builds images and starts all containers.
* Runs Django migrations and loads fixtures.
* Prepares three Django apps:

  * **UserCore** (user management)
  * **PomoloBeeCore** (orchard management)
  * **CompetenceCore** (student evaluation)
* Mounts host directories (code, static, media) for development.
* Prepares WordPress (theme and plugins are mounted; plugins are not auto-activated).
* Performs health checks.

You will be prompted to:

* Confirm destructive operations.
* Create a Django superuser.
* Complete the initial WordPress setup (superuser).

#### Services after install

* **Django API**: [https://beelab-api.nathabee.de](https://beelab-api.nathabee.de)  (health: `/health`, example: `/api/user/hello`)
* **Next.js frontend**: [https://beelab-web.nathabee.de](https://beelab-web.nathabee.de)
* **WordPress**: [https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de)

## What the script does (expanded)

### 3.1 Remove old BeeLab Docker environment

You’ll be asked to confirm. This can delete volumes (data loss).

### 3.2 Seed web dependencies (first run)

```bash
docker compose --profile dev run --rm web npm ci
```

Django/WordPress dependencies are handled by their images.

### 3.3 Build and start everything

```bash
docker compose --profile dev up -d --build
```

Starts: Postgres, Django (dev server), Next.js (dev server), MariaDB (wpdb), and WordPress (after `wpdb` is healthy).

### 3.4 Sanity checks

```bash
docker compose ps
curl -s https://beelab-api.nathabee.de/health
```

### 3.5 Complete WordPress installer (first run)

Open [https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de) and create the initial admin user.

### 3.6 Initialize Django data (first DB install)

Use fixtures/commands to seed required data: 
- createsuperuser
- execute some commands from  management/commands
- loaddata PomoloBeeCore/fixtures/initial_*.json
- load data into CompetenceCore using  management/commands
- seed image data from CompetenceCore/script_db/competence to upload (for wordpress)
- seed image data from PomoloBeeCore/script_db/pomolobee to media (for django)  

  
### 3.7 Apply WordPress site options with wp-cli
 

```bash
wordpress/scripts/wp-init.sh
```
This script sets permissions, activates the theme, updates permalinks, applies logo, etc.

## health check

* Django admin : [https://beelab-api.nathabee.de/admin](https://beelab-api.nathabee.de/admin) 
* Wordpress admin:  [https://beelab-wp.nathabee.de/wp-admin](https://beelab-wp.nathabee.de/wp-admin) 
* Wordpress: Log into [https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de) and verify the site loads.


* Run:
```bash
./scripts/health-check.sh
```

## Exporting Site Editor changes back into the theme

If you customize **Appearance → Editor**:

* Use **… → Tools → Export** to download the ZIP.
* Copy `theme.json`, `templates/`, `parts/` into:

```
wordpress/wp-content/themes/pomolobee-theme/
```

* Commit to Git.

## Useful commands

### Total dev reset (dangerous)

Deletes containers, images, volumes, then reinstalls:

```bash
./scripts/total-reset.sh
```

If WordPress files become owned by `www-data`, restore your user access:

```bash
sudo setfacl -R -m u:"$USER":rwx wordpress
sudo setfacl -R -d -m u:"$USER":rwx wordpress
```

### Logs / status

```bash
docker compose --profile dev ps -a
docker compose --profile dev logs -f django
docker compose --profile dev logs -f web
docker compose --profile dev logs -f wpdb
docker compose --profile dev logs -f wordpress
```

### Stop everything

```bash
docker compose --profile dev down
```

### Clean Django DB only (danger)

```bash
docker compose --profile dev down
docker volume rm beelab_db_data
docker compose --profile dev up -d
```

### Clean WordPress only (danger)

```bash
docker compose --profile dev stop wordpress wpdb
docker compose --profile dev rm -f wordpress wpdb
docker volume rm beelab_wp_db_data beelab_wp_data
docker compose --profile dev up -d wpdb wordpress
```

### Back up databases (Django and WordPress)

From the project root:

```bash
bash scripts/backup.sh
```

## WordPress plugins

### pomolobee

From `wordpress/plugin-src/pomolobee/`:

```bash
npm install
npm run build
```

Installation:

```bash
./build_zip.sh
./install_plugin.sh
```

Then in WP Admin ([https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de)):

* Go to **Plugins**, verify the plugin is present, and activate it.
* Go to **Settings → Competence Settings** to configure the API endpoint.
  In this dev stack, Django is at `https://beelab-api.nathabee.de/api`.

## Project structure

```text
beelab/
├─ compose.yaml
├─ .env
├─ django/                      # Django project (config + apps)
│  ├─ manage.py
│  ├─ config/
│  ├─ PomoloBeeCore/            # Orchard app
│  ├─ CompetenceCore/           # Student evaluation app
│  └─ UserCore/                 # Auth / user management
├─ web/                         # Next.js app (dev server)
│  ├─ app/
│  └─ package.json
├─ wordpress/
│  └─ wp-content/
│     ├─ themes/
│     │  └─ pomolobee-theme/    # theme.json, templates, assets, scripts
│     └─ plugins/
│        ├─ pomolobee/          # integrates Django PomoloBeeCore
│        └─ competence/         # integrates Django CompetenceCore
└─ (volumes managed by Docker)
   • db_data        (Postgres)
   • web_node_modules
   • wp_db_data     (MariaDB)
   • wp_data        (WordPress files)
   • media_data     (Django media)
```



---
 