# Rebuilding & Installing WordPress Plugins in BeeLab

In BeeLab, plugin sources live in `wordpress/plugin-src/<plugin-name>`. Builds output ZIPs to `wordpress/build/`, which you then upload via **wp-admin**.

> **Note:** Plugins are **not** auto-installed/activated by scripts anymore. Use the ZIPs and upload them manually in wp-admin.

## 1) Install dependencies (first time per plugin)

```bash
cd wordpress/plugin-src/<plugin-name>   # e.g., pomolobee or competence
npm install
```

## 2) Build the plugin ZIP(s)

Build all plugins:

```bash
scripts/build-plugins.sh all
```

Build a single plugin (example: competence):

```bash
scripts/build-plugins.sh competence
```

The ZIP(s) will be in:

```
wordpress/build/pomolobee.zip
wordpress/build/competence.zip
```

## 3) Upload the ZIP in wp-admin

1. Open **[http://localhost:9082/wp-admin](http://localhost:9082/wp-admin)**
2. Go to **Plugins → Add New → Upload Plugin**
3. Choose the ZIP from `wordpress/build/` and click **Install Now**.

## 4) Activate the plugin

After upload completes, click **Activate**.
You can also activate later via **Plugins → Installed Plugins**.

## 5) Verify

Navigate to your plugin pages/components to confirm they render correctly.

---

 