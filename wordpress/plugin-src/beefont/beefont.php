
<?php
/**
 * Plugin Name: BeeFont
 * Description: Upload handwriting scans, send to BeeFontCore (Django), and download the built font.
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) exit;
define('BEEFNT_PATH', plugin_dir_path(__FILE__));
define('BEEFNT_URL', plugin_dir_url(__FILE__));
require_once BEEFNT_PATH.'includes/helpers.php';
require_once BEEFNT_PATH.'includes/class-beefont-security.php';
require_once BEEFNT_PATH.'includes/class-beefont-api.php';
require_once BEEFNT_PATH.'includes/class-beefont-admin.php';
add_action('plugins_loaded', function(){
  \BeeFont\Security::init();
  \BeeFont\Admin::init();
});
