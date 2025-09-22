<?php

/**
 * Plugin Name:       PomoloBee WP
 * Description:       FSE block hosting a React SPA that talks to Django.
 * Version:           1.0.0
 * Author:            Nathabee
 */

/**
 * 1) Register blocks from build/
 */
if (function_exists('wp_register_block_types_from_metadata_collection')) {
    add_action('init', function () {
        wp_register_block_types_from_metadata_collection(
            __DIR__ . '/build',
            __DIR__ . '/build/blocks-manifest.php'
        );
    });
}

// 2) Register CPT at runtime (every request)
add_action('init', function () {
    register_post_type('pomolobee_page', [
        'label'               => 'Pomolobee Pages',
        'public'              => true,
        'publicly_queryable'  => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'pomolobee', 'with_front' => false, 'pages' => false, 'feeds' => false],
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});

/**
 * 3) Deep-link refreshes need a catch-all rewrite
 * 
 * With only the CPT rewrite, WordPress will serve /pomolobee fine, 
 * but a hard refresh (or direct hit) on /pomolobee/dashboard, /pomolobee/login, etc. will 404, 
 * because WP tries to resolve those as real paths.
 * 
 * Your SPA navigation (client-side) works, but browser refresh on nested routes won’t—
 * unless you add a catch-all rewrite that maps /pomolobee/* back to the single CPT post.
 */

add_action('init', function () {
    add_rewrite_rule(
        '^pomolobee(?:/.*)?$',
        'index.php?post_type=pomolobee_page&name=pomolobee',
        'top'
    );
});



/**
 * 4) Deep-linking: route /pomolobee and /pomolobee/* to the single CPT post
 *    One rule is enough.
 */

function pomolobee_activate()
{
    // Register the CPT so WP knows it while we insert the post and flush rules.
    register_post_type('pomolobee_page', [
        'label'               => 'Pomolobee Pages',
        'public'              => true,
        'publicly_queryable'  => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'has_archive'         => false,
        'rewrite'             => ['slug' => 'pomolobee', 'with_front' => false, 'pages' => false, 'feeds' => false],
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);

    if (! get_page_by_path('pomolobee', OBJECT, 'pomolobee_page')) {
        wp_insert_post([
            'post_title'   => 'PomoloBee',
            'post_name'    => 'pomolobee',
            'post_content' => '<!-- wp:pomolobee/pomolobee-app /-->',
            'post_status'  => 'publish',
            'post_type'    => 'pomolobee_page',
        ]);
    }

    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'pomolobee_activate');
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');


/**
 * 5) Front-end styles (Bootstrap)
 */

/* load bootstrap just for the cntainer, not application wide */

add_action('wp_enqueue_scripts', function () {
    if (!is_singular('pomolobee_page')) return;

    wp_enqueue_style(
        'pomolobee-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        [],
        null
    );

    wp_enqueue_style(
        'pomolobee-app-override',
        plugins_url('build/pomolobee-app/style-override.css', __FILE__),
        ['pomolobee-bootstrap'], // ensures it loads after Bootstrap
        null
    );
}, 20);



/************************************************************** 
 * 
 * 7) Settings page for API base URL
 * SECTION FOR SETTINGS : ADMIN MENU AND ENQUEUE FOR VIEW.JS
 * 
 *****************************************************************/
// 🔧 Register settings page and settings fields
add_action('admin_menu', 'pomolobee_register_settings_page');
add_action('admin_init', 'pomolobee_register_settings');

// ✅ Adds a new page under "Settings" in WP admin
function pomolobee_register_settings_page()
{
    add_options_page(
        'Pomolobee Settings',       // Page title
        'Pomolobee Settings',       // Menu label
        'manage_options',            // Required capability
        'pomolobee-settings',       // Menu slug
        'pomolobee_settings_page_html' // Function to display the page
    );
}

// ✅ Register the setting, section, and input field
function pomolobee_register_settings()
{
    register_setting('pomolobee_settings_group', 'pomolobee_api_url');

    add_settings_section(
        'pomolobee_main_section',     // Section ID
        'Main Settings',               // Title
        null,                          // Callback (none)
        'pomolobee-settings'          // Page slug
    );

    add_settings_field(
        'pomolobee_api_url',          // Field ID
        'API Base URL',                // Label
        'pomolobee_api_url_render',   // Callback to render the input
        'pomolobee-settings',         // Page slug
        'pomolobee_main_section'      // Section ID
    );
}

// ✅ Renders the input box in the admin settings form
function pomolobee_api_url_render()
{
    $value = get_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/api');
    echo "<input type='text' name='pomolobee_api_url' value='" . esc_attr($value) . "' size='50'>";
}

// ✅ Renders the full admin settings page HTML
function pomolobee_settings_page_html()
{
?>
    <div class="wrap">
        <h1>Pomolobee Plugin Settings</h1>
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
    // This is the handle WP generates from block.json:
    $handle = 'pomolobee-pomolobee-app-view-script';
    //$handle = 'pomolobee-pomolobee-app-view';



    // Only localize if the script is actually registered.
    if (wp_script_is($handle, 'registered') || wp_script_is($handle, 'enqueued')) {
        $api_url = get_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/api');
        wp_localize_script($handle, 'pomolobeeSettings', [
            'apiUrl'   => $api_url,
            'basename' => '/pomolobee', // safer and predictable
            'errorPath' => '/error',
        ]);
    }
}, 20);

// 🐞 Optional: debug registered script handles in the frontend
add_action('wp_print_scripts', function () {
    if (!is_admin()) {
        global $wp_scripts;
        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'pomolobee') !== false) {
                error_log("🧩 Pomolobee script handle found: $handle");
            }
        }
    }
});
