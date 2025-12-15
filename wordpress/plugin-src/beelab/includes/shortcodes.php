<?php
if ( ! defined( 'ABSPATH' ) ) exit;
/**
 * [beelab_svg] shortcode
 * Usage examples:
 *   [beelab_svg name="animated-bee" class="w-100" title="Busy bee"]
 *   [beelab_svg url="https://example.com/wp-content/uploads/2025/09/bee.svg" class="mx-auto"]
 */
add_shortcode('beelab_svg', function($atts = []) {
    $a = shortcode_atts([
        'name'  => '',
        'url'   => '',
        'class' => '',
        'title' => '',
    ], $atts, 'beelab_svg');
    $svg_path = '';
    if ( $a['name'] ) {
        $name = preg_replace('~[^a-zA-Z0-9_\-]~', '', $a['name']);
        if ( empty($name) ) return '';
        $theme_dir = get_stylesheet_directory();
        $candidate = trailingslashit($theme_dir) . 'assets/svg/' . $name . '.svg';
        if ( ! file_exists( $candidate ) ) return '';
        $svg_path = $candidate;
    } elseif ( $a['url'] ) {
        $uploads = wp_get_upload_dir();
        $baseurl = trailingslashit( $uploads['baseurl'] );
        $basedir = trailingslashit( $uploads['basedir'] );
        $url = esc_url_raw( $a['url'] );
        if ( strpos( $url, $baseurl ) !== 0 ) return '';
        $rel = ltrim( substr( $url, strlen($baseurl) ), '/' );
        $candidate = $basedir . $rel;
        if ( ! file_exists( $candidate ) ) return '';
        $svg_path = $candidate;
    } else {
        return '';
    }
    $svg = file_get_contents( $svg_path );
    if ( $svg === false ) return '';
    // strip <script> blocks
    $svg = preg_replace('~<\s*script[^>]*>.*?<\s*/\s*script>~is', '', $svg);
    if ( ! empty( $a['title'] ) ) {
        $title = wp_kses( $a['title'], [] );
        $svg = preg_replace(
            '/<svg\b([^>]*)>/',
            '<svg$1 role="img" aria-label="'. esc_attr($title) .'"><title>'. esc_html($title) .'</title>',
            $svg,
            1
        );
    }
    if ( ! empty( $a['class'] ) ) {
        $class = esc_attr( $a['class'] );
        if ( preg_match('/<svg\b[^>]*\bclass="/', $svg) ) {
            $svg = preg_replace('/(<svg\b[^>]*\bclass=")([^"]*)"/', '$1$2 ' . $class . '"', $svg, 1);
        } else {
            $svg = preg_replace('/<svg\b/', '<svg class="' . $class . '"', $svg, 1);
        }
    }
    return $svg;
});