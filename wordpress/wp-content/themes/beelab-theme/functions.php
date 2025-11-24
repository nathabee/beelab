<?php
// Enqueue: parent first, then child (child depends on parent)
add_action('wp_enqueue_scripts', function () {
    $parent_handle = 'twentytwentyfive-style';

    // Parent CSS
    wp_enqueue_style(
        $parent_handle,
        get_template_directory_uri() . '/style.css',
        [],
        wp_get_theme(get_template())->get('Version')
    );

    // Child CSS (depends on parent, so it loads AFTER it)
    wp_enqueue_style(
        'beelab-style',
        get_stylesheet_uri(),
        [$parent_handle],
        wp_get_theme()->get('Version')
    );
}, 100);

// Keep your theme supports
add_action('after_setup_theme', function () {
  add_theme_support('custom-logo', [
    'height'      => 200,
    'width'       => 200,
    'flex-height' => true,
    'flex-width'  => true,
    'unlink-homepage-logo' => true,
  ]);
});
