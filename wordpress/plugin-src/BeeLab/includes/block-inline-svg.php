<?php
if ( ! defined( 'ABSPATH' ) ) exit;
/**
 * Server-rendered block: beelab/inline-svg
 */
add_action('init', function() {
    register_block_type('beelab/inline-svg', [
        'api_version'     => 2,
        'render_callback' => 'beelab_render_inline_svg_block',
        'attributes'      => [
            'name'  => ['type' => 'string', 'default' => ''],
            'url'   => ['type' => 'string', 'default' => ''],
            'class' => ['type' => 'string', 'default' => 'beelab-animated-svg'],
            'title' => ['type' => 'string', 'default' => ''],
        ],
        'supports'        => [ 'html' => false, 'align' => [ 'wide', 'full' ] ],
    ]);
});
function beelab_render_inline_svg_block( $attrs ) {
    $name  = isset($attrs['name'])  ? $attrs['name']  : '';
    $url   = isset($attrs['url'])   ? $attrs['url']   : '';
    $class = isset($attrs['class']) ? $attrs['class'] : 'beelab-animated-svg';
    $title = isset($attrs['title']) ? $attrs['title'] : '';
    return do_shortcode( sprintf(
        '[beelab_svg name="%s" url="%s" class="%s" title="%s"]',
        esc_attr($name),
        esc_url_raw($url),
        esc_attr($class),
        esc_attr($title)
    ));
}