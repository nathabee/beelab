<?php
/**
 * Plugin Name:       BeeGame WP
 * Description:       Simulation games (e.g. Conway’s Game of Life) as FSE blocks.
 * Version:           v1.1.10
 * Author:            Nathabee
 */

/* Block registration */
if ( function_exists( 'wp_register_block_types_from_metadata_collection' ) ) {
    add_action( 'init', function () {
        wp_register_block_types_from_metadata_collection(
            __DIR__ . '/build',
            __DIR__ . '/build/blocks-manifest.php'
        );
    } );
}

/**
 * Register CPT beegame_page
 */
function beegame_register_cpt() {
    register_post_type( 'beegame_page', [
        'label'               => 'BeeGame Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'has_archive'         => false,
        'rewrite'             => [ 'slug' => 'beegame' ], // /beegame/...
        'supports'            => [ 'title', 'editor' ],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ] );
}
add_action( 'init', 'beegame_register_cpt' );

/**
 * Create core BeeGame pages on activation
 */
register_activation_hook( __FILE__, 'beegame_wp_activate' );

function beegame_wp_activate() {
    // 1) ensure CPT is registered for this request
    beegame_register_cpt();

    // 2) create pages
    beegame_wp_create_pages();

    // 3) flush rewrites so /beegame/... works immediately
    flush_rewrite_rules();
}

function beegame_wp_create_pages() {
    $pages = [
        [
            'title' => 'BeeGame',
            'slug'  => 'beegame',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'page',
        ],
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
            'title' => 'Elementary Automata',
            'slug'  => 'elementary',
            'block' => '<!-- wp:beegame/beegame-app /-->',
            'type'  => 'beegame_page',
        ],
        [
            'title' => 'Chaos Map',
            'slug'  => 'logisticmap',
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

    foreach ( $pages as $page ) {
        if ( ! get_page_by_path( $page['slug'], OBJECT, $page['type'] ) ) {
            wp_insert_post( [
                'post_title'   => $page['title'],
                'post_name'    => $page['slug'],
                'post_content' => $page['block'],
                'post_status'  => 'publish',
                'post_type'    => $page['type'],
            ] );
        }
    }
}

/**
 * Force our own template for the CPT beegame_page.
 */

/*
add_filter( 'single_template', 'beegame_wp_single_template' );

function beegame_wp_single_template( $single ) {
    if ( is_singular( 'beegame_page' ) ) {
        $tpl = plugin_dir_path( __FILE__ ) . 'templates/single-beegame_page.php';
        if ( file_exists( $tpl ) ) {
            return $tpl;
        }
    }
    return $single;
}
 
*/

/**************************************************************
 * STYLES
 **************************************************************/
 


add_action( 'wp_enqueue_scripts', function () {
    // Frontend only
    if ( is_admin() ) {
        return;
    }

    // Only load Bootstrap on pages that actually contain the block
    if ( ! has_block( 'beegame/beegame-app' ) ) {
        return;
    }

    // 1) Official Bootstrap
    wp_enqueue_style(
        'beegame-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        [],
        '5.3.0'
    );

    // 2) Map Bootstrap body colors to WP theme colors
    $custom_css = "
        body {
            --bs-body-bg: var(--wp--preset--color--base, #ffffff);
            --bs-body-color: var(--wp--preset--color--foreground, #000000);
        }
    ";
    wp_add_inline_style( 'beegame-bootstrap', $custom_css );

    // 3) Your own plugin styles (build output that contains style.css)
    // If you already enqueue them via block.json, you can skip this.
    // Otherwise something like:
    // wp_enqueue_style(
    //     'beegame-style',
    //     plugins_url( 'build/style.css', __FILE__ ),
    //     [ 'beegame-bootstrap' ],
    //     '1.0.0'
    // );
} );
