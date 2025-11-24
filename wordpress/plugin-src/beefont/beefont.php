<?php

/**
 * Plugin Name:       BeeFont WP
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
register_activation_hook(__FILE__, 'beefont_wp_create_pages');
 

function beefont_wp_create_pages()
{
    $pages = [
        // Visible in menu (we’ll add it deliberately in the nav) — keep a core page if you want
        [
            'title' => 'BeeFont',
            'slug'  => 'beefont', 
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'page',
        ],
        // Hidden from menus (CPT)
        [
            'title' => 'Login',
            'slug'  => 'login',  
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'Home',
            'slug'  => 'home',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'Dashboard',
            'slug'  => 'dashboard',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ], 
        [
            'title' => 'JobOverviewPage',
            'slug'  => 'joboverviewp',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'JobDetailPage',
            'slug'  => 'jobdetailp',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ], 
        [
            'title' => 'PrintUploadPage',
            'slug'  => 'printupload',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'PageAnalysisRetryPage',
            'slug'  => 'pageanalysisretry',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'GlyphBrowserPage',
            'slug'  => 'glyphbrowser',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'MissingCharactersPage',
            'slug'  => 'missingcharacters',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'FontBuildPage',
            'slug'  => 'fontbuild',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'Error Management',
            'slug'  => 'error_mgt',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'Error',
            'slug'  => 'error',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
        ],
        [
            'title' => 'User Management',
            'slug'  => 'user_mgt',
            'block' => '<!-- wp:beefont/beefont-app /-->',
            'type'  => 'beefont_page',
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
        'beefont-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    );
});


/************************************************************** 
 * SECTION FOR SETTINGS : ADMIN MENU AND ENQUEUE FOR VIEW.JS
 *****************************************************************/
// 🔧 Register settings page and settings fields
add_action('admin_menu', 'beefont_register_settings_page');
add_action('admin_init', 'beefont_register_settings');

// ✅ Adds a new page under "Settings" in WP admin
function beefont_register_settings_page()
{
    add_options_page(
        'BeeFont Settings',
        'BeeFont Settings',
        'manage_options',
        'beefont-settings',
        'beefont_settings_page_html'
    );
}

// ✅ Register the setting, section, and input field
function beefont_register_settings()
{
    register_setting('beefont_settings_group', 'beefont_api_url');

    add_settings_section(
        'beefont_main_section',
        'Main Settings',
        null,
        'beefont-settings'
    );

    add_settings_field(
        'beefont_api_url',
        'API Base URL',
        'beefont_api_url_render',
        'beefont-settings',
        'beefont_main_section'
    );
}

// ✅ Renders the input box in the admin settings form
function beefont_api_url_render()
{
    $value = get_option('beefont_api_url', 'https://beelab-api.nathabee.de');
    echo "<input type='text' name='beefont_api_url' value='" . esc_attr($value) . "' size='50'>";
}

// ✅ Renders the full admin settings page HTML
function beefont_settings_page_html()
{
?>
    <div class="wrap">
        <h1>BeeFont Plugin Settings</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('beefont_settings_group');
            do_settings_sections('beefont-settings');
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
            if (strpos($handle, 'beefont') !== false) {
                error_log("🐝 BeeFont script handle found: $handle");
            }
        }
    }
});

// Inline runtime config for the view bundle (same pattern as before)
add_action('wp_enqueue_scripts', function () {
    // Use the actual handle for your block view script if known. 
    // Keeping the same pattern you had:
    $handle = 'beefont-beefont-app-view-script';

    if (wp_script_is($handle, 'registered')) {
        $api_url = get_option('beefont_api_url', 'https://beelab-api.nathabee.de/api');
        wp_add_inline_script(
            $handle,
            'window.beefontSettings = ' . wp_json_encode([
                'apiUrl'   => $api_url,
                'basename' => '/beefont',
            ]) . ';',
            'before'
        );
    }
}, 20);

// CPT with rewrite /beefont/...
add_action('init', function () {
    register_post_type('beefont_page', [
        'label'               => 'BeeFont Pages',
        'public'              => true,
        'show_ui'             => true,
        'show_in_rest'        => true,   // Gutenberg/Blocks
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'beefont'], // /beefont/...
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});
