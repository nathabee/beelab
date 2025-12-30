# Production backups/reestore (cron strategy)

This chapter defines a **safe, minimal, rotation-based backup policy** for WordPress production, designed to recover from:

* accidental content deletion
* DB corruption
* bad plugin/theme deployment
* operator error

It does **not** replace full server backups; it complements them.

---

## 1 Backup

### 1.1 Backup goals

We want:

1. **Daily backups** (fine-grained recovery)
2. **Short-term history** (last 7 days)
3. **Long-term snapshots** (first backup of each month, kept 12 months)
4. Zero interaction with dev
5. Files written outside containers

Artifacts to back up:

* WordPress database
* WordPress uploads (`wp-content/uploads`)

Themes and plugins are **not** backed up here (ZIP artifacts + Git are source of truth).

---

### 1.2 Backup location

On the prod host:

```txt
~/exports/
  ├── wp-db/
  │   ├── daily/
  │   └── monthly/
  └── wp-files/
      ├── daily/
      └── monthly/
```

This keeps backups human-readable and scriptable.

---

### 1.3 Backup mechanism (existing tooling)

We reuse existing aliases:

* `dcwpdbdump`
* `dcwpuploadszip`

No new Docker logic.

---

### 1.4 Backup script: `wp-backup.sh`

 
Make executable:

```bash
chmod +x ~/beelab/scripts/wp-backup.sh

```

---

### 1.5 Cron setup (production)

Edit crontab on the **prod host user** (`beelab`):

```bash
crontab -e
```

Add:

```cron
# BeeLab WordPress daily backup (03:15)
15 3 * * * /home/beelab/beelab/scripts/wp-backup.sh >> /home/beelab/exports/backup.log 2>&1
```

Notes:

* Runs once per day
* Uses local time
* Logs to a simple file
* No email spam

---

### 1.6 Restore policy (summary)

Restoration always uses **manual intent**. There is no automatic restore.

Typical scenarios:

* **Yesterday broke** → restore from `daily/prod.YYYY-MM-DD.*`
* **Older content regression** → restore from appropriate daily
* **Long-term recovery** → restore from `monthly/prod.YYYY-MM.*`

Restore procedure is exactly section **2** of this document.

---

### 1.7 What this intentionally does NOT do

* No encryption (handled by host / filesystem / external backups)
* No off-site replication
* No dev backups
* No theme/plugin backups
* No partial restores

Those are **separate concerns** by design.

---

### 1.8 Philosophy reminder

This backup strategy is:

* boring
* transparent
* reversible
* scriptable
* compatible with `install_clone.sh`

No magic. No silent mutations. No surprises.

 


---


## 2 Restore

This chapter explains how to **safely restore WordPress production or development** from the backups defined in Chapter 1.

Restores are always **explicit and manual**.
Nothing runs automatically.
Nothing guesses.

---

### 2.1 Restore principles (important)

Before restoring, understand these rules:

1. **Restoring is destructive**
   The WordPress database is dropped and recreated.

2. **Code is never restored**

   * Themes → ZIP artifacts
   * Plugins → ZIP artifacts
   * Backend → Git
     Only **content** is restored.

3. **DB and uploads belong together**
   Restoring only one is allowed, but should be intentional.

4. **URL fixing is environment-aware**
   After a prod → dev restore (or reverse), URLs must be normalized.

---

### 2.2 What can be restored

You can restore:

* WordPress database (SQL dump)
* WordPress uploads (`wp-content/uploads`)

You **do not** restore:

* themes
* plugins
* Docker volumes
* WordPress core
* Django or Next.js services

Those are rebuilt from Git / ZIPs.

---

### 2.3 Restore tooling (single source of truth)

All restores use **existing BeeLab aliases**:

* `dcwpdbrestore`
* `dcwpuploadsunzip`
* `dcwpfixcloneurls`
* Theme portability (dev only):
`dcwpthemezip_make_dev` (creates beelab-theme-dev.zip from the prod export)
`dcwpthemeinstall` (installs the dev ZIP so theme files are actually updated)

No raw `docker exec`, no manual SQL piping.

 


---

### 2.4 Restore script 

Use the dedicated restore helper:

```bash
scripts/wp-restore.sh
```

#### Usage

```bash
scripts/wp-restore.sh <dev|prod> <db.sql> <uploads.tgz> [--wipe|--keep]
```

Examples:

```bash
# Restore yesterday’s prod backup into dev
scripts/wp-restore.sh dev \
  ~/exports/wp-db/daily/prod.2025-12-17.sql \
  ~/exports/wp-files/daily/prod.2025-12-17.uploads.tgz \
  --wipe
```

```bash
# Restore monthly prod snapshot back into prod
scripts/wp-restore.sh prod \
  ~/exports/wp-db/monthly/prod.2025-12.sql \
  ~/exports/wp-files/monthly/prod.2025-12.uploads.tgz \
  --wipe
```

What the script does, in order:

1. Starts containers (`dcup`)
2. Drops and restores WordPress DB (`dcwpdbrestore`)
3. Restores uploads (`dcwpuploadsunzip`)
4. Fixes URLs according to environment (`dcwpfixcloneurls`)
5. In dev only: generates a dev-ready theme ZIP (dcwpthemezip_make_dev) and installs it (dcwpthemeinstall) to remove absolute prod asset URLs.
6. Flushes cache/rewrites (dcwpcachflush, wp rewrite flush --hard)


 
---

### 2.5 Manual restore (advanced / partial)

If you need more control, you may run steps manually.

#### Restore DB only

```bash
source scripts/alias.sh dev
dcup
dcwpdbrestore ~/exports/wp-db/daily/prod.2025-12-17.sql
dcwpfixcloneurls
```

Use this when:

* content changed but media didn’t
* uploads directory is known-good

---

#### Restore uploads only

```bash
source scripts/alias.sh dev
dcup
dcwpuploadsunzip ~/exports/wp-files/daily/prod.2025-12-17.uploads.tgz --wipe
```

Use this when:

* media files were deleted
* DB content is still valid

---

#### Restore Theme zip from dev to prod

```bash
source scripts/alias.sh dev
dcwpthemezip_make_dev
dcwpthemeinstall wordpress/build/beelab-theme-dev.zip beelab-theme
dcwpcachflush
```

### 2.6 Typical restore scenarios

| Scenario             | Action                                  |
| -------------------- | --------------------------------------- |
| Plugin broke content | Restore **DB + uploads** from yesterday |
| Media deleted        | Restore **uploads only**                |
| Long-term regression | Restore **monthly snapshot**            |
| Prod → dev debugging | Restore prod → dev + `dcwpfixcloneurls` |

---

### 2.7 What this restore does NOT do

* No merge restores
* No table-level restores
* No selective post restore
* No rollback of themes or plugins
* No Docker volume restore

Those belong to **infrastructure recovery**, not WordPress recovery.

---

### 2.8 Safety reminder

Before restoring into **prod**:

* Confirm the backup date
* Confirm environment (`source scripts/alias.sh prod`)
* Confirm nobody is editing content

Restores are fast. Mistakes are faster.

---

### 2.9 Philosophy reminder

Restore operations are:

* explicit
* repeatable
* environment-aware
* aligned with `install_clone.sh`

No magic.
No partial state.
No silent fixes.

---
 