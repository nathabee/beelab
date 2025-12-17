# BeeLab — Install Troubleshooting & Partial Backend Install

This doc is for “something is off” situations: migrations say *OK* but tables are missing, fixtures fail, or you want to redeploy **only one Django app** without touching the rest.

## Scope and safety

These commands are **non-destructive by default**:
- `git pull`
- `dcbuild <service>` / `dcup <service>`
- `python manage.py migrate <app>`
- `loaddata` / your `dcdjseed_*` helpers

They **do not wipe** Postgres or MariaDB.

Destructive actions (dropping tables, deleting migration records) are documented under **Hard reset** and must be used deliberately.

---

## 0) Preconditions

- You are logged in as the system user that owns the dockerized environment (usually `beelab`)
- Repo is installed at `~/beelab`
- You use aliases via `source scripts/alias.sh <env>`

---

## 1) Quick diagnosis checklist

### 1.1 Confirm you’re in the right environment
```bash
cd ~/beelab
source scripts/alias.sh prod
