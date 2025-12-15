# 📘 BeeGame WP Plugin — README

## 1. Overview

**BeeGame WP** embeds a full React **single-page application** into WordPress using a custom FSE block.
It provides a collection of **interactive mathematical and dynamical system simulations**, such as:

* Conway’s Game of Life
* Forest Fire Model
* Diffusion / Heat Map
* Epidemic (SIR) Simulation
* Elementary Cellular Automata
* Logistic (Chaos) Map

All simulations run **entirely in the browser** — no backend, no external services, no login required.

The plugin automatically creates internal pages that host the SPA.
Routing between simulations is handled **inside React** (via `react-router-dom`), not by WordPress.

---

## 2. Auto-Created Pages

On activation, the plugin creates:

### Public entry page

* `/beegame` → the public gateway to the entire app

### Internal simulation pages (CPT `beegame_page`)

These all mount the same SPA shell:

* `/beegame/home`
* `/beegame/lifesim`
* `/beegame/forestfire`
* `/beegame/epidemic`
* `/beegame/diffusion`
* `/beegame/elementary`
* `/beegame/logisticmap`
* `/beegame/error_mgt`
* `/beegame/error`

These URLs exist so WordPress has something to render on direct browser navigation.
Inside the SPA, navigation happens using client-side routing.

---

## 3. Features (Current)

### 🔶 React SPA mounted through an FSE block

A single block:

```
<!-- wp:beegame/beegame-app /-->
```

renders the entire application.

### 🔶 Simulation layout with right-side tab system

Every simulation uses a consistent layout:

* **Control** – parameters, sliders, play/pause, grid size, etc.
* **Stats** – live charts or numeric indicators
* **Help** – how to use the interface
* **Theory** – mathematical background & model explanation

### 🔶 Multiple interactive simulations

Each simulation has its own engine implemented in React:

* Game of Life with presets and wrapping modes
* Forest Fire (with pGrowth, pLightning, pSpread)
* Diffusion model
* SIR epidemic spread
* Rule 30/110 cellular automata
* Logistic map orbit visualizer

### 🔶 Lightweight and theme-friendly

* No CSS frameworks beyond Bootstrap (loaded in plugin)
* Uses WordPress color presets when available
* Automatically adapts to both dark/light themes when possible

---

## 4. Build & Installation

### Requirements

* Node.js 16+
* npm
* WordPress 6+
* A block/FSE-compatible theme (TwentyTwentyFour, etc.)

### Build the plugin

```bash
npm install
npm run build
```

This produces:

* `/build` → compiled block assets
* `/dist/beegame-vX.Y.Z.zip` → distributable plugin ZIP

### Install in WordPress

You may:

1. Upload the ZIP via **Plugins → Add New**
2. Or copy the folder manually to:

   ```
   wp-content/plugins/beegame
   ```

Then activate **BeeGame WP**.

Visit `/beegame` to launch the app.

---

## 5. Development

Start the live compiler:

```bash
npm run dev
```

React entry point:

```
src/beegame-app/index.tsx
```

Block metadata:

```
src/beegame-app/block.json
```

Custom SPA components live under:

```
src/components/
src/pages/
src/context/
```

---

## 6. Template Behavior (Important)

Because WP routing and React routing overlap, behavior differs between:

### A) Clicking inside the React application

WordPress is **not** reloaded — only the SPA updates.

### B) Typing a URL like `/beegame/lifesim` into the browser

WordPress must select a **PHP/HTML template**.

The plugin registers a CPT `beegame_page`.
For these pages, you may optionally define:

### Template for simulation pages:

```
yourtheme/templates/single-beegame_page.html
```

### Template for the public entry page:

```
yourtheme/templates/page-beegame.html
```

Creating these templates gives users **full-width, consistent rendering** independent of their theme.

If these files are not provided, WordPress falls back to the active theme’s defaults.

---

## 7. Recommended Instructions for Third-Party Users

If the user installs BeeGame WP into their own WordPress:

1. **Install and activate plugin**
2. If the simulation pages look cramped or boxed, ask them to create:

```
/yourtheme/templates/single-beegame_page.html
```

Paste your supplied “full-width” template snippet.

3. Optionally create a custom entry template:

```
/yourtheme/templates/page-beegame.html
```

This ensures consistent appearance across all WordPress themes.

---

## 8. Notes

* BeeGame WP is fully frontend-only — no server logic.
* The block architecture allows you to add new simulations easily.
* The plugin does not interfere with other themes or plugins.
* Works on both local dev and production (Docker or standard WP hosting).

---
 