# InGo Test Integration

This document explains how to test the BeeLab InGo integration on dev or on the VPS.

The important decision: **do not create a new DNS name for InGo inside BeeLab**. BeeLab provides a mock of the external InGo API on the existing API host:

```txt
https://beelab-api.nathabee.de/api/GetToken/ingo
https://beelab-api.nathabee.de/api/projectimport
```

Locally it is:

```txt
http://127.0.0.1:9001/api/GetToken/ingo
http://127.0.0.1:9001/api/projectimport
```

Only create a new DNS name if InGo explicitly needs a separate public hostname. For the current integration, reusing `beelab-api` is simpler and safer.

---

## Before Coding: VPS DNS And Access

BeeLab already has the right public entry point:

```txt
beelab-api.nathabee.de -> Apache -> 127.0.0.1:9001 -> Django
```

So for InGo, check the existing API access instead of adding another subdomain:

```bash
curl -i https://beelab-api.nathabee.de/health
curl -i https://beelab-api.nathabee.de/api/docs/
```

If those work, DNS and Apache are already good for InGo.

Use the existing DNS/Apache guide for server setup:

```txt
docs/installation-vps-dns.md
```

The Apache vhost should proxy the whole API host to Django:

```apache
ProxyPass        / http://127.0.0.1:9001/
ProxyPassReverse / http://127.0.0.1:9001/
```

That means the mock InGo paths automatically work through the existing `beelab-api` domain.

---

## Required InGo Settings

Add these values to the environment file for the target environment.

For local/dev:

```bash
nano .env.dev
```

For VPS/prod:

```bash
nano .env.prod
```

BeeLab is the InGo mock provider in every environment for now. InGo is not available in dev or prod yet.

The client still uses the real InGo-shaped URLs:

```txt
POST {INGO_BASE_URL}/api/GetToken/{INGO_TENANT_NAME}
POST {INGO_BASE_URL}/api/projectimport
```

But `INGO_BASE_URL` points back to BeeLab, because BeeLab implements those mock endpoints.

Required values for dev:

```env
INGO_BASE_URL=http://localhost:9001
INGO_TENANT_NAME=ingo
INGO_CLIENT_ID=ingo-client
INGO_CLIENT_SECRET=ingo-secret
```

Required values for prod:

```env
INGO_BASE_URL=https://beelab-api.nathabee.de
INGO_TENANT_NAME=ingo
INGO_CLIENT_ID=ingo-client
INGO_CLIENT_SECRET=ingo-secret
```

The mock client id and secret can be changed. BeeLab uses them as Django user credentials:

```txt
INGO_CLIENT_ID     -> Django username
INGO_CLIENT_SECRET -> Django password
```

Create or update that user after changing the values:

```bash
source scripts/alias.sh dev
ingocreateclient
```

On prod:

```bash
source scripts/alias.sh prod
ingocreateclient
```

With that setup, your external workflow calls BeeLab as the InGo mock API:

```txt
Fake InGo token endpoint:
  POST http://localhost:9001/api/GetToken/ingo

Fake InGo import endpoint:
  POST http://localhost:9001/api/projectimport
```

On prod, the same paths are served through `https://beelab-api.nathabee.de`.

Do not commit real credentials.

After changing env values, restart Django:

```bash
source scripts/alias.sh dev
dcbuild django
dcdjup
dcdjango python manage.py migrate --noinput
```

For prod:

```bash
source scripts/alias.sh prod
dcbuild django-prod
dcdjup
dcdjango python manage.py migrate --noinput
```

---

## Reinstall Or Update BeeLab Code From GitHub

On the VPS, use the existing BeeLab deployment pattern.

```bash
cd ~/beelab
git pull
source scripts/alias.sh prod

dcbuild django-prod
dcup django-prod
dcdjango python manage.py migrate --noinput
```

The InGo mock stores successful imports in the `ingocore_ingoimportedproject` table. Running `migrate` is required after the first deployment of this feature.

The longer clone/update guide lives here:

```txt
docs/install-beelab-clone.md
```

---

## Local Dev Start

From the repo root:

```bash
source scripts/alias.sh dev
dcdjup
```

Check Django:

```bash
curl http://127.0.0.1:9001/health
dcps
```

---

## Test With The Helper Script

Use:

```bash
scripts/ingo-dev.sh dev
```

The menu offers:

```txt
1) create/update InGo client user (ingo-client)
2) connect: POST /api/GetToken/ingo
3) post project: POST /api/projectimport
4) post duplicate-error project: POST /api/projectimport -> 409
5) exit
```

`create/update InGo client user` creates the Django user named by `INGO_CLIENT_ID` and sets its password to `INGO_CLIENT_SECRET`.

`connect` calls the InGo-shaped mock token endpoint and stores the returned `access_token` only for this terminal session.

