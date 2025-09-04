# Web Service (Next.js)

The **web** service provides the frontend for the project.

- **Framework**: Next.js 14 (TypeScript, App Router)
- **Runs in dev mode** with hot reload inside Docker
- **Port**: exposed at [http://localhost:9080](http://localhost:9080)

## Features

- Fetches `api/hello` from Django backend to display a simple message.
- Includes `/welcome` page as a static route.
- Provides login form that:
  - Calls `/api/login` (proxy to Django)
  - Stores JWT access token in an HttpOnly cookie
  - Allows calling `/api/me` (proxy) to fetch authenticated user info.

## Dev Notes

### installation

- `npm install` must be seeded once into the container volume:
  ```bash
  docker compose --profile dev run --rm web npm install
  ```
  
### structure

#### Next.js files live in `web/`:

  * `app/page.tsx` → home page
  * `app/welcome/page.tsx` → welcome page
  * `app/api/*` → proxy API routes (login, me)

#### client vs server, how to call from web service , the django service 

web/app/page.tsx = client code (runs in the browser).
It should call same‑origin endpoints like /api/hello, /api/login, /api/me (no http://django:8000 here).

web/app/api/<routepath>/route.ts = Next.js server code (runs in the web container).
Here you can safely call http://django:8000/... (via BACKEND_INTERNAL_URL) on the Docker network. No CORS, because the browser only talks to your Next app (same origin).

---