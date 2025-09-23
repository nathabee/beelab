# WordPress Developer Tipps: Global Overview About Plugins

This document gives a high-level overview of how our custom WordPress plugins are structured, built, and maintained.

---

## Plugin Overview

### Plugin Structure

Each plugin lives under:

```bash
cd wordpress/plugin-src/<pluginName>
```

Inside, you’ll typically find the following structure:

```
src
├── app
│   ├── App.tsx              # Main React App entrypoint, mounted by view.tsx
│   ├── PomoloBeeHeader.tsx  # Example component (navigation, auth state, etc.)
│   └── router.tsx           # React Router definitions
├── assets
│   └── logo.png             # Static assets (images, logos, etc.)
├── components               # Reusable UI components
│   ├── ActiveContextCard.tsx
│   ├── Dashboard.tsx
│   ├── FarmMgt.tsx
│   └── ...
├── context                  # React context providers
│   └── AuthContext.tsx
├── hooks                    # Custom React hooks
│   └── useBootstrapData.ts
├── index.js                 # JS entry (links block + React app)
├── mytypes                  # TypeScript type definitions
│   └── farm.ts
├── pages                    # Page-level components
│   └── PomoloBeeDashboard.tsx
├── pomolobee-app            # Block definition (registered with block.json)
│   ├── block.json           # WP block metadata (defines editor/view scripts)
│   ├── edit.tsx             # Block editor view
│   ├── index.ts             # Block registration
│   ├── render.php           # Server-side render template
│   ├── save.ts              # Block save callback
│   ├── style.css            # Block/editor styles
│   └── view.tsx             # Entry point for front-end React app
├── styles
│   └── pdf.css              # Custom stylesheets
└── utils                    # Utility functions
    ├── api.ts
    ├── helper.ts
    └── jwt.ts
```

**Root-level files**:

* `build/` → compiled assets (created on build)
* `dist/` → distributable ZIP for plugin installation
* `build_zip.sh` → helper script to create `dist/` ZIP
* `install_plugin.sh` → installs latest build into WordPress container
* `package.json` / `package-lock.json` → npm dependencies and scripts
* `pomolobee.php` → main plugin entry (registers CPTs, enqueues assets, etc.)
* `uninstall.php` → clean-up logic if plugin is removed
* `tsconfig.json` → TypeScript compiler config
* `webpack.config.js` → build customization (optional)

---


### Plugin shared files

Some shared files are available under:

```bash
cd wordpress/plugin-src/_shared
```

Inside, you’ll typically find the following structure:

``` 
_shared
├── error
│   ├── ErrorBanner.tsx
│   ├── ErrorBoundary.tsx
│   ├── errorBus.ts
│   ├── errorBus.ts.old
│   ├── ErrorContext.tsx
│   ├── errorCopy.ts
│   ├── ErrorPage.tsx
│   ├── index.ts
│   ├── toAppError.ts
│   └── types.ts
├── index.ts
├── scripts
│   └── inject-version.mjs
└── widgets
    ├── index.ts
    └── TranslateBox.tsx


...etc
``` 

The shared components are defined in these documents :
  
- Error management <a href="developper-tipps-wordpress-plugin-shared-error.md">
  <img src="developper-tipps-wordpress-plugin-shared-error.png" alt="Error Screenshot" width="20%"></a>
- Widgets 


---

## Plugin : version, build, installation and git actions

### Build & Install (local)

During unit-test/dev work you don’t need to worry about versioning. To rebuild and reinstall a plugin:

```bash
cd wordpress/plugin-src/<pluginName>
npm run build     # compiles TS/React → build/, creates zip, installs into WP
# or, if you want to run steps manually:
npm run zip       # packages dist/<pluginName>.zip
npm run install   # copies the built plugin into wp-content/plugins
```

* `npm run build` compiles sources, generates the ZIP (so you can test a ZIP install), **and** installs the plugin to your local WordPress.
* Use `npm run zip` and `npm run install` separately if you need finer control.

---

### Versioning

* The current version is stored in the `VERSION` file at the repo root.
* Format: `MAJOR.MINOR.PATCH`.

Bump commands:

```bash
# patch bump (x.y.Z)
./scripts/bump-version.sh

# minor bump (x.Y.0)
./scripts/bump-version.sh minor

# major bump (X.0.0)
./scripts/bump-version.sh major
```

Notes:

* The bump script updates the version, applies any header/const injections, and creates a commit for the bump.
* Run it only when you *intend* to release a new version (don’t bump for every local dev rebuild).

---

### Batch build & install

Use the helper to build either **all** plugins or a **single** plugin. It only builds when sources actually changed.

```
./scripts/build-plugins.sh all [--commit] [--docker]
./scripts/build-plugins.sh <pluginName> [--commit] [--docker]
```

**Examples**

```
./scripts/build-plugins.sh pomolobee
./scripts/build-plugins.sh competence --commit
./scripts/build-plugins.sh all --docker
```

What it does:

* Detects if a plugin’s sources changed since the last successful build.
* **Runs `npm run build` inside each plugin** (which does clean → prebuild → buildpack → buildmanifest → zip → install).  ← (updated)
* Writes `.last_build_hash` so unchanged plugins are skipped next time.
* **No Git changes** unless you pass `--commit`. With `--commit`, it stages and commits only if build artifacts actually changed.
* `--docker` runs the npm build in a Node container (no host Node required).  ← (new if you added that flag)

