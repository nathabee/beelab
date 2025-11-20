
## 📘 BeeFont WP Plugin

### 🔸 1. User Manual (What This Plugin Does)

**BeeFont WP** integrates a React-based Single Page Application (SPA) with a Django backend into WordPress via Full Site Editing (FSE) blocks.

After activating the plugin:

* 📄 **Four pages are automatically created**:

  * `/login` – 🔐 User login
  * `/dashboard` – 📊 User dashboard
  * `/home` – 🏠 Application home
  * `/error` – ⚠️ Error fallback
* 🛠️ An **admin configuration page** is added under “Settings > BeeFont Settings”.

  * There, you can set the base API URL (e.g., `http://nathabee.de/api/`) used by the frontend to communicate with the Django backend.
* 🧠 The plugin provides a React UI with internal routing (`react-router-dom`) that seamlessly operates inside WordPress view rendering.

### 🔸 2. Compilation & Installation

#### ✅ Requirements

* Node.js (v16+)
* npm
* WordPress with FSE support (WP 6+)
* A Django backend (token-based auth endpoint expected)

#### 🔧 Build Steps

From the `beefont-wp/` folder:

```bash
npm install
npm run build
```

This will:

* Clean previous builds
* Transpile React/TSX via `@wordpress/scripts`
* Copy assets and generate PHP block manifest
* Create a final distributable ZIP (`dist/beefont-wp.zip`)

#### 📦 Installation

1. Go to WP Admin > Plugins > Upload Plugin.
2. Upload the ZIP file from `dist/`.
3. Activate the plugin.
4. Visit **Settings > BeeFont Settings** to configure the API endpoint.

### 🔸 3. Architecture Overview

```
beefont-frontend/
├── beefont-wp/       # 📦 WordPress plugin
│   ├── build/           # 🛠️ Compiled JS/PHP/assets for block registration
│   ├── src/             # 🔧 Source TSX/React code
│   ├── dist/            # ✅ Final zip for plugin install
│   ├── beefont-wp.php # 📜 Main plugin file
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
* API endpoint configured dynamically via `wp_localize_script()` and passed as `beefontSettings.apiUrl`

---
  

## 🛠️ THE Plan: Well-Structured and Scalable


### 💡 🛠️ NEXT UP:
- [ ] ✅ *Started:* Transform React app → WordPress plugin (core working, 10% done)
- [ ] Add mock mode toggle (via window.beefontSettings.mockMode)
- [ ] Add mock data file in shared (shortreports.ts)
- [ ] Adapt useShortReports() to support real/mock switch
- [ ] Extract shared into library; keep plugin stable (add non-regression test)
- [ ] Build React standalone app using shared code
- [ ] Use fake data to compile a static standalone app for GitHub Pages

| Strategy                                               | Why it Helps                             |
| ------------------------------------------------------ | ---------------------------------------- |
| ✅ **Write a clean README** (you're already doing this) | Shows communication skills               |
| 🎥 **Record a 2-min demo video**                       | Recruiters *love* this – instant wow     |
| ✍️ **Blog post / LinkedIn post**                       | Explains your thinking, shows confidence |
| 📦 **Mock mode** for portfolio/demo                    | Lets people test without needing Django  |
| 🧪 Mention tests or CI setup                           | Signals “team-ready” professionalism     |


### ✅ **1. React app → WordPress plugin**
 

* Shared TS + React code
* Custom Gutenberg block
* Clean routing
* Auth + data fetching hooks
* Packaged builds ✅

### 🚀 **2. Add a "mock mode" config**

Smart move for:

* Demos to customers with “real-feeling” data
* Portfolios that don’t depend on real backend
* Offline/test environments

**Suggestion**: You could control mock mode with:

```ts
const useMock = () => window.beefontSettings?.mockMode === true;
```

And load fake data conditionally in `useShortReports()` or other hooks.

### 🧩 **3. Extract clean shared logic**

This is what will unlock:

* A polished **React standalone** version
* Future use in other CMS platforms
* Unit testability and clean separation

Structure will look like:

```
/shared/
  components/
  hooks/
  utils/
  types/

/react-app/
  pages/
  entry.tsx

/beefont-wp/
  src/
  app/
  pages/
```
 
---
 