<?php
/**
 * Plugin Name: BeeLab
 * Description: Shortcode + server-rendered block + pattern to inline animated SVGs safely in posts/pages/templates.
 * Version: 1.0.0
 * Author: BeeLab
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: beelab
 */
if ( ! defined( 'ABSPATH' ) ) exit;
define( 'BEELAB_PLUGIN_FILE', __FILE__ );
define( 'BEELAB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BEELAB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
require_once BEELAB_PLUGIN_DIR . 'includes/shortcodes.php';
require_once BEELAB_PLUGIN_DIR . 'includes/block-inline-svg.php';
add_action('init', function() {
    $pattern_file = BEELAB_PLUGIN_DIR . 'patterns/inline-animated-svg.php';
    if ( file_exists( $pattern_file ) ) {
        register_block_pattern_category( 'beelab', [ 'label' => __( 'BeeLab', 'beelab' ) ] );
        register_block_pattern(
            'beelab/inline-animated-svg',
            [
                'title'       => __( 'Inline Animated SVG', 'beelab' ),
                'description' => __( 'Reusable inline SVG element via shortcode', 'beelab' ),
                'categories'  => [ 'beelab', 'media', 'widgets' ],
                'content'     => file_get_contents( $pattern_file ),
            ]
        );
    }
});