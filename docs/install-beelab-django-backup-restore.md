# Django Backup & Restore Strategy (BeeLab)

This document defines a **minimal and reliable backup/restore strategy** for the Django part of BeeLab.

It is designed to recover from:

* database corruption
* accidental data deletion
* failed migrations
* broken deployments

It complements WordPress backups and does **not** replace full server backups.

---

## 1. What is backed up

For Django, **only two things matter**:

### 1.1 Database (PostgreSQL)

* Contains all application data:

  * users
  * jobs
  * glyph metadata
  * configurations
* Backed up using `pg_dump`
* Stored as compressed SQL dumps

### 1.2 Media files (optional but recommended)

* User uploads and generated artifacts:

  * BeeFont scans
  * glyph SVGs
  * generated assets
* Stored as a `.tgz` archive

---

## 2. What is NOT backed up

Intentionally excluded:

* Django source code (Git is source of truth)
* Docker images / containers
* Python virtualenvs
* Static files (`collectstatic` output)
* Secrets (`.env.prod` must be stored safely elsewhere)

These are rebuilt during restore.

---

## 3. Backup script

### Script

```bash
scripts/django-backup.sh
```

### Usage

```bash
# DB only
scripts/django-backup.sh prod

# DB + media
scripts/django-backup.sh prod --media
```

### What it does

1. Dumps PostgreSQL database to `backups/django/`
2. Optionally archives Django media
3. Writes files **outside containers**

The script is environment-aware (`dev` or `prod`).

---

## 4. Restore script

### Script

```bash
scripts/django-restore.sh
```

### Usage

```bash
scripts/django-restore.sh <dev|prod> [db_dump.sql.gz] [--reset] [--media media.tgz]
```

If no DB file is provided, the **latest backup is used automatically**.

---

### Examples

#### Restore latest DB into dev

```bash
scripts/django-restore.sh dev
```

#### Restore specific DB dump into prod

```bash
scripts/django-restore.sh prod backups/django/beelab_prod_db_app_2025-12-17_031500.sql.gz
```

#### Full restore (DB + media) into dev

```bash
scripts/django-restore.sh dev \
  backups/django/beelab_prod_db_app_2025-12-17_031500.sql.gz \
  --media backups/django/beelab_prod_media_2025-12-17_031500.tgz
```

#### Hard reset + restore (schema drop)

```bash
scripts/django-restore.sh prod \
  backups/django/beelab_prod_db_app_2025-12-17_031500.sql.gz \
  --reset \
  --media backups/django/beelab_prod_media_2025-12-17_031500.tgz
```

---

## 5. Restore behavior (important)

The restore script performs, in order:

1. Starts required containers
2. Restores PostgreSQL database
3. Optionally drops and recreates the schema (`--reset`)
4. Optionally restores media files

⚠️ **Restore is destructive**. Existing DB contents are overwritten.

---

## 6. When to use `--reset`

Use `--reset` when:

* migrations are broken
* schema drift occurred
* you want a clean database state

Do **not** use it for routine restores unless needed.

---

## 7. Philosophy

This Django backup strategy is:

* minimal
* explicit
* reproducible
* aligned with WordPress backups
* compatible with Docker + Git workflows

No magic.
No container snapshots.
No hidden state.

--- 