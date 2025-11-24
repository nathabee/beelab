<?php
// uninstall.php
if ( ! defined('WP_UNINSTALL_PLUGIN') ) exit;

/**
 * Do NOT rely on constants or functions from the main plugin file here.
 * WP core is loaded, so you can call WP APIs (delete_option, get_posts, etc.).
 */

function pomolobee_cleanup_one_site() {
    // --- Options (add any others you may have created)
    delete_option('pomolobee_api_url');
    delete_option('pomolobee_version_flushed');  // if you used this
    delete_option('pomolobee_last_migrated');    // if you add versioned migrations

    // --- CPT posts (force delete)
    $ids = get_posts([
        'post_type'              => 'pomolobee_page',
        'post_status'            => 'any',
        'numberposts'            => -1,
        'fields'                 => 'ids',
        'suppress_filters'       => true,
        'no_found_rows'          => true,
        'update_post_meta_cache' => false,
        'update_post_term_cache' => false,
    ]);
    foreach ( $ids as $id ) {
        wp_delete_post( $id, true );
    }

    // --- Cron (if you ever schedule things)
    // wp_clear_scheduled_hook('pomolobee_cron_hook');

    // --- Transients (best-effort; adjust pattern if needed)
    global $wpdb;
    $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_pomolobee\_%' OR option_name LIKE '\_site\_transient\_pomolobee\_%'" );

    // --- Rewrite rules
    // Option A (cheap): drop the cached rules so WP rebuilds them on next request
    delete_option('rewrite_rules');

    // Option B (eager): do a soft flush now (needs permalinks set to something).
    // If you prefer the eager approach, uncomment:
    // flush_rewrite_rules(false);
}

if ( is_multisite() ) {
    // Site options variant (in case you ever stored network options)
    delete_site_option('pomolobee_api_url');

    $site_ids = get_sites([ 'fields' => 'ids' ]);
    foreach ( $site_ids as $site_id ) {
        switch_to_blog( $site_id );
        pomolobee_cleanup_one_site();
        restore_current_blog();
    }
} else {
    pomolobee_cleanup_one_site();
}
