# BeeSeen Creation


## Goal

This doc shows how to create a wordpress block plugin for the first time. plugin will be created with 2 blocks initially.

* Plugin: **BeeSeen**
* Blocks:

  * `beeseen/bee-orbit`
  * `beeseen/bee-wobble`
* Both blocks appear in the block inserter and render a visible placeholder (minimal code).

---

## Step 1 — Scaffold the plugin with npm

From your WordPress `wp-content/plugins/` folder:

```bash
npx @wordpress/create-block@latest beeseen
cd beeseen
npm install
npm run build
```

Activate the plugin in WP admin. You should see the default generated block once — that confirms the pipeline works.

---

## Step 2 — Turn the generated block into BeeOrbit


cd src
touch index.js
edit index.js and add the line:
 import './bee-orbit';

mv beeseen bee-orbit
adapt the content to change beeseen into bee-orbit :

Edit the generated block’s `block.json` and set:

* `"name": "beeseen/bee-orbit"`
* `"title": "BeeOrbit"`
* `"textdomain": "beeseen"`

In the block `edit` and `save`, keep it trivial:

* Editor: render a simple `<div>` with a label “BeeOrbit (placeholder)”
* Save: output a wrapper with a class like `beeseen-orbit`

change .wp-block-create-block-bee-orbit to .wp-block-beeseen-bee-orbit



```


---

## Step 3 — Add the second block BeeWobble (or any other blocks)


edit src/index.js and add the line:
 import './bee-wobble';


duplicate the orbit :
./scripts/dup_block.sh BeeWobble --from bee-orbit --from-camel BeeOrbit --from-title "Bee Orbit"


Duplicate the existing block folder (the one that contains `block.json`, `edit`, `save`, etc.) into a new folder for wobble.

Then update the duplicated block’s `block.json`:

* `"name": "beeseen/bee-wobble"`
* `"title": "BeeWobble"`
* `"textdomain": "beeseen"`

And in its `edit/save`, change the label and wrapper class to `beeseen-wobble`.


```

---



## Step 4 — Build and test

```bash
npm run build
```

Then in WordPress:

* Insert **BeeOrbit** and **BeeWobble**
* Save and view frontend
* Confirm Orbit is flipped, Wobble reacts on hover

---

---

## Step 5 — Make both blocks visibly different (still minimal)

Add tiny CSS differences so you can confirm each block is loading correctly:

* BeeOrbit: rotate the container 180° (demo “upside down”)
* BeeWobble: slight hover tilt/raise

No JS needed yet.

---