---

### Recommended workflows

#### 1) Daily dev (single plugin, no git churn)

When you’ve changed `pomolobee` and want a fresh zip + install locally:

```bash
./scripts/build-plugins.sh pomolobee
```

* Builds **only if** sources changed.
* No commit.

If you touched multiple plugins:

```bash
./scripts/build-plugins.sh all
```

#### 2) Pre-push (no version bump)

You want the repo to include updated zips/build outputs, but you’re not doing a release:

```bash
./scripts/build-plugins.sh all --commit
git push origin main
```

* Commits **only** if artifacts actually changed.

#### 3) Release (patch/minor/major bump)

You’re publishing a new version (this ensures zips carry the new version):

```bash
# 1) bump first so artifacts get the new version embedded
./scripts/bump-version.sh minor      # or: (none)=patch | major

# 2) rebuild everything and commit the updated artifacts
./scripts/build-plugins.sh all --commit

# 3) push (and tags, if your bump script made one)
git push origin main --follow-tags
```

#### Why this order?

* **Version bump first** → the new version lands in `VERSION`, headers, and any injected constants.
* **Build after** → zips and build outputs embed that version.
* **Commit** → repo reflects exactly what will be deployed.
* Doing the bump **after** building would leave zips at the **old** version (bad).

---  

## Routing

### Permalinks & Flushing Rules

WordPress uses **permalinks** to define the URL structure for posts, pages, and custom content types (CPTs).

* In **Settings → Permalinks**, admins choose the global permalink structure (e.g. `/post-name/`).
* In `register_post_type`, developers can define custom permalink slugs (e.g. `'rewrite' => ['slug' => 'pomolobee']`).
* For SPA-style plugins, we often add a **catch-all rewrite rule** so that `/pomolobee/*` routes (e.g. `/pomolobee/dashboard`) are handled by the same CPT page, letting React Router display the right screen.

When CPT registration or rewrite rules change, WordPress needs to **refresh its rewrite rules**, also called **flushing permalinks**.

👉 After changes such as:

* registering or updating a CPT
* adding a catch-all rewrite rule
* modifying activation logic

you must flush permalinks.

**How to flush:**

* **Easy way**: deactivate and reactivate the plugin → this runs `pomolobee_activate()`, which registers the CPT and flushes rules automatically.
* **Alternative**: go to **Settings → Permalinks** in the WordPress admin and click **Save** (no changes required).
 
---

## WP templates

### Plugin content type → which template is used?

Your plugin registers a **Custom Post Type (CPT)** named `pomolobee_page` and inserts one post that contains your block:

```php
register_post_type('pomolobee_page', [
  'label'              => 'Pomolobee Pages',
  'public'             => true,
  'publicly_queryable' => true,
  'show_ui'            => true,
  'show_in_rest'       => true,
  'has_archive'        => false,                           // no archive page
  'rewrite'            => ['slug' => 'pomolobee', 'with_front' => false, 'pages' => false, 'feeds' => false],
  'supports'           => ['title','editor'],
  'show_in_nav_menus'  => false,
  'exclude_from_search'=> true,
  'menu_position'      => 20,
  'menu_icon'          => 'dashicons-chart-line',
]);

if (! get_page_by_path('pomolobee', OBJECT, 'pomolobee_page')) {
  wp_insert_post([
    'post_title'   => 'PomoloBee',
    'post_name'    => 'pomolobee',
    'post_content' => '<!-- wp:pomolobee/pomolobee-app /-->',
    'post_status'  => 'publish',
    'post_type'    => 'pomolobee_page',
  ]);
}
```

Because the post type is `pomolobee_page`, WordPress will render the single item with the **Single template for that CPT**:

* Block theme (e.g., Twenty Twenty-Five):
  `wp-content/themes/<your-theme>/templates/single-pomolobee_page.html`
* Classic theme:
  `wp-content/themes/<your-theme>/single-pomolobee_page.php`

> You do **not** need an archive template unless you set `has_archive` to `true`.

### `single-pomolobee_page.html` (full-width shell)

Create this file in your (child) theme to control the layout for your plugin page. Minimal full-width example:

```html
<!-- wp:template-part {"slug":"header"} /-->

<!-- wp:group {"tagName":"main","align":"full","style":{"spacing":{"margin":{"top":"0"},"padding":{"left":"0","right":"0"}}}} -->
<main class="wp-block-group alignfull" style="margin-top:0;padding-left:0;padding-right:0">
  <!-- Render the post content (your block) at full width -->
  <!-- wp:post-content {"align":"full","layout":{"type":"constrained"}} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer"} /-->
```

**Tips**

* If you still see “More posts” or next/previous navigation, remove any **Query Loop** or **Post Navigation** blocks from this template.
* If you want an alternate selectable layout for this CPT, add a **custom template** in `theme.json` and a matching file:

  ```json
  {
    "customTemplates": [
      { "name": "plugin-fullwidth", "title": "Plugin Page (Full Width)", "postTypes": ["pomolobee_page"] }
    ]
  }
  ```

  Then create `templates/plugin-fullwidth.html` with your variant shell.
