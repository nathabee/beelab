<?php

/**
 * Plugin Name:       BeeGame WP
 * Description:       Simulation games (e.g. Conway’s Game of Life) as FSE blocks.
 * Version:           v1.1.10
 * Author:            Nathabee
 */

if (function_exists('wp_register_block_types_from_metadata_collection')) {
    add_action('init', function () {
        wp_register_block_types_from_metadata_collection(
            __DIR__ . '/build',
            __DIR__ . '/build/blocks-manifest.php'
        );
    });
}

// FIRST INIT: create core BeeGame pages on activation
register_activation_hook(__FILE__, 'beegame_wp_create_pages');

function beegame_wp_create_pages()
{
    $pages = [
        // Public main entry page
        [
            'title' => 'BeeGame',
            'slug'  => 'beegame',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'page',
        ],
        // Internal app pages (CPT)
        [
            'title' => 'Home',
            'slug'  => 'home',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Game of Life',
            'slug'  => 'lifesim',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Burning Forest',
            'slug'  => 'forestfire',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Epidemic Spread Modele SIR',
            'slug'  => 'epidemic',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Diffusion or Heat Map',
            'slug'  => 'diffusion',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Error Management',
            'slug'  => 'error_mgt',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Error',
            'slug'  => 'error',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
    ];

    foreach ($pages as $page) {
        if (! get_page_by_path($page['slug'], OBJECT, $page['type'])) {
            wp_insert_post([
                'post_title'   => $page['title'],
                'post_name'    => $page['slug'],
                'post_content' => $page['block'],
                'post_status'  => 'publish',
                'post_type'    => $page['type'],
            ]);
        }
    }
}

/**************************************************************
 * STYLES
 **************************************************************/

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'beegame-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    );
});

// Optional: debug registered script handles in the frontend
add_action('wp_print_scripts', function () {
    if (! is_admin()) {
        global $wp_scripts;
        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'beegame') !== false) {
                error_log("🐝 BeeGame script handle found: $handle");
            }
        }
    }
});

 

// CPT with rewrite /beegame/...
add_action('init', function () {
    register_post_type('beegame_page', [
        'label'               => 'BeeGame Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'beegame'], // /beegame/...
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});
