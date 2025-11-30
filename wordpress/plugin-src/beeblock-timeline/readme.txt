=== BeeBlock Timeline ===
Contributors: nathabee
Tags: block, gutenberg, timeline
Requires at least: 6.0
Tested up to: 6.6
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A simple collapsible timeline Gutenberg block for years, titles, and descriptions.

== Installation ==

1. Upload the beeblock-timeline folder to the /wp-content/plugins/ directory,
   or upload the ZIP via 'Plugins → Add New → Upload Plugin'.
2. Run `npm install` and `npm run build` inside the plugin folder if you are developing.
3. Activate the plugin through the 'Plugins' screen in WordPress.
4. Add the "Timeline (BeeBlock)" block to any page or post.

== Usage ==

Use the block sidebar controls to add, edit, or remove timeline entries
(year, title, description). The frontend uses native <details>/<summary>
elements for simple, accessible expand/collapse behaviour.
