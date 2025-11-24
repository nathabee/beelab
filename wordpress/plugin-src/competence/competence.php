<?php

/**
 * Plugin Name:       Competence WP
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
register_activation_hook(__FILE__, 'competence_wp_create_pages');

function competence_wp_create_pages()
{
    $pages = [
        // Visible in menu (we’ll add it deliberately in the nav) — keep a core page if you want
        [
            'title' => 'Competence',
            'slug'  => 'competence', 
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'page',
        ],
        // Hidden from menus (CPT)
        [
            'title' => 'Login',
            'slug'  => 'login',  
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Home',
            'slug'  => 'home',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Dashboard',
            'slug'  => 'dashboard',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Catalogue Management',
            'slug'  => 'catalogue_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Report Management',
            'slug'  => 'report_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Student Management',
            'slug'  => 'student_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Overview Ongoing Test',
            'slug'  => 'overview_test',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'PDF Setup',
            'slug'  => 'pdf_conf',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'PDF View',
            'slug'  => 'pdf_view',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Error Management',
            'slug'  => 'error_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'Error',
            'slug'  => 'error',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
        ],
        [
            'title' => 'User Management',
            'slug'  => 'user_mgt',
            'block' => '<!-- wp:competence/competence-app /-->',
            'type'  => 'competence_page',
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
        'competence-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    );
});


/************************************************************** 
 * SECTION FOR SETTINGS : ADMIN MENU AND ENQUEUE FOR VIEW.JS
 *****************************************************************/
// 🔧 Register settings page and settings fields
add_action('admin_menu', 'competence_register_settings_page');
add_action('admin_init', 'competence_register_settings');

// ✅ Adds a new page under "Settings" in WP admin
function competence_register_settings_page()
{
    add_options_page(
        'Competence Settings',
        'Competence Settings',
        'manage_options',
        'competence-settings',
        'competence_settings_page_html'
    );
}

// ✅ Register the setting, section, and input field
function competence_register_settings()
{
    register_setting('competence_settings_group', 'competence_api_url');

    add_settings_section(
        'competence_main_section',
        'Main Settings',
        null,
        'competence-settings'
    );

    add_settings_field(
        'competence_api_url',
        'API Base URL',
        'competence_api_url_render',
        'competence-settings',
        'competence_main_section'
    );
}

// ✅ Renders the input box in the admin settings form
function competence_api_url_render()
{
    $value = get_option('competence_api_url', 'https://beelab-api.nathabee.de');
    echo "<input type='text' name='competence_api_url' value='" . esc_attr($value) . "' size='50'>";
}

// ✅ Renders the full admin settings page HTML
function competence_settings_page_html()
{
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

// 🐞 Optional: debug registered script handles in the frontend
add_action('wp_print_scripts', function () {
    if (!is_admin()) {
        global $wp_scripts;
        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'competence') !== false) {
                error_log("🐝 Competence script handle found: $handle");
            }
        }
    }
});

// Inline runtime config for the view bundle (same pattern as before)
add_action('wp_enqueue_scripts', function () {
    // Use the actual handle for your block view script if known. 
    // Keeping the same pattern you had:
    $handle = 'competence-competence-app-view-script';

    if (wp_script_is($handle, 'registered')) {
        $api_url = get_option('competence_api_url', 'https://beelab-api.nathabee.de/api');
        wp_add_inline_script(
            $handle,
            'window.competenceSettings = ' . wp_json_encode([
                'apiUrl'   => $api_url,
                'basename' => '/competence',
            ]) . ';',
            'before'
        );
    }
}, 20);

// CPT with rewrite /competence/...
add_action('init', function () {
    register_post_type('competence_page', [
        'label'               => 'Competence Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,   // Gutenberg/Blocks
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'competence'], // /competence/...
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});
