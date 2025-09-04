# Developer Workflow

This document explains the typical workflow when working with the **beelab** project.

---

## 1. Start the stack

Build and run everything:

```bash
docker compose --profile dev up --build
````

Services:

* **Web (Next.js)** → [http://localhost:9080](http://localhost:9080)
* **Django API** → [http://localhost:9001](http://localhost:9001)
* **Postgres** → internal service `db:5432`

---

## 2. Install / update frontend dependencies

Run once (or when `package.json` changes):

```bash
docker compose --profile dev run --rm web npm install
```

This populates `/app/node_modules` in the Docker volume.

---

## 3. Database

Check schema:

```bash
docker exec -it beelab-api bash -lc "python manage.py showmigrations"
docker exec -it beelab-api bash -lc "python manage.py dbshell"
```

From Postgres side:

```bash
docker exec -it $(docker ps --filter "name=beelab-db" --format "{{.ID}}") bash
psql -U app -d app -h localhost
\dt
```

---

## 4. Create users

For authentication tests:

```bash
docker exec -it beelab-api bash -lc "python manage.py createsuperuser"
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
  docker compose down
  ```
* Rebuild everything (clean):

  ```bash
  docker compose build --no-cache
  ```
* Remove DB data (⚠️ wipes all tables):

  ```bash
  docker volume rm beelab_db_data
  ```

---

## 7. Development Tips

* **Hot reload** works in both Django and Next.js (mounted volumes).
* Use `docker compose logs -f <service>` to tail logs.
* If migrations fail because Postgres wasn’t ready → restart Django container:

  ```bash
  docker compose restart django
  ```

---

## Next Steps

* Add tests in Django (`pytest` or built-in `unittest`)
* Add linting (ruff for Python, eslint/prettier for JS/TS)
* Automate builds with GitHub Actions

```

---