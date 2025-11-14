
<?php
namespace BeeFont; if (!defined('ABSPATH')) exit;
class Admin {
  public static function init(){
    add_action('admin_menu',[__CLASS__,'menu']);
    add_action('admin_enqueue_scripts',[__CLASS__,'assets']);
    add_action('wp_ajax_beefont_create',[__CLASS__,'ajax_create']);
    add_action('wp_ajax_beefont_poll',[__CLASS__,'ajax_poll']);
  }
  public static function menu(){ add_menu_page('BeeFont','BeeFont','upload_files','beefont',[__CLASS__,'page'],'dashicons-editor-textcolor',58); }
  public static function assets($hook){
    if($hook!=='toplevel_page_beefont') return;
    wp_enqueue_style('beefont-admin', BEEFNT_URL.'assets/css/admin.css',[], '0.1');
    wp_enqueue_script('beefont-admin', BEEFNT_URL.'assets/js/admin.js',['jquery'],'0.1', true);
    wp_localize_script('beefont-admin','BEEFNT',[ 'ajax'=>admin_url('admin-ajax.php'), 'nonce'=>wp_create_nonce('beefont') ]);
  }
  public static function page(){ ?>
    <div class="wrap">
      <h1>BeeFont</h1>
      <p>Upload a scanned A4 worksheet (PNG/JPEG). The build runs in BeeFontCore.</p>
      <div class="beefont-uploader">
        <input type="file" id="bf-file" accept="image/png,image/jpeg" />
        <input type="text" id="bf-family" placeholder="Family Name (e.g. BeeHand)" />
        <button class="button button-primary" id="bf-create">Segment & Build</button>
      </div>
      <div id="bf-log"></div>
    </div>
  <?php }
  public static function ajax_create(){
    check_ajax_referer('beefont','nonce');
    if(empty($_FILES['image'])) wp_send_json_error('No image',400);
    $tmp = $_FILES['image']['tmp_name'];
    $fam = sanitize_text_field($_POST['family'] ?: 'BeeHand');
    try { $res = API::create_job($tmp, $fam); wp_send_json_success($res); }
    catch(\Exception $e){ wp_send_json_error($e->getMessage(),500); }
  }
  public static function ajax_poll(){
    check_ajax_referer('beefont','nonce');
    $sid = sanitize_text_field($_POST['sid'] ?? '');
    try { $res = API::get_job($sid); wp_send_json_success($res); }
    catch(\Exception $e){ wp_send_json_error($e->getMessage(),500); }
  }
}
