#!/bin/bash

set -e

PLUGIN_NAME="competence"
BUILD_PLUGIN="dist/$PLUGIN_NAME"
WORDPRESS_PLUGIN_DIR="../../wp-content/plugins"

echo "remove $WORDPRESS_PLUGIN_DIR/$PLUGIN_NAME"
rm -rf $WORDPRESS_PLUGIN_DIR/$PLUGIN_NAME
echo "Moving plugin to Wordpress"
 

cp -r $BUILD_PLUGIN  $WORDPRESS_PLUGIN_DIR
 


echo "✅ Plugin installed : $WORDPRESS_PLUGIN_DIR/$PLUGIN_NAME"
