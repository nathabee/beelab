<?php
/**
 * Plugin Name:       Competence WP
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

 
// FIRST INIT
register_activation_hook(__FILE__, 'competence_wp_create_pages');

function competence_wp_create_pages() {
    $pages = [
        // Visible in menu (we’ll add it deliberately in the nav)
        [
            'title' => 'Login',
            'slug'  => 'competence_login',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'page', // core page so it can be used easily in Navigation if you prefer
        ],
        // Hidden from menus (CPT)
        [
            'title' => 'Home',
            'slug'  => 'competence_home',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Dashboard',
            'slug'  => 'competence_dashboard',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Catalogue Management',
            'slug'  => 'competence_catalogue_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Report Management',
            'slug'  => 'competence_report_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Student Management',
            'slug'  => 'competence_student_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Overview Ongoing Test',
            'slug'  => 'competence_overview_test',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'PDF Setup',
            'slug'  => 'competence_pdf_conf',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'PDF View',
            'slug'  => 'competence_pdf_view',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Error',
            'slug'  => 'competence_error',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
    ];

    foreach ($pages as $page) {
        if (!get_page_by_path($page['slug'])) {
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
 * 
 * SECTION FOR STYLES
 * 
*****************************************************************/


add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'competence-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    );
});


/************************************************************** 
 * 
 * SECTION FOR SETTINGS : ADMIN MENU AND ENQUEUE FOR VIEW.JS
 * 
*****************************************************************/
// 🔧 Register settings page and settings fields
add_action('admin_menu', 'competence_register_settings_page');
add_action('admin_init', 'competence_register_settings');

// ✅ Adds a new page under "Settings" in WP admin
function competence_register_settings_page() {
    add_options_page(
        'Competence Settings',       // Page title
        'Competence Settings',       // Menu label
        'manage_options',            // Required capability
        'competence-settings',       // Menu slug
        'competence_settings_page_html' // Function to display the page
    );
}

// ✅ Register the setting, section, and input field
function competence_register_settings() {
    register_setting('competence_settings_group', 'competence_api_url');

    add_settings_section(
        'competence_main_section',     // Section ID
        'Main Settings',               // Title
        null,                          // Callback (none)
        'competence-settings'          // Page slug
    );

    add_settings_field(
        'competence_api_url',          // Field ID
        'API Base URL',                // Label
        'competence_api_url_render',   // Callback to render the input
        'competence-settings',         // Page slug
        'competence_main_section'      // Section ID
    );
}

// ✅ Renders the input box in the admin settings form
function competence_api_url_render() {
    $value = get_option('competence_api_url', 'http://localhost:9001/api/');
    echo "<input type='text' name='competence_api_url' value='" . esc_attr($value) . "' size='50'>";
}

// ✅ Renders the full admin settings page HTML
function competence_settings_page_html() {
    ?>
    <div class="wrap">
        <h1>Competence Plugin Settings</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('competence_settings_group');
            do_settings_sections('competence-settings');
            submit_button();
            ?>
        </form>
    </div>
    <?php
}

// ✅ Enqueue your view.js and inject dynamic settings into the frontend
add_action('enqueue_block_assets', function () {
    $handle = 'competence-competence-app-view';

    // Load the React bundle from the plugin directory
    wp_enqueue_script(
        $handle,
        plugins_url('build/competence-app/view.js', __FILE__),
        ['wp-element', 'wp-blocks'],
        '1.0.0',
        true // Footer
    );

    // Inject the API URL into the frontend script
    $api_url = get_option('competence_api_url', 'http://localhost:9001/api/');
 

    wp_localize_script($handle, 'competenceSettings', [
    'apiUrl' => $api_url,
    'basename' => parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
    ]);

});

// 🐞 Optional: debug registered script handles in the frontend
add_action('wp_print_scripts', function () {
    if (!is_admin()) {
        global $wp_scripts;
        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'competence') !== false) {
                error_log("🧩 Competence script handle found: $handle");
            }
        }
    }
});


// functions.php or plugin main file
add_action('init', function () {
    register_post_type('competence_page', [
        'label'               => 'Competence Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,   // Gutenberg/Blocks
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'competence'], // /competence/...
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,  // <<< keep out of default menus
        'exclude_from_search' => true,   // optional
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});
