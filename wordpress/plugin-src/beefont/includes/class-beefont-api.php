
<?php
namespace BeeFont; if (!defined('ABSPATH')) exit;
class API {
  public static function base(){
    $url = getenv('BEEFONT_DJANGO_INTERNAL');
    if(!$url){ $url = getenv('BEEFONT_DJANGO_PUBLIC') ?: site_url('/api/beefont'); }
    return rtrim($url,'/');
  }
  public static function create_job($file_path, $family='BeeHand', $template='A4_10x10'){
    $url = self::base().'/jobs';
    $body = [ 'family'=>$family, 'template_name'=>$template, 'image'=>curl_file_create($file_path, mime_content_type($file_path), basename($file_path)) ];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code >= 300) throw new \Exception($res ?: 'BeeFontCore error');
    return json_decode($res, true);
  }
  public static function get_job($sid){
    $url = self::base().'/jobs/'.$sid;
    $res = wp_remote_get($url, ['timeout'=>60]);
    if (is_wp_error($res)) throw new \Exception($res->get_error_message());
    return json_decode(wp_remote_retrieve_body($res), true);
  }
}
