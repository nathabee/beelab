
<?php
if (!defined('ABSPATH')) exit;
namespace BeeFont;
function env($k,$d=''){ $v = getenv($k); return $v!==false ? $v : $d; }
