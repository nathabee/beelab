Here’s an updated version of your manual that matches your **current reality**:

* theme files are the source of truth for **style/templates/parts**
* navigation is **not** part of the ZIP (and should not be deleted)
* dev and prod are Dockerized; prod writes into volumes/containers, so install must use `dcwpthemeresetinstallzip`
* WordPress DB is **MariaDB** (`wpdb` / `wpdb-prod`), and “exact same DB” requires dump/restore (not WP export)

You can paste this as `BeeLab_FSE_Workflow.md`.

---

# BeeLab — WordPress FSE Workflow

## Purpose

This guide defines a reproducible workflow for a Full Site Editing (FSE) block theme in BeeLab:

* **Design** in the WordPress Site Editor (usually in dev).
* **Export** once as a ZIP (artifact).
* **Reset** database overrides (templates/parts/styles) so files become authoritative.
* **Install** the ZIP into any environment (dev, prod, future envs).

Navigation and other content (posts/pages/uploads) are treated separately.

## Core rules

* The ZIP export contains **theme design files** (templates/parts/theme.json/styles), but **not** navigation menus reliably.
* DB cleanup targets **only FSE override post types**:

  * `wp_template`, `wp_template_part`, `wp_global_styles`
* **Do not delete** navigation (`wp_navigation`) in this workflow.
* In BeeLab, WordPress uses **MariaDB**, not Postgres (Postgres is for Django).

---

## Phase 0 — Definitions

* **Source environment**: where you edit the theme in Site Editor (usually `dev`)
* **Target environment**: where you reinstall (dev/prod/etc.)
* **Artifact**: the exported FSE ZIP from Site Editor

---

## Phase 1 — Export artifact from source environment (UI)

### Prepare the environment (example: dev)

```bash
cd ~/beelab
source scripts/alias.sh dev
dcup
```

### Export ZIP in WordPress UI

* Appearance → Editor
* Open any template (or just the editor)
* Top-right `⋮` → **Export**
* Download ZIP

Store it:

```text
_exports/wp-fse/beelab-fse-source.zip
```

Important:

* The export is the design artifact (theme files).
* Navigation may not be included; assume it is **not portable**.

---

## Phase 2 — Reset FSE DB overrides (target environment)

This removes “customizations stored in DB” so the theme files win.

### Run the reset (env-agnostic)

```bash
source scripts/alias.sh <dev|prod>
dcup
dcwpthemeresetdb
```

What this does:

* Deletes only: `wp_template`, `wp_template_part`, `wp_global_styles`
* Flushes cache and rewrite rules
* Keeps navigation and all content intact

Optional verification:

```bash
dcwp post list --post_type=wp_template --format=count
dcwp post list --post_type=wp_template_part --format=count
dcwp post list --post_type=wp_global_styles --format=count
dcwp post list --post_type=wp_navigation --format=count
```

Expected after reset:

* templates/parts/styles counts → **0**
* navigation count → **unchanged**

---

## Phase 3 — Install artifact ZIP into an environment

In BeeLab, the correct method is to install the ZIP **into the running containers** (works for dev and prod) using the alias you added.

### Install (env-agnostic)

```bash
source scripts/alias.sh <dev|prod>
dcup
dcwpthemeresetinstallzip /path/to/beelab-fse-source.zip beelab-theme
```

Notes:

* `beelab-theme` is your theme directory name under `/wp-content/themes/`.
* This installs files inside the WordPress volume via the `wpcli` container.
* This avoids “host cp works in dev but not in prod” problems.

---

## Phase 4 — Verification

### Check that DB overrides are gone

```bash
dcwp post list --post_type=wp_template --format=count
dcwp post list --post_type=wp_template_part --format=count
dcwp post list --post_type=wp_global_styles --format=count
```

Expected:

```text
0
0
0
```

### Check the site

* Frontend should match the exported design.
* Site Editor should now reflect file-based templates (but can still cache; reload hard if needed).

---

## Important limitations

### Navigation is not reliably portable

* Navigation menus are stored as `wp_navigation` posts in the DB.
* Exported theme ZIP usually does not include them.
* Therefore:

  * either recreate navigation per environment, or
  * clone the database (see below), or
  * make templates independent of navigation `ref` (best long-term)

### Media uploads are not in the ZIP

If templates reference images in `/wp-content/uploads/...`, you must migrate uploads separately.

---

# Cookbook A — “Dev is master for design”, apply design to prod

1. Export ZIP from dev (UI)
2. Reset prod FSE overrides
3. Install ZIP into prod

```bash
# prod
source scripts/alias.sh prod
dcup
dcwpthemeresetdb
dcwpthemeresetinstallzip _exports/wp-fse/beelab-fse-source.zip beelab-theme
```

Result:

* Prod keeps its navigation/content
* Prod gets the design files from dev

---

# Cookbook B — Clone prod WordPress content into dev (exact DB IDs)

Use this when:

* You want dev to match prod content *exactly* (posts/pages/nav IDs preserved)
* You accept this is destructive to dev WordPress DB and uploads

### 1) Dump WordPress DB + uploads from the source environment (prod)

```bash
source scripts/alias.sh prod
dcup

dcwpdbdump ./_exports/wp-db/wp.sql
dcwpuploadszip ./_exports/wp-files/uploads.tgz
```

### 2) Restore into the target environment (dev)

```bash
source scripts/alias.sh dev
dcup

dcwpdbrestore ./_exports/wp-db/wp.sql
dcwpuploadsunzip ./_exports/wp-files/uploads.tgz --wipe
```

### 3) Fix URLs in dev content (only if you see prod URLs in dev pages)

Because `WP_HOME/WP_SITEURL` are defined by env config in BeeLab, `option update home/siteurl` may be irrelevant, but content can still embed absolute URLs:

```bash
dcwp search-replace "https://beelab-wp.nathabee.de" "http://localhost:9082" --all-tables --precise
dcwp rewrite flush --hard
dcwpcachflush
```

---

# Troubleshooting notes

## “Site renders correctly but Site Editor doesn’t show my file change”

Cause: the editor may still be showing DB overrides or cached state.

Fix:

1. Ensure overrides are removed:

   ```bash
   dcwpthemeresetdb
   ```
2. Flush cache:

   ```bash
   dcwpcachflush
   ```
3. Hard reload the editor (browser).

## “home/siteurl update says unchanged”

BeeLab defines `WP_HOME` and `WP_SITEURL` in `WORDPRESS_CONFIG_EXTRA`. That can override DB values. Use `search-replace` for embedded URLs instead.

---

## Summary invariants

* **Design**: files installed from ZIP
* **DB overrides**: must be **0**
* **Navigation/content/uploads**: separate lifecycle (keep per env or clone via DB dump/restore)

---

If you want, I can also rewrite your `dcwpthemeresetinstallzip` so it prints what it actually extracted (theme folder name, files copied) and fails if the ZIP doesn’t contain `theme.json` or `templates/`. That prevents “silent half installs.”
