# beelab: Project Overview

## Status

This repo is a Dockerized multi-service playground, but **the majority of the development right now is in WordPress**:

* ✅ **WordPress**: custom child theme, two custom plugins, robust dev tooling (WP-CLI, init scripts, aliases).
* ✅ **Django API**: stable JWT auth + seeded data that the WP plugins consume.
* 💤 **Web (Next.js)**: minimal / basic scaffolding only.

---

## What is this project?

**beelab** explores a hybrid stack where **WordPress provides the site shell + custom apps (plugins)** while **Django** exposes APIs those apps consume. A separate **Next.js** app exists but is not the focus yet.

Goals:

* Hands-on **Docker Compose** with multiple services and profiles (dev/prod).
* Realistic **WP theme + plugin** development with local builds, WP-CLI, and scripted setup.
* A clean **Django REST** API with JWT auth for WP apps to talk to.
* Repeatable scripts/aliases for day-to-day dev ergonomics.

---

## Architecture

```plaintext
+-------------------+            +-------------------+
|  Web (Next.js)    |  (9080) ↔  |  Django API (DRF) |  (9001)
|  minimal for now  |            |  JWT + fixtures   |
+-------------------+            +-------------------+
                                      ↑
                                      │ REST
+-------------------+            +-------------------+
| WordPress (Apache)|  (9082) →  |  MariaDB (WP DB)  | (3306 internal)
| Theme + Plugins   |            +-------------------+
|  • competence     |
|  • pomolobee      |            +-------------------+
| WP-CLI sidecar    |  ← mounts  |  Postgres (Django)| (5432 internal)
+-------------------+            +-------------------+
```

Ports (dev): **WP 9082**, **API 9001**, **Web 9080**. Databases are internal.

---

## Deployment example

This git repository was installed on a VPS, you can access it there:
 
* WordPress Pomolobee plugin: [https://beelab-wp.nathabee.de/pomolobee](https://beelab-wp.nathabee.de/pomolobee)
* WordPress Competence plugin: [https://beelab-wp.nathabee.de/competence](https://beelab-wp.nathabee.de/competence)
* WordPress: [https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de)
* WordPress admin: [https://beelab-wp.nathabee.de/wp-admin](https://beelab-wp.nathabee.de/wp-admin)
* Django API: [https://beelab-api.nathabee.de/api](https://beelab-api.nathabee.de/api)
* Django Admin: [https://beelab-api.nathabee.de/admin](https://beelab-api.nathabee.de/admin)
* Django API health : [https://beelab-api.nathabee.de/health](https://beelab-api.nathabee.de/health)
* Swagger UI: [https://beelab-api.nathabee.de/api/docs/](https://beelab-api.nathabee.de/api/docs/)
* Download OpenAPI schema: [https://beelab-api.nathabee.de/api/schema/](https://beelab-api.nathabee.de/api/schema/)
* Next.js web: [https://beelab-web.nathabee.de](https://beelab-web.nathabee.de)

 
---

## WordPress (the main action)

* **Theme**: `beelab-theme` (child of Twenty Twenty-Five).

  * Header/nav integrates links to plugin pages (e.g. `/competence`, `/pomolobee`).
  * Custom logo/assets + base styling.
* **Plugins**:

  * `competence` — SPA-style bundle that calls the Django API (`/api` on 9001).
  * `pomolobee` — same pattern, separate app & routes.
* **Tooling**:

  * **WP-CLI sidecar** container with handy aliases:

    * `dcwp ...` to run WP-CLI (`dcwp plugin list`, `dcwp option get home`, etc.)
    * `dcwpcachflush` to flush object/file cache.
    * `dcwpfixroutes` / sane `.htaccess` + **pretty permalinks** guard.
  * **Init scripts** to set permalink structure, inject `.htaccess`, install/activate theme & plugins, and set logo.
* **Routing**:

  * Uses standard WP **pretty permalinks**.
  * Plugins mount their frontends on pages (`/competence`, `/pomolobee`) and talk to Django via the configured API base URL.

---

## Django API  

* **Django 5 + Django REST Framework**.
* JWT authentication endpoints:

  * `POST /api/user/auth/login`
  * `GET /api/user/me`
* Utility/seed commands to bootstrap data for the plugins.
* Health endpoint and basic CI-ready layout.

---

## Web (Next.js) – minimal (by design, for now)

* TypeScript + Next.js dev server on **9080**.
* A couple of demo routes (`/`, `/welcome`) and a simple “talk to backend” example.
* **Status**: intentionally deprioritized while the WP path leads the effort.

---

## Local development

```bash
# 1) Load aliases (choose env)
source scripts/alias.sh dev      # or: source scripts/alias.sh prod

# 2) Bring up current env
dcup

# 3) WordPress helpers
dcwp plugin list
dcwpcachflush
dcwp option get home
dcwpfixroutes    # ensures .htaccess + /%postname%/ and flushes rewrites

# 4) Logs (pick a service)
dcwplogs | dcdjlogs | dcweblogs

# 5) Exec into services when needed
dcexec wordpress bash
dcdjango python manage.py migrate
```

> Tip: if routes 404, run `dcwpfixroutes` (restores `.htaccess` + flushes rewrites) and verify permalinks.

---

## Current features

* **WP**: custom theme, two plugins, environment-aware init, WP-CLI workflow, caching & routing helpers.
* **API**: JWT login and user endpoints, seeds/fixtures used by plugins.
* **Web**: demo pages, basic fetch from API.

---

## Roadmap  

* Harden plugin routing (block/shortcode wrappers, guards, 404 fallbacks).
* Shared UI kit + i18n across `competence` and `pomolobee`.
* Plugin settings pages (admin) to configure API base URL, feature flags.
* E2E smoke tests (Cypress/Playwright) for WP pages hitting the API.
* Later: expand the Next.js app once WP apps stabilize.

---

## Why this project?

* To **learn Docker** with a realistic, multi-container setup.
* To **build real WP plugins + theme** that talk to a **Python API**.
* To keep a **clean separation of concerns** while iterating quickly.
* It’s a **sandbox**, not a production stack—perfect for experimenting.

---
