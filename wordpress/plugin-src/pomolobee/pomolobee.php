<?php

/**
 * Plugin Name:       PomoloBee WP
 * Description:       FSE blocks integrating with Django backend.
 * Version:           v1.1.9
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

// FIRST INIT
register_activation_hook(__FILE__, 'pomolobee_wp_create_pages');

function pomolobee_wp_create_pages()
{
    $pages = [
        // Visible in menu (we’ll add it deliberately in the nav) — keep a core page if you want
        [
            'title' => 'Pomolobee',
            'slug'  => 'pomolobee',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'page',
        ],
        // Hidden from menus (CPT) — routes used by SPA under /pomolobee/...
        [
            'title' => 'Login',
            'slug'  => 'login',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'page',
        ],
        [
            'title' => 'Home',
            'slug'  => 'home',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'pomolobee_page',
        ],
        [
            'title' => 'Dashboard',
            'slug'  => 'dashboard',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'pomolobee_page',
        ],
        [
            'title' => 'Farm',
            'slug'  => 'farm',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'pomolobee_page',
        ],
        [
            'title' => 'Farm Management',
            'slug'  => 'farmmgt',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'pomolobee_page',
        ],
        [
            'title' => 'Error',
            'slug'  => 'error',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'pomolobee_page',
        ],
        [
            'title' => 'ErrorMgt',
            'slug'  => 'errormgt',
            'block' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'type'  => 'pomolobee_page',
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
 * SECTION FOR STYLES
 *****************************************************************/
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'pomolobee-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    );
});


/************************************************************** 
 * SECTION FOR SETTINGS : ADMIN MENU AND ENQUEUE FOR VIEW.JS
 *****************************************************************/
// 🔧 Register settings page and settings fields
add_action('admin_menu', 'pomolobee_register_settings_page');
add_action('admin_init', 'pomolobee_register_settings');

// ✅ Adds a new page under "Settings" in WP admin
function pomolobee_register_settings_page()
{
    add_options_page(
        'PomoloBee Settings',
        'PomoloBee Settings',
        'manage_options',
        'pomolobee-settings',
        'pomolobee_settings_page_html'
    );
}

// ✅ Register the setting, section, and input field
function pomolobee_register_settings()
{
    register_setting('pomolobee_settings_group', 'pomolobee_api_url');

    add_settings_section(
        'pomolobee_main_section',
        'Main Settings',
        null,
        'pomolobee-settings'
    );

    add_settings_field(
        'pomolobee_api_url',
        'API Base URL',
        'pomolobee_api_url_render',
        'pomolobee-settings',
        'pomolobee_main_section'
    );
}

// ✅ Renders the input box in the admin settings form
function pomolobee_api_url_render()
{
    $value = get_option('pomolobee_api_url', 'https://beelab-api.nathabee.de');
    echo "<input type='text' name='pomolobee_api_url' value='" . esc_attr($value) . "' size='50'>";
}

// ✅ Renders the full admin settings page HTML
function pomolobee_settings_page_html()
{
?>
    <div class="wrap">
        <h1>PomoloBee Plugin Settings</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('pomolobee_settings_group');
            do_settings_sections('pomolobee-settings');
            submit_button();
            ?>
        </form>
    </div>
<?php
}

// 🐞 Optional: debug registered script handles in the frontend
add_action('wp_print_scripts', function () {
    if (!is_admin()) {
        global $wp_scripts;
        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'pomolobee') !== false) {
                error_log("🐝 PomoloBee script handle found: $handle");
            }
        }
    }
});

// Make sure our view bundle depends on core React + JSX runtime.
add_action('wp_enqueue_scripts', function () {
    $handle = 'pomolobee-pomolobee-app-view-script';
    $wp_scripts = wp_scripts();

    if ( isset( $wp_scripts->registered[ $handle ] ) ) {
        $reg = $wp_scripts->registered[ $handle ];
        // Ensure deps array exists
        if ( ! is_array( $reg->deps ) ) { $reg->deps = []; }

        foreach ( [ 'wp-element', 'react-jsx-runtime' ] as $dep ) {
            if ( ! in_array( $dep, $reg->deps, true ) ) {
                $reg->deps[] = $dep;
            }
        }
    }
}, 5);

// Inline runtime config for the view bundle (same pattern as before)
add_action('wp_enqueue_scripts', function () {
    // Use the actual handle for your block view script if known. 
    // Keeping the same pattern you had:
    $handle = 'pomolobee-pomolobee-app-view-script';

    if (wp_script_is($handle, 'registered')) {
        $api_url = get_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/api');
        wp_add_inline_script(
            $handle,
            'window.pomolobeeSettings = ' . wp_json_encode([
                'apiUrl'   => $api_url,
                'basename' => '/pomolobee',
            ]) . ';',
            'before'
        );
    }
}, 20);

// CPT with rewrite /pomolobee/...
add_action('init', function () {
    register_post_type('pomolobee_page', [
        'label'               => 'PomoloBee Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,   // Gutenberg/Blocks
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'pomolobee'], // /pomolobee/...
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});
