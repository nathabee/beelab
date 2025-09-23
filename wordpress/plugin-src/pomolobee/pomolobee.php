<?php 

/**
 * Plugin Name:       PomoloBee WP
 * Description:       FSE block hosting a React SPA that talks to Django.
 * Version:           v1.1.1
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


register_activation_hook(__FILE__, 'pomolobee_activate');

// 2) Register CPT at runtime (every request) 
add_action('init', function () {
    register_post_type('pomolobee_page', [
        'label'               => 'Pomolobee Pages',
        'public'              => true,
        'publicly_queryable'  => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'has_archive'         => false,
        'rewrite'             => false,  
        'supports'            => ['title', 'editor'],
        'show_in_nav_menus'   => false,
        'exclude_from_search' => true,
        'menu_position'       => 20,
        'menu_icon'           => 'dashicons-chart-line',
    ]);
});

// Always register the two catch-all rules (NO FLUSH here)
add_action('init', function () {
    add_rewrite_rule('^pomolobee/?$',    'index.php?post_type=pomolobee_page&name=pomolobee', 'top');
    add_rewrite_rule('^pomolobee/.+/?$', 'index.php?post_type=pomolobee_page&name=pomolobee', 'top');
}, 1);

// Activation: ensure post exists, add rules, HARD flush once
function pomolobee_activate() {
    register_post_type('pomolobee_page', [
        'label'  => 'Pomolobee Pages',
        'public' => true,
        'rewrite'=> false,
        'supports'=> ['title','editor'],
        'show_in_rest'=> true,
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

    // Default the option if missing (so your settings show new default)
    if (false === get_option('pomolobee_api_url', false)) {
        update_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/api');
    }

    add_rewrite_rule('^pomolobee/?$',    'index.php?post_type=pomolobee_page&name=pomolobee', 'top');
    add_rewrite_rule('^pomolobee/?$/',    'index.php?post_type=pomolobee_page&name=pomolobee', 'top');
    add_rewrite_rule('^pomolobee/.+/?$', 'index.php?post_type=pomolobee_page&name=pomolobee', 'top');

    flush_rewrite_rules(true); // one hard flush on activation
}

// Deactivation: just flush to clear them out
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');






/**
 * 5) Front-end styles (Bootstrap)
 */

/* load bootstrap just for the cntainer, not application wide */


/*
add_action('wp_enqueue_scripts', function () {
    if (!is_singular('pomolobee_page')) return;

  
    wp_enqueue_style(
        'pomolobee-bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        [],
        null
    );
  

    /*
    Or if you don’t actually need a custom override,
     you can just remove the override enqueue entirely (the block’s own style-view.css is already loaded via block.json).
    //
    $override_path = plugin_dir_path(__FILE__) . 'build/pomolobee-app/style-override.css';
    if ( file_exists($override_path) ) {
        wp_enqueue_style(
            'pomolobee-app-override',
            plugins_url('build/pomolobee-app/style-override.css', __FILE__),
            ['pomolobee-bootstrap'],
            filemtime($override_path)
        );
    } 

}, 20);

*/

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
/*
add_action('enqueue_block_assets', function () {
    if ( ! is_singular('pomolobee_page') ) {
        return;
    }


    wp_enqueue_script('wp-element');

    // This is the auto handle generated from block.json’s "viewScript"
    $handle = 'pomolobee-pomolobee-app-view-script';

    // Ensure the script is present even if core didn't enqueue it yet
    if ( ! wp_script_is($handle, 'enqueued') ) {
        // If it's registered (it should be after register_block_type on init), enqueue it
        if ( wp_script_is($handle, 'registered') ) {
            wp_enqueue_script($handle);
        } else {
            // Helpful breadcrumb when something’s off in registration
            error_log('[PomoloBee] View script handle not registered: ' . $handle);
        }
    }

    // Localize our own settings so we never depend on Competence being active
    wp_localize_script($handle, 'pomolobeeSettings', [
        'apiUrl'    => get_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/api'),
        'basename'  => '/pomolobee',
        'errorPath' => '/error',
    ]);
}, 20);
*/
add_action('wp_enqueue_scripts', function () {
    if ( ! is_singular('pomolobee_page') && ! has_block('pomolobee/pomolobee-app') ) {
        return;
    }

    $handle = 'pomolobee-pomolobee-app-view-script';

    if ( wp_script_is($handle, 'registered') ) {
        if ( ! wp_script_is($handle, 'enqueued') ) {
            wp_enqueue_script($handle);
        }
        wp_localize_script($handle, 'pomolobeeSettings', [
            'apiUrl'    => get_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/api'),
            'basename'  => '/pomolobee',
            'errorPath' => '/error',
        ]);
    } else {
        error_log('[PomoloBee] View script handle not registered: ' . $handle);
    }
}, 20);


/* force default to be prod */


register_activation_hook(__FILE__, function () {
    if (false === get_option('pomolobee_api_url', false)) {
        update_option('pomolobee_api_url', 'https://beelab-api.nathabee.de/apidefaulthook');
    }
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

 

  
 
 

// Rescue direct hits when rewrites are stale or permalinks are "Plain"
add_filter('pre_handle_404', function ($pre, $wp_query) {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#^/pomolobee(?:/.*)?$#', $path)) {
        $post = get_page_by_path('pomolobee', OBJECT, 'pomolobee_page');
        if ($post) {
            $wp_query->set('post_type', 'pomolobee_page');
            $wp_query->set('name', 'pomolobee');
            $wp_query->is_404 = false;
            return true; // short-circuit 404 handling
        }
    }
    return $pre;
}, 10, 2);