`post project` sends a sample InGo project payload to:

```txt
/api/projectimport
```

`post duplicate-error project` sends the same sample with `postalCode` set to `99999`. The mock returns HTTP `409` without a response body.

The script prints the curl command before it sends it, then prints the returned JSON when there is a JSON body.

Direct commands:

```bash
scripts/ingo-dev.sh dev create-user
scripts/ingo-dev.sh dev connect
scripts/ingo-dev.sh dev post-project
scripts/ingo-dev.sh dev post-project-error
```

You can provide an existing mock InGo JWT token:

```bash
export INGO_TOKEN='paste-access-token-from-GetToken'
scripts/ingo-dev.sh dev post-project
```

---

## Manual Curl Test

First get a mock InGo token:

```bash
curl -sS -X POST http://127.0.0.1:9001/api/GetToken/ingo \
  -H "Content-Type: application/json" \
  -d '{"client_id":"ingo-client","client_secret":"ingo-secret"}'
```

Copy the returned `access_token`, then call the InGo import endpoint:

```bash
curl -sS -X POST http://127.0.0.1:9001/api/projectimport \
  -H "Authorization: Bearer PASTE_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "ImportProject",
    "projectNumber": "1000",
    "location": {
      "address": {
        "streetName": "Musterstrasse",
        "streetNumber": "1",
        "city": "Musterstadt",
        "state": "Musterbundesland",
        "postalCode": "123456",
        "country": "deu"
      },
      "coordinates": "8.0, 54.0"
    },
    "localContact": {
      "localContactName": "Karl Kontakt",
      "localContactPhone": "+49 30 123456"
    },
    "firstResponder": {
      "firstResponderName": "Emil Erster",
      "firstResponderNumber": "+49 30 321321"
    },
    "fireDepartment": {
      "fireDepartmentName": "Fabian Feuer",
      "fireDepartmentNumber": "+49 30 987987"
    },
    "startDate": "2024-03-25",
    "nuLevel": 2
  }'
```

Success returns only:

```json
{
  "projectSharedId": "<generated-project-shared-id>"
}
```

The request payload is stored in the database for audit/debugging, but it is not echoed in the API response.

For prod, replace the base URL:

```txt
https://beelab-api.nathabee.de/api/GetToken/ingo
https://beelab-api.nathabee.de/api/projectimport
```

---

## Swagger

Swagger is already exposed on the existing API host:

```txt
https://beelab-api.nathabee.de/api/docs/
```

Local dev:

```txt
http://127.0.0.1:9001/api/docs/
```

There is no need for an InGo-specific Swagger host.

---

## Aliases: What Is Sinnvoll?

Do not add a new DNS for InGo yet. The sensible setup is to keep InGo behind the existing Django API domain and use the BeeLab aliases.

After loading aliases with `source scripts/alias.sh dev` or `source scripts/alias.sh prod`, these helpers are available:

```bash
ingo
ingocreateclient
ingoconnect
ingopostproject
ingoposterror
```

---

## Troubleshooting

Check that Django is running:

```bash
source scripts/alias.sh dev
dcps
curl http://127.0.0.1:9001/health
```

Check logs:

```bash
source scripts/alias.sh dev
dcdjlogs
```

If `dcup django` fails with:

```txt
Bind for 127.0.0.1:9001 failed: port is already allocated
```

then another container or process already owns the Django port. Check it:

```bash
docker ps --format '{{.Names}} {{.Ports}}'
ss -ltnp | grep 9001
```

If you see a non-alias BeeLab container such as `beelab-django-1`, stop the default Compose project and then start the alias project:

```bash
docker compose --env-file .env.dev --profile dev down --remove-orphans
source scripts/alias.sh dev
dcup --remove-orphans django
```

If the conflict is inside the alias project, clean orphans and restart:

```bash
source scripts/alias.sh dev
dcdown --remove-orphans
dcdjup
```

Common results:

* `INGO_MOCK_INVALID_CLIENT`  
  The mock token endpoint is alive, but `INGO_CLIENT_ID` or `INGO_CLIENT_SECRET` does not match the env values.

* `/api/projectimport` returns `400`, `401`, or `409`  
  The PDF does not define an error JSON for this endpoint, so the strict mock returns the HTTP status without a response body.

* `INGO_CONFIGURATION_ERROR`  
  One of `INGO_BASE_URL`, `INGO_TENANT_NAME`, `INGO_CLIENT_ID`, or `INGO_CLIENT_SECRET` is missing.

* `INGO_HTTP_ERROR`  
  InGo answered, but rejected the token or project request.

* `INGO_TIMEOUT`  
  BeeLab could not reach InGo in time.

---

## Automated Tests

Run the focused InGo tests:

```bash
source scripts/alias.sh dev
dttest tests/test_ingo_client.py InGoCore/tests/test_views.py
```
