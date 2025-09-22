# WordPress Developer Tipps: Global Overview About Plugins

This document gives a high-level overview of how our custom WordPress plugins are structured, built, and maintained.

---

## Plugin Update

### Structure

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

### Build & Install

To rebuild and reinstall the plugin:

```bash
cd wordpress/plugin-src/<pluginName>
npm run build
./install_plugin.sh
```

This compiles the React/TypeScript sources into `build/` and installs the plugin into your WordPress instance.

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
