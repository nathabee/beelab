# 1) delete ALL competence CPT posts (ignore error if none)
dc run --rm "$BEELAB_WPCLI_SVC" bash -lc '
  ids=$(wp post list --post_type=competence_page --format=ids || true)
  if [ -n "$ids" ]; then wp post delete $ids --force; fi
  # (optional) also delete the old top-level login page if you ever created it
  lid=$(wp post list --post_type=page --name=competence_login --format=ids || true)
  if [ -n "$lid" ]; then wp post delete $lid --force; fi
'

# 2) delete plugin options / transients you might have stored
dc run --rm "$BEELAB_WPCLI_SVC" bash -lc '
  wp option delete competence_api_url || true
  # best-effort: drop competence-related transients/options if any
  wp db query "DELETE FROM $(wp db prefix --quiet)options
               WHERE option_name LIKE '\_transient\_competence\_%'
                  OR option_name LIKE '\_site\_transient\_competence\_%'" || true
'

# 3) drop cached rewrite rules (this also removes any bad ad-hoc rules)
dc run --rm "$BEELAB_WPCLI_SVC" wp eval 'delete_option("rewrite_rules"); echo "rewrite_rules deleted\n";'
dc run --rm "$BEELAB_WPCLI_SVC" wp rewrite flush --hard

# 4) quick health checks
dc run --rm "$BEELAB_WPCLI_SVC" bash -lc '
  echo "=== competence rules ==="
  wp rewrite list | egrep "^competence" || echo "(none yet — will appear after plugin registers CPT)"
  echo "=== parse test ==="
  php -r '"'"'
    require "wp-load.php";
    function test($u){ global $wp;
      $_SERVER["REQUEST_URI"]=$u; $wp->parse_request();
      echo $u," => ", json_encode($wp->query_vars, JSON_UNESCAPED_SLASHES), PHP_EOL;
    }
    test("/competence/competence_home");
    test("/competence/competence_dashboard");
  '"'"'
'

