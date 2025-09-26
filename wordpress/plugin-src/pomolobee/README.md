
## 📘 PomoloBee WP Plugin

### 🔸 1. User Manual (What This Plugin Does)

**PomoloBee WP** integrates a React-based Single Page Application (SPA) with a Django backend into WordPress via Full Site Editing (FSE) blocks.

After activating the plugin:

* 📄 **Four pages are automatically created**:

  * `/login` – 🔐 User login
  * `/dashboard` – 📊 User dashboard
  * `/home` – 🏠 Application home
  * `/error` – ⚠️ Error fallback
* 🛠️ An **admin configuration page** is added under “Settings > PomoloBee Settings”.

  * There, you can set the base API URL (e.g., `https://localhost:9001/`) used by the frontend to communicate with the Django backend.
* 🧠 The plugin provides a React UI with internal routing (`react-router-dom`) that seamlessly operates inside WordPress view rendering.

### 🔸 2. Compilation & Installation

#### ✅ Requirements

* Node.js (v16+)
* npm
* WordPress with FSE support (WP 6+)
* A Django backend (token-based auth endpoint expected)

#### 🔧 Build Steps

From the `pomolobee-wp/` folder:

```bash
npm install
npm run build
```

This will:

* Clean previous builds
* Transpile React/TSX via `@wordpress/scripts`
* Copy assets and generate PHP block manifest
* Create a final distributable ZIP (`dist/pomolobee-wp.zip`)

#### 📦 Installation

1. Go to WP Admin > Plugins > Upload Plugin.
2. Upload the ZIP file from `dist/`.
3. Activate the plugin.
4. Visit **Settings > PomoloBee Settings** to configure the API endpoint.

### 🔸 3. Architecture Overview

```
pomolobee-frontend/
├── pomolobee-wp/       # 📦 WordPress plugin
│   ├── build/           # 🛠️ Compiled JS/PHP/assets for block registration
│   ├── src/             # 🔧 Source TSX/React code
│   ├── dist/            # ✅ Final zip for plugin install
│   ├── pomolobee-wp.php # 📜 Main plugin file
│   └── ...              # Other build, config, and packaging tools
├── react-app/           # 🧪 React-only SPA (WIP)
├── shared/              # 🔁 Shared logic (planned separation)
```

#### 🔁 Shared Code

The React app and the WordPress plugin both rely on shared modules:

* `@context/AuthContext` – handles auth
* `@hooks/useLogin` – login logic
* `@hooks/useFetchData` – pulls user-specific content
  These are currently duplicated in the plugin but intended to be moved into `shared/`.

#### ⚙️ WordPress Integration

* Block registration via `block.json` and `@wordpress/scripts`
* Server-side PHP renders the container
* React frontend is hydrated in the `view.js` entrypoint
* API endpoint configured dynamically via `wp_localize_script()` and passed as `pomolobeeSettings.apiUrl`

---
  