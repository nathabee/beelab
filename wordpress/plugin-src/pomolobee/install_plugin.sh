#!/bin/bash

set -e

PLUGIN_NAME="pomolobee"
BUILD_PLUGIN="dist/$PLUGIN_NAME"
WORDPRESS_PLUGIN_DIR="../../wp-content/plugins"

echo "Moving plugin to Wordpress"
 

cp -r $BUILD_PLUGIN  $WORDPRESS_PLUGIN_DIR
echo "✅ Plugin installed : $WORDPRESS_PLUGIN_DIR/$PLUGIN_NAME"





##!/bin/bash
#set -euo pipefail

#PLUGIN_NAME="pomolobee"
#BUILD_PLUGIN="dist/$PLUGIN_NAME"
#WORDPRESS_PLUGIN_DIR="../../wp-content/plugins/"
#TARGET="$WORDPRESS_PLUGIN_DIR/$PLUGIN_NAME"

#echo "Moving plugin to Wordpress"

#mkdir -p "$TARGET/build"
#rsync -a --delete --no-o --no-g --omit-dir-times build/ "$TARGET/build/"
#rsync -a --no-o --no-g --omit-dir-times $PLUGIN_NAME.php "$TARGET/"

#cp -rp $BUILD_PLUGIN  $WORDPRESS_PLUGIN_DIR

#echo "✅ Plugin installed : $TARGET"


 
