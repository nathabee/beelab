# 📘 BeeGame WP Plugin

## 1. Overview

**BeeGame WP** brings interactive simulation games — starting with **Conway’s Game of Life** — into WordPress using a modern React Single Page Application rendered through a Full Site Editing (FSE) block.

This plugin is entirely **frontend-only**:

* No login required
* No backend dependency
* No Django integration
* All simulations run inside the browser

After activation, the plugin creates a set of internal pages that all mount the same SPA shell (routing is handled inside React).

Created automatically:

* `/beegame` – Main entry page
* `/beegame/home` – Internal app home
* `/beegame/lifesim` – Game of Life view
* `/beegame/error` – Internal error page

## 2. Features (v1)

* React-based SPA embedded in WordPress
* Internal routing (`react-router-dom`)
* Layout prepared for:

  * Header with game selector
  * Simulation canvas (center)
  * Parameter panel (right side)
* Game of Life engine (grid, play/pause, step, presets, etc.) planned for next versions

## 3. Build & Installation

### Requirements

* Node.js 16+
* npm
* WordPress 6+
* FSE (block theme or site editor enabled)

### Build

```bash
npm install
npm run build
```

This generates the production bundle into `build/` and `dist/`.

### Install in WordPress

1. Copy the entire plugin folder into
   `wp-content/plugins/beegame`
2. Activate **BeeGame WP** from the WordPress admin.
3. Visit the automatically created **BeeGame** page.

## 4. Development

During development:

```bash
npm run dev
```

This rebuilds the view bundle when files change.

React entry point:
`src/beegame-app/index.tsx`

## 5. Notes

* The architecture is intentionally generic so you can add more simulation games later (forest fire, epidemics, cellular automata, etc.).
* No backend configuration or authentication is used in this plugin.

 