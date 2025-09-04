# Django Service (Backend API)

The **django** service exposes the REST API and JWT authentication.

* Framework: **Django 5** + **Django REST Framework**
* Auth: **JWT** via `djangorestframework-simplejwt`
* Base URL (host): **[http://localhost:9001](http://localhost:9001)**
* API prefixes:

  * **UserCore** → `/api/user/`
  * **PomoloBeeCore** → `/api/pomolobee/`
  * **CompetenceCore** → `/api/competence/`
* Docs (if enabled): `/api/docs/`
* Health: `/health`

## Endpoints (selected)

### UserCore

* `GET  /api/user/health` — simple health check
* `GET  /api/user/hello` — sanity endpoint
* `POST /api/user/auth/login` — body: `{"username": "...", "password": "..."}` → returns `{access, refresh}`
* `POST /api/user/auth/refresh` — body: `{"refresh": "…"}` → returns `{access}`
* `GET  /api/user/me` — requires `Authorization: Bearer <access>` → current user info

### PomoloBeeCore (examples)

* `GET  /api/pomolobee/farms/`
* `GET  /api/pomolobee/fields/`

### CompetenceCore (examples)

* `GET    /api/competence/eleves/`
* `PATCH  /api/competence/fullreports/{id}/` (JWT required)

> Tip: keep your frontend base URL consistent to avoid `//` joins:
>
> * Either set `baseURL=http://localhost:9001/api` and call `user/…`, `competence/…`
> * Or set `baseURL=http://localhost:9001` and call `/api/user/…`, `/api/competence/…`

## Database

* Engine: **PostgreSQL 16** (compose service `db`)
* DSN (in-container): `postgresql://app:app@db:5432/app`
* Migrations run via `manage.py migrate`
* Users are managed via Django auth (custom user model in **UserCore**)

## Media/static files (shared to WordPress)

You’re using **host bind mounts**, not a named volume:

* Django writes media to **`/app/media`** (host: `./django/media`)
* Django static collected to **`/app/staticfiles`** (host: `./django/staticfiles`)
* WordPress (Apache) reads those same host dirs mounted **read-only** at:

  * `/var/www/html/media`  → media served at `http://localhost:9082/media/...`
  * `/var/www/html/static` → static served at `http://localhost:9082/static/...`
* Django settings must match:

  * `MEDIA_ROOT=/app/media`, `MEDIA_URL=/media/`
  * `STATIC_ROOT=/app/staticfiles`, `STATIC_URL=/static/`

If you prefer a named volume (e.g. `media_data`) you can switch in compose, but current setup is host binds.

## Admin tasks

### Create a superuser

```bash
docker compose exec django python manage.py createsuperuser
```

### Change a password

```bash
docker compose exec django python manage.py changepassword <username>
```

### Inspect users / auth quickly

```bash
docker compose exec django python manage.py shell
# In shell:
from django.contrib.auth import get_user_model, authenticate
User = get_user_model()
print("USERNAME_FIELD =", User.USERNAME_FIELD)
print("auth by username:", authenticate(username="pomofarmer", password="DjangoPwd"))
```

## JWT quick test with curl

### 1) Get a token

```bash
# Replace creds with a real user (superuser or fixture)
curl -s -X POST http://localhost:9001/api/user/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"pomotest","password":"pomotest"}' | tee /tmp/token.json

ACCESS=$(jq -r '.access' /tmp/token.json)
echo "$ACCESS" | grep -qE '^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+' || echo "Login failed or jq missing"
```

### 2) Call a protected endpoint

```bash
curl -s -H "Authorization: Bearer $ACCESS" \
  http://localhost:9001/api/competence/eleves/ | jq
```

## Managing users for apps

Open **Django admin**: `http://localhost:9001/admin` (login with your Django superuser)

* **PomoloBee**:

  * Assign roles properly (e.g. `farmer`, optionally `admin`).
* **Competence**:

  * Assign roles (`teacher`, `admin`, `analyst`, …).
  * Link an **Eleve** to a **Professor** (user) where applicable.
  * Link a **Catalogue** to a **Professor**.

## CORS/hosts (common pitfalls)

* Ensure `ALLOWED_HOSTS=*` (or add `localhost`, `127.0.0.1`) for dev.
* If your frontend/WordPress call Django from different origins, configure CORS (e.g. `django-cors-headers`) with:

  * `CORS_ALLOW_ALL_ORIGINS=True` (dev) **or** add `http://localhost:9080`, `http://localhost:9082`.
* Double-check trailing slashes to avoid `//` in URLs.

---
 