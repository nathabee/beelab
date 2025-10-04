Here’s a **detailed section for your WordPress configuration** in the BeeLab stack, specifically covering your custom **theme, plugins, and related configurations**:

---

## WordPress Configuration in BeeLab

BeeLab uses **WordPress 6** with a custom theme (`pomolobee-theme`) and plugins (`pomolobee`, `competence`). This section covers the theme and plugin setup, how WordPress is integrated with Django, and the related configurations in Docker.

### **WordPress Stack Overview**:

* **WordPress 6 (PHP 8.3 + Apache)** runs in a Docker container with custom configurations, themes, and plugins.
* **MariaDB 11** is used as the database backend for WordPress.
* The **WordPress theme** (`pomolobee-theme`) and **plugins** (`pomolobee`, `competence`) are integrated into the Docker environment.

### **Docker Volumes and Bind Mounts for WordPress**:

Your **WordPress-related files** are mounted directly from your host machine via **bind mounts** to ensure persistence across container rebuilds.

```yaml
wordpress:
  image: wordpress:6-php8.3-apache
  container_name: beelab-wp
  depends_on:
    wpdb:
      condition: service_healthy
  environment:
    <<: *wp_env
  ports:
    - "9082:80"
  volumes:
    - wp_data:/var/www/html             # Persist WordPress files
    - ./wordpress/wp-content:/var/www/html/wp-content  # Custom themes and plugins
    - ./django/media:/var/www/html/media:ro  # Shared media files (Django media)
    - ./django/staticfiles:/var/www/html/static:ro  # Shared static files (Django)
  profiles: ["dev"]
```

### **Theme Configuration**:

Your custom WordPress theme, **`pomolobee-theme`**, is located in `wordpress/wp-content/themes/pomolobee-theme`. This theme is mounted from the **host directory** to the container, and it includes:

* **Theme Assets**: Images, CSS, JavaScript files
* **Theme Settings**: You can customize settings in `theme.json` or other theme configuration files.

To add a logo to your WordPress site, place it in the following directory:

```text
wordpress/wp-content/themes/pomolobee-theme/assets/images/logo.(png|svg)
```

This logo will be used in the WordPress interface (depending on your configuration).

### **Plugins Configuration**:

Your WordPress setup also includes the **PomoloBee** and **Competence** plugins, both of which interface with the **Django backend** (via APIs) for orchard management and student evaluation.

The plugins are located in `wordpress/build`
by installing them with teh console , it will install them in `wp-content/plugins/pomolobee` and `wordpress/wp-content/plugins/competence`. 

#### **PomoloBee Plugin**:

This plugin is used for managing orchard-related data in WordPress and interacts with the **PomoloBeeCore** Django app.

 To **activate** the plugin, go to **WP Admin → Plugins → select the plugin → Activate Plugin**  
 

The plugin requires **API configuration** to connect to the Django backend:

   * Navigate to **Settings → Competence Settings** in the WordPress Admin.
   * Check the **API endpoint** to `http://localhost:9001/api/pomolobee/` for local development.

#### **Competence Plugin**:

This plugin integrates with the **CompetenceCore** Django app and helps manage student development charts.

1. The installation steps for this plugin are similar to the PomoloBee plugin. Once it's uploaded, activated, and configured, it will interface with the Django API for managing students and their competencies.

### **WordPress Configuration Script (wp-init.sh)**:

During the initial WordPress setup (creating the WordPress admin user), the script `wp-init.sh` handles the following:

1. **Permissions**: Ensures proper permissions for bind-mounted directories, ensuring that WordPress can read/write files correctly.
2. **Activate Theme**: Sets the **PomoloBee theme** as the active theme for the WordPress site.
3. **Update Permalinks**: Updates WordPress permalinks for correct URL routing.
4. **Apply Logo**: Sets the WordPress logo for the site using the provided image (`logo.png` or `logo.svg`).

 

### **Running WordPress Admin**:

Once everything is set up, you can log in to the WordPress admin interface at:

```text
http://localhost:9082/wp-admin
```

From here, you can configure your WordPress site further, manage posts, users, and settings.

---

### **Additional Configuration Considerations**:

1. **Media Files**:
   WordPress media files are shared with the **Django app** via the `./django/media` directory, and the media is served by Apache inside the WordPress container.

   * WordPress media will be available at:
     `http://localhost:9082/media/`

   * Django media will be available at:
     `http://localhost:9082/wp-content/uploads/`

   Ensure that the media permissions are set correctly in the **`wp-init.sh`** script to avoid access issues.

2. **Static Files**:
   Static files (CSS, JS) from Django are also served by WordPress and are mounted to the `/var/www/html/static` directory:

   * Accessible via:
     `http://localhost:9082/static/`

### **WordPress Rebuilds and Data Loss**:

Since WordPress files (including themes and plugins) are bind-mounted from the host, they **will not be lost** during container rebuilds. However, the **WordPress database** (stored in MariaDB via `wp_db_data`) could be affected if the volume is removed. To prevent data loss:

* Make sure `wp_db_data` and `wp_data` volumes are not removed or recreated unless necessary.

### **Useful Commands**:

* **Access WordPress CLI (wp-cli)**:
  If you need to interact with WordPress via CLI, you can use the `wpcli` container:

  ```bash
  docker-compose exec wpcli bash
  ```

* **WordPress Health Check**:
  Check if your WordPress container is up and running:

  ```bash
  curl -s http://localhost:9082
  ```

---

### **Conclusion**:

The WordPress configuration in BeeLab ensures persistence of your themes, plugins, and media between container rebuilds via bind mounts and named volumes. By following the steps outlined here, you'll have a consistent and reusable WordPress setup that integrates seamlessly with your Django backend, providing a complete multiservice environment for your development needs.
