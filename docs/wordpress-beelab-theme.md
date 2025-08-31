# beelab-theme  

Custom WordPress theme used as the base environment for the **PomoloBee** and **Competence** plugins.


* It’s a **block (FSE) theme** with at least these items:
 
* WordPress version: **6 / PHP 8.3** (from the stack).
* Plugins (**Competence**, **PomoloBee**) render pages via blocks; Competence plugin also **creates pages on activation** that include its app block.

 
---

## Theme tree
 

```bash
# from project root
# tree -a -I 'node_modules|.git|dist|build' wordpress/wp-content/themes/beelab-theme
```

 
```
wordpress/wp-content/themes/beelab-theme
├── assets
│   └── images
│       └── logo.png
├── functions.php
├── parts
│   ├── footer-columns.html
│   ├── footer.html
│   ├── footer-newsletter.html
│   ├── header.html
│   ├── header-large-title.html
│   ├── sidebar.html
│   └── vertical-header.html
├── patterns
│   └── template-query-loop.php.old
├── screenshot.png
├── scripts
│   └── init-site.sh
├── style.css
├── templates
│   ├── 404.html
│   ├── archive.html
│   ├── home.html
│   ├── index.html
│   ├── page.html
│   ├── page-no-title.html
│   ├── page-plugin.html
│   ├── search.html
│   └── single.html
└── theme.json

```

---

## WordPress setup & theme activation

### Theme Activation


The Theme activation is performed via (`scripts/wp-init.sh`)  script: it applies basic site settings (permalinks, logo, etc.). 
 
```bash 
docker compose --profile dev run --rm wpcli wp theme list
docker compose --profile dev run --rm wpcli wp theme activate beelab-theme

```
We could also have use the admin console to activate the theme :

* Log in to **/wp-admin**
* **Appearance → Themes → Activate** `beelab-theme`

---

## Content

### Custom navigation

 

### Custom pages / templates

Your plugins create the functional pages (e.g. Competence creates “Login”, “Dashboard”, etc. with a block). The theme’s job is to **render those pages** with your layout:

Fill with facts from your theme:

* Page templates in `templates/` you rely on (e.g. `page.html`, `single.html`, `index.html`)
* Template parts in `parts/` (header, footer)
* Any CSS that styles plugin blocks/site chrome (point to real files)

### Assets (logo, colors, typography)

<<<<<<<<<<<<<<<TO FILL>>>>>>>>>>>>
* Logo path you actually use (e.g. `assets/images/logo.svg`)
* Where colors/typography are defined: `theme.json` (add the real sections you use)
* If you exported Site Editor changes back into the theme: put the steps you follow (you already documented this elsewhere—link to it)

---

## Relation between plugins and theme

 

<<<<<<<<<<<<<<<TO FILL>>>>>>>>>>>>

* The **Competence** plugin registers an FSE block (`competence/competence-app`) and **creates pages on activation** that include this block.
* The theme doesn’t contain plugin logic; it **provides layout/structure** for any page (including those plugin-generated pages).
* In dev, the **API base URL** used by the plugin is configured in **WP Admin → Competence Settings** (the plugin reads that and calls Django).


* Any theme CSS/classes intentionally supporting plugin UIs.
* Any template parts you created specifically so the plugin pages look integrated (e.g., minimal header/footer, full-width content).
* Whether the theme hides default page title on plugin pages (if you do that in a template).

---

## Dev by uploading change direct from the server
```bash
# logo can be changed in /wp-content/themes/beelab-theme/assets/images/logo.png
# screen shot in /wp-content/themes/beelab-theme/screenshot.png

# import the file from the theme into Media Library
docker compose --profile dev run --rm wpcli bash -lc \
  'ID=$(wp media import /var/www/html/wp-content/themes/beelab-theme/assets/images/logo.png --porcelain) && \
   wp theme mod set custom_logo "$ID" && \
   wp cache flush'
```

**Example** 
```bash
# to set blogname to  'BeeLab'
docker compose --profile dev run --rm wpcli wp option update blogname "BeeLab"
# to set blogdescription to ' Dockerized Multiservice (Django + Next.js plugins + WordPress + databases)'
 
docker compose --profile dev run --rm wpcli wp option update blogdescription "Dockerized Multiservice (Django + Next.js plugins + WordPress + databases)"
```

---

## Dev tips by using site editor and exporting theme

* Use **Site Editor (Appearance → Editor)** to tweak navigation, templates, and parts.
* Export changes (**⋯ → Tools → Export**) and copy exported files back into:

  ```
  wordpress/wp-content/themes/beelab-theme/
  ```
* Commit the updated `theme.json`, `templates/`, `parts/`, and assets.

---
 