# Developer Workflow

This document explains the typical workflow when working with the **beelab** project.

---

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

## 1. Start the stack

Build and run everything:

```bash
beelab-dev (or beelab-prod)
dcbuild
dcup
````

Services:

* **Wordpress (+ React plugins)** → [http://localhost:9082](http://localhost:9082)
* **MariaDB** → internal service for Wordpress
* **Django API** → [http://localhost:9001](http://localhost:9001)
* **Postgres** → internal service  for Django
* **Web (Next.js)** → [http://localhost:9080](http://localhost:9080)

---
 

## 3. Database

Check schema:

```bash
dcdjango manage.py showmigrations
dcdjango manage.py dbshell
```

 

---

## 4. Create users

For authentication tests:

```bash
dcdjango manage.py createsuperuser"
```

---

## 5. Authentication flow

* **Login** (via Django):

  ```bash
  curl -s -X POST http://localhost:9001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"<user>","password":"<pass>"}'
  ```


  curl -s -X POST http://localhost:9001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'


* **Use token**:

  ```bash
  ACCESS=<token>
  curl -s http://localhost:9001/api/me -H "Authorization: Bearer $ACCESS"
  ```

* **Web frontend**:

  * Go to [http://localhost:9080](http://localhost:9080)
  * Fill in login form
  * Call “Who am I” → fetches `/api/me` through proxy

---

## 6. Stopping & cleaning

* Stop containers:

  ```bash
  dcdown
  ```
* Rebuild everything (clean):

  ```bash
  dcbuild
  ```
 
---

## 7. Development Tips

* **Hot reload** works in both Django and Next.js (mounted volumes).
* Use `dcdjlogs` to tail logs.
* If migrations fail because Postgres wasn’t ready → restart Django container:
```bash
dcdjdown
dcdjup
```

--- 

## 8. Exporting Site Editor changes back into the theme

If you customize **Appearance → Editor**:

* Use **… → Tools → Export** to download the ZIP.
* Copy `theme.json`, `templates/`, `parts/` into:

```
wordpress/wp-content/themes/pomolobee-theme/
```

* Commit to Git.

---

## 9. WordPress plugins
 
```bash
scripts/build-plugins.sh all

wp-admin → Plugins → Add New → Upload wordpress/build/pomolobee.zip and wordpress/build/competence.zip

Activate in wp-admin
```

Then in WP Admin ([https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de)):

* Go to **Plugins**, verify the plugin is present, and activate it.
* Go to **Settings → Competence Settings** to configure the API endpoint.
  In this dev stack, Django is at `https://beelab-api.nathabee.de/api`.

---
 