<?php
/**
 * Plugin Name:       PomoloBee WP
 * Description:       FSE blocks integrating with Django backend.
 * Version:           1.0.0
 * Author:            Nathabee
 */

if ( function_exists( 'wp_register_block_types_from_metadata_collection' ) ) {
    add_action( 'init', function () {
        wp_register_block_types_from_metadata_collection(
            __DIR__ . '/build',
            __DIR__ . '/build/blocks-manifest.php'
        );
    });
}

// --- CPT registration ----
function pomolobee_register_cpt() {
    register_post_type('pomolobee_page', [
        'label'               => 'Pomolobee Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'pomolobee'], // /pomolobee/...
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
}
add_action('init', 'pomolobee_register_cpt');



// FIRST INIT
// --- Activation: create pages ---- 
register_activation_hook(__FILE__, 'pomolobee_wp_create_pages');
function pomolobee_wp_create_pages() {
    // Ensure CPT exists
    pomolobee_register_cpt();

    $pages = [
        ['title' => 'PomoloBee Login', 'slug' => 'pomolobee',           'block' => '<!-- wp:pomolobee/pomolobee-app /-->', 'type' => 'page'],
        ['title' => 'Home',            'slug' => 'pomolobee_home',      'block' => '<!-- wp:pomolobee/pomolobee-app /-->', 'type' => 'pomolobee_page'],
        ['title' => 'Dashboard',       'slug' => 'pomolobee_dashboard', 'block' => '<!-- wp:pomolobee/pomolobee-app /-->', 'type' => 'pomolobee_page'],
        ['title' => 'Farm',            'slug' => 'pomolobee_farm',      'block' => '<!-- wp:pomolobee/pomolobee-app /-->', 'type' => 'pomolobee_page'],
        ['title' => 'Farm Management', 'slug' => 'pomolobee_farmmgt',   'block' => '<!-- wp:pomolobee/pomolobee-app /-->', 'type' => 'pomolobee_page'],
        ['title' => 'Error',           'slug' => 'pomolobee_error',     'block' => '<!-- wp:pomolobee/pomolobee-app /-->', 'type' => 'pomolobee_page'],
    ];

    foreach ($pages as $page) {
        $existing = get_page_by_path($page['slug'], OBJECT, $page['type']);
        if ($existing) continue;

        wp_insert_post([
            'post_title'   => $page['title'],
            'post_name'    => $page['slug'],
            'post_content' => $page['block'],
            'post_status'  => 'publish',
            'post_type'    => $page['type'],
        ]);
    }

    flush_rewrite_rules();
}


/************************************************************** 
 * 
 * SECTION FOR STYLES
 * 
*****************************************************************/


add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'pomolobee-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    );
});


/************************************************************** 
 * 
 * SECTION FOR SETTINGS : ADMIN MENU AND ENQUEUE FOR VIEW.JS
 * 
*****************************************************************/
// 🔧 Register settings page and settings fields
add_action('admin_menu', 'pomolobee_register_settings_page');
add_action('admin_init', 'pomolobee_register_settings');

// ✅ Adds a new page under "Settings" in WP admin
function pomolobee_register_settings_page() {
    add_options_page(
        'PomoloBee Settings',       // Page title
        'PomoloBee Settings',       // Menu label
        'manage_options',            // Required capability
        'pomolobee-settings',       // Menu slug
        'pomolobee_settings_page_html' // Function to display the page
    );
}

// ✅ Register the setting, section, and input field
function pomolobee_register_settings() {
    register_setting('pomolobee_settings_group', 'pomolobee_api_url');

    add_settings_section(
        'pomolobee_main_section',     // Section ID
        'Main Settings',               // Title
        null,                          // Callback (none)
        'pomolobee-settings'          // Page slug
    );

    add_settings_field(
        'pomolobee_api_url',          // Field ID
        'API Base URL for Pomolobee',                // Label
        'pomolobee_api_url_render',   // Callback to render the input
        'pomolobee-settings',         // Page slug
        'pomolobee_main_section'      // Section ID
    );

}

// ✅ Renders the input box in the admin settings form
function pomolobee_api_url_render() { 
    $value = get_option('pomolobee_api_url', 'http://localhost:9001/api');
    echo "<input type='text' name='pomolobee_api_url' value='" . esc_attr($value) . "' size='50'>";
}

// ✅ Renders the full admin settings page HTML
function pomolobee_settings_page_html() {
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

// ✅ Enqueue your view.js and inject dynamic settings into the frontend
add_action('enqueue_block_assets', function () {
    $handle = 'pomolobee-pomolobee-app-view';

    wp_enqueue_script(
        $handle,
        plugins_url('build/pomolobee-app/view.js', __FILE__),
        ['wp-element', 'wp-blocks'],
        '1.0.0',
        true
    );

    $api_url = get_option('pomolobee_api_url', 'http://localhost:9001/api');

    wp_localize_script($handle, 'pomolobeeSettings', [
        'apiUrl'   => $api_url,
        'basename' => '/pomolobee', // <- fixed base for SPA routes
    ]);
});

// 🐞 Optional: debug registered script handles in the frontend
add_action('wp_print_scripts', function () {
    if (!is_admin()) {
        global $wp_scripts;
        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'pomolobee') !== false) {
                error_log("🧩 PomoloBee script handle found: $handle");
            }
        }
    }
});

 