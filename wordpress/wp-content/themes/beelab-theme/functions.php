<?php
add_action('wp_enqueue_scripts', function() {
  wp_enqueue_style('beelab-style', get_stylesheet_uri(), [], wp_get_theme()->get('Version'));
});

 
 
add_action('after_setup_theme', function () {
  add_theme_support('custom-logo', [
    'height'      => 200,
    'width'       => 200,
    'flex-height' => true,
    'flex-width'  => true,
    'unlink-homepage-logo' => true,
  ]);
});
