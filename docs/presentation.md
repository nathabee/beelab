# beelab: Project Overview

## What is this project?

**beelab** is a learning project to explore **Dockerized multi-service development**.  
It combines a Django backend, a Next.js frontend, and a Postgres database into a single environment.

The goal is to practice:
- Running multiple services with Docker Compose
- Using a modern frontend (Next.js)
- Using a backend framework (Django + DRF)
- Adding authentication (JWT)
- Sharing a common database (Postgres)
- Documenting and preparing for CI/CD in the future

---

## Architecture

```plaintext
+------------------+          +-------------------+          +------------------+
|   Web (Next.js)  | <------> |   Django (API)    | <------> |   Postgres DB    |
|   Port 9080      |          |   Port 9001       |          |   Port 5432      |
+------------------+          +-------------------+          +------------------+
````

* **Web**: TypeScript + Next.js, dev mode with hot reload, proxy to Django.
* **Django**: Django 5 + Django REST Framework, handles APIs and JWT authentication.
* **DB**: Postgres 16, persistent volume for data.

---

## Current Features

* `GET /api/user/hello` → hello world endpoint
* `POST /api/user/auth/login` → obtain JWT token
* `GET /api/user/me` → check current user with token
* Web UI with:

  * `/` home page showing backend response
  * `/welcome` static page
  * login form + “who am I” test

---

## Roadmap

* Add ML component (model inference service)
* Add CI/CD pipeline with GitHub Actions
* Deploy to VPS
* Expand docs → GitHub Pages

---

## Why this project?

* To **learn Docker** in a real multi-service setup
* To **experiment with Django + Next.js integration**
* To **prepare for more complex projects** (e.g. PomoloBee with Django + ML + Android app)

This is not meant to be a production-ready stack — it’s a **sandbox for learning**.

```

---