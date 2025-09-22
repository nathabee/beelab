<?php
// uninstall.php
if ( ! defined('WP_UNINSTALL_PLUGIN') ) {
    exit;
}

/**
 * Delete plugin options and all CPT posts created by the plugin.
 * Runs in an isolated scope — do not rely on functions/consts from your main plugin file.
 */

function pomolobee_delete_everything_for_site() {
    // remove the option
    delete_option('pomolobee_api_url');

    // delete all CPT posts (force delete)
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
}

if ( is_multisite() ) {
    // Clean up on every site in the network.
    $site_ids = get_sites( [ 'fields' => 'ids' ] );
    foreach ( $site_ids as $site_id ) {
        switch_to_blog( $site_id );
        pomolobee_delete_everything_for_site();
        restore_current_blog();
    }
    // Network-wide option variant (if you ever used it)
    delete_site_option('pomolobee_api_url');
} else {
    pomolobee_delete_everything_for_site();
}

// Optional: if you created cron events, transients, roles/caps, clean them here too.
// e.g. wp_clear_scheduled_hook('pomolobee_cron'); delete_transient('pomolobee_*');
