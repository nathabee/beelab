# 🐝 BeeLab – Developer Guide to Django Tests

This guide explains how to write, configure, and run tests for the **BeeLab Django backend**.

---

## 📂 Project Test Structure

Keep tests **close to the code they cover**:

```
django/
├── UserCore/
│   ├── tests/              # tests for UserCore app
│   │   ├── test_demo_auth.py
│   │   ├── test_demo_permissions.py
│   │   └── ...
├── CompetenceCore/
│   ├── tests/              # tests for CompetenceCore app
│   │   └── ...
├── PomoloBeeCore/
│   ├── tests/              # tests for PomoloBeeCore app
│   │   └── ...
├── tests/                  # cross-app / integration tests
│   ├── integration_test.sh # shell-based integration tests
│   └── snapshots/          # test data snapshots
```

**Rule of thumb:**

* App-specific logic → `django/app_name/tests/`
* Cross-app / system integration → `django/tests/`

---

## ⚙️ Configuration

Testing is already wired up via:

### `pytest.ini`

Located in `django/pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
addopts = -ra -q --disable-warnings
```

### `conftest.py`

Located in `django/conftest.py`:

```python
import pytest
from rest_framework.test import APIClient
from datetime import timedelta

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture(autouse=True)
def _jwt_test_settings(settings):
    settings.SIMPLE_JWT.update({
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
        "SIGNING_KEY": "test-secret-not-for-prod",
    })
```

Provides **shared fixtures** for all apps (API client, short-lived JWTs, etc.).

### `compose.yaml`

A dedicated service can be added (optional):

```yaml
django-tests:
  build: { context: ./django, target: dev }
  command: pytest -q
  volumes: [ "./django:/app" ]
  depends_on:
    db: { condition: service_started }
```

But in practice we run tests directly in the **django service** via aliases.

---

## 🛠️ Tools & Aliases

We added **shell aliases** in `scripts/alias.sh` to simplify running tests.

Available aliases:

```bash
dctest           # run all tests (pytest -q)
dctestcov        # run all tests with coverage for Django apps
dctestfile path  # run a specific test file or node
dctestk 'expr'   # run tests matching a keyword expression
```

if necessary on the host dev create :
```bash
mkdir -p django/media/test-coverage django/media/test-reports django/media/test-artifacts

``` 

---

## Make changes in Django


### 🔧 After changing models

```bash
# apply schema changes first
dcdjango python manage.py makemigrations
dcdjango python manage.py migrate
```

---

### 📦 After changing fixtures

 
You can reseed :

```bash
  
# reseed everything
dcdjseed_all

# or only the plugin side
dcdjseed_pomolobee
```
 
### After changing background field picture or SVG


You can send in docker all the pictures and SVG :

```bash
  
....
```


### ✅ Quick sanity check

```bash
# demo JWT
TOKEN=$(curl -s -X POST http://localhost:9001/api/user/auth/demo/start/ | jq -r .access)

# demo-visible endpoints should respond 200 with data
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:9001/api/pomolobee/farms/
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:9001/api/pomolobee/locations/
```

---

## ▶️ Running Tests

### 1. Start your dev environment

```bash
cd beelab
#   beelab-dev , or:
source scripts/alias.sh dev   
dcup django db
```

### 2. Run the full suite

```bash
dctest
```

### 3. Run with coverage

```bash
dctestcov
```
result in →
- coverage in :  http://localhost:9001/media/test-coverage/index.html
- JUnit XML: http://localhost:9001/media/test-reports/junit.xml


### 4. Run a single test file

```bash
dctestfile UserCore/tests/test_demo_auth.py
```

### 5. Run tests by keyword

```bash
dctestk demo and not throttling
```

### 6. Quick commands 

* **Run only UserCore tests by path** (recommended):

  ```bash
  dc run --rm django-tests pytest -q UserCore/tests
  ```

  with coverage:

  ```bash
  dc run --rm django-tests pytest -q UserCore/tests --cov=UserCore --cov-report=term-missing
  ```

* **Ignore other apps**:

  ```bash
  dc run --rm django-tests pytest -q --ignore=PomoloBeeCore --ignore=CompetenceCore --cov=UserCore
  ```

* **Target a single file or test node**:

  ```bash
  dc run --rm django-tests pytest -q UserCore/tests/test_demo_auth.py::test_demo_start_sets_cookie
  ```

---

## Test Results

All Docker-based, the test output shows **right in your terminal**—the same shell where you run the aliases (`dctest`, `dctestcov`, etc.). The alias execs `pytest` **inside the Django container** and streams stdout/stderr to your screen.

Quick tips to control what you see:

* **Default (quiet)**: `dctest` uses `-q`, so you’ll see a compact summary.
* **Verbose**:
  `dcdjango pytest -vv`
  `dctest -vv`
* **Show print/logging** (disable capture):
  `dctest -s`
* **Force color**:
  `dctest --color=yes`
* **See failures immediately**:
  `dctest -x`
* **Show full tracebacks**:
  `dctest --maxfail=1 -vv`

Coverage output:

* **Terminal summary**: `dctestcov` prints coverage to your terminal.
* **HTML report** (browseable):

  ```
  dcdjango pytest --cov=UserCore --cov=CompetenceCore --cov=PomoloBeeCore \
    --cov-report=term-missing --cov-report=html
  ```

  This writes `htmlcov/` inside the **mounted** `django/` folder 
  
  (so you’ll find `django/htmlcov/index.html` on your host).

Where files land:

* `.coverage` file and `htmlcov/` are created under **`django/`** (because the container’s `/app` is bind-mounted to `./django`).

If you want to tail Django logs while tests run (sometimes useful for integration tests):

```
dclogs django
```

Troubleshooting no output:

* Ensure you sourced aliases: `source scripts/alias.sh dev`
* Make sure the service is up: `dcdjup` (the alias auto-starts it, but you can run it)
* Remove quiet mode: `dctest -vv -s`
* If a command hangs, check DB is up: `dcup db` and `dclogs db`



## 📝 Notes for Developers

* Write **unit tests** per app in its `tests/` folder.
* Use **fixtures** from `conftest.py` for common setup (e.g. API client).
* Tests run inside the **Django container**, so they use the same environment as your app.
* Keep **production dependencies** in `requirements.txt` and add test-only tools in `requirements-dev.txt`.

---

 