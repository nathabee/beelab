<?php
/**
 * Plugin Name: BeeBlock Timeline
 * Plugin URI: https://nathabee.de
 * Description: A simple collapsible timeline block (year, title, description) for Gutenberg.
 * Author: Nathabee
 * Version: 0.1.0
 * Text Domain: beeblock-timeline
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Register the block using the metadata loaded from the block.json file.
 * This registers scripts and styles so they are available in the editor and frontend.
 */
function beeblock_timeline_block_init() {
    register_block_type( __DIR__ );
}
add_action( 'init', 'beeblock_timeline_block_init' );
