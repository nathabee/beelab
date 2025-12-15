=== BeeLab ===
Contributors: beelab
Tags: svg, animation, shortcode, block, pattern
Requires at least: 6.0
Tested up to: 6.6
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Inline animated SVGs in posts/pages/templates using a shortcode, a server-rendered block, and a reusable pattern. Safe by default.

== Description ==
This plugin provides:
- [beelab_svg] shortcode to inline SVG from your theme's assets/svg/ or from the Media Library (uploads directory only).
- Server-rendered block "Inline SVG (BeeLab)" with attributes (name/url/class/title).
- A reusable Block Pattern "Inline Animated SVG" available in the inserter.

Security: the SVG is read from disk and <script> tags are stripped. Only files in the uploads directory are allowed when using the url= attribute.

== Usage ==
1) Theme-hosted SVG (recommended):
- Place files in: wp-content/themes/your-theme/assets/svg/
- Insert shortcode: [beelab_svg name="animated-bee" class="w-100" title="Bee"]

2) Uploaded SVG (allow uploads via plugin like Safe SVG):
- Insert shortcode: [beelab_svg url="https://example.com/wp-content/uploads/2025/09/bee.svg"]

3) Block Editor:
- Add block "Inline SVG (BeeLab)" and set attributes in the sidebar.

4) Pattern:
- Insert pattern "Inline Animated SVG" and adjust the shortcode attributes.

== Changelog ==
= 1.0.0 =
- Initial release.
