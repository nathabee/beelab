# PomoloBee WordPress Plugin – Dev vs Prod Guide

This document explains how to work with the **PomoloBee WordPress plugin** in both **development** and **production** environments.

######################################################
## TO BE TESTED NOT CONVINCING DID NOT WORK FINE!!!!!!!!!!!!!!!
#########################################################
---

## 🔑 Key Concepts

* **WordPress Core Flags**
  Control whether WordPress serves **minified** or **unminified** JavaScript (including React/ReactDOM).

* **Plugin Build**
  Controls whether your plugin’s own JS bundle is **minified** or includes **sourcemaps**.

* **Plugin PHP**
  Always the same across environments — it registers block types, injects runtime config, and ensures the bundle depends on WordPress’ React (`wp-element`).

---

## ⚙️ Environment Flags in `wp-config.php`

The following constants influence **WordPress core scripts**:

| Constant              | Dev Value     | Prod Value | Purpose                                                                    |
| --------------------- | ------------- | ---------- | -------------------------------------------------------------------------- |
| `SCRIPT_DEBUG`        | `true`        | *(unset)*  | Forces WP to use **unminified** core JS (React, ReactDOM, editor scripts). |
| `CONCATENATE_SCRIPTS` | `false`       | *(unset)*  | Disables concatenation → easier debugging with sourcemaps.                 |
| `WP_ENVIRONMENT_TYPE` | `development` | *(unset)*  | Lets themes/plugins know this is a dev environment.                        |

### Setting flags (in dev)

Run these commands after spinning up the stack:

```bash
# Enable unminified WordPress core JS/CSS
dcwpcli wp config set SCRIPT_DEBUG true --raw

# Avoid concatenation (better for source maps)
dcwpcli wp config set CONCATENATE_SCRIPTS false --raw

# Mark environment as development
dcwpcli wp config set WP_ENVIRONMENT_TYPE development
```

Verify:

```bash
dcwpcli wp eval 'var_dump(
  defined("SCRIPT_DEBUG") ? SCRIPT_DEBUG : null,
  defined("CONCATENATE_SCRIPTS") ? CONCATENATE_SCRIPTS : null,
  defined("WP_ENVIRONMENT_TYPE") ? WP_ENVIRONMENT_TYPE : null
);'
```

---

## 📦 Plugin Builds

Your plugin supports two build modes:

| Command             | When to use | Result                                         |
| ------------------- | ----------- | ---------------------------------------------- |
| `npm run build:dev` | Development | Unminified bundle + sourcemaps for debugging.  |
| `npm run build`     | Production  | Minified bundle + packaged zip for deployment. |

### Example

```bash
# In dev
cd wordpress/plugin-src/pomolobee
npm run build:dev


# to reverse:
How to revert
dcwpcli wp config delete SCRIPT_DEBUG --type=constant
dcwpcli wp config delete CONCATENATE_SCRIPTS --type=constant
dcwpcli wp config delete WP_ENVIRONMENT_TYPE --type=constant
# (or set SCRIPT_DEBUG false instead of deleting)
cd wordpress/plugin-src/pomolobee
npm run build
./build-zip.sh


```
install zip with wordpress admin console


---

## 🐘 Plugin PHP (always the same)

The plugin PHP does the following in **both dev and prod**:

* Registers block types from `build/`.
* Ensures your view script handle (`pomolobee-pomolobee-app-view-script`) **depends on WordPress’ React** (`wp-element`, `react-jsx-runtime`).
* Injects runtime config (`window.pomolobeeSettings`) before the bundle runs.
* Provides a settings page for configuring the API URL.
* Defines CPTs for PomoloBee routes.

This PHP does **not change** between environments.

---

## ✅ Checklist

### In Dev

* [ ] Run `npm run build:dev` for the plugin.
* [ ] Set WordPress flags with `dcwpcli`:

  * `SCRIPT_DEBUG=true`
  * `CONCATENATE_SCRIPTS=false`
  * `WP_ENVIRONMENT_TYPE=development`
* [ ] Verify your bundle + core scripts are unminified for debugging.

### In Prod

* [ ] Run `npm run build` for the plugin (generates minified + zip).
* [ ] Do **not** set dev flags in `wp-config.php`.
* [ ] Deploy plugin zip + WordPress serves minified core.

---

## 🔎 TL;DR

* **Dev = unminified everywhere** (WP core + plugin).
* **Prod = minified everywhere** (WP core + plugin).
* Plugin PHP stays the same in both cases.

---
 