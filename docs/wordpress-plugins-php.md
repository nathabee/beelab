### **Role of PHP in the WordPress Plugin (Competence WP)**

In your **WordPress plugin (Competence WP)**, PHP serves several critical roles, including:

1. **Plugin Registration and Setup**:

   * The plugin is registered with WordPress through the `plugin-name.php` file, which is essential for defining the plugin's name, version, and description, among other metadata. It also registers necessary hooks to make the plugin functional.

2. **Creating Pages (Post Types)**:

   * During the plugin’s **activation**, it registers several **pages** in WordPress (such as Login, Home, Dashboard, and others). These pages contain **blocks** that render frontend React components.

   ```php
   register_activation_hook(__FILE__, 'competence_wp_create_pages');
   function competence_wp_create_pages() {
       // Create pages with slugs and content defined in the `$pages` array
   }
   ```

   Each page is assigned a WordPress **slug**, a **title**, and a **block** that refers to the React-based component to be displayed.

3. **Enqueue Styles and Scripts**:

   * The plugin uses WordPress's `wp_enqueue_style` and `wp_enqueue_script` functions to load external resources such as CSS for styling and JavaScript for running the React components.

   ```php
   add_action('wp_enqueue_scripts', function () {
       wp_enqueue_style(
           'competence-bootstrap',
           'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
       );
   });
   ```

4. **Admin Settings Page**:

   * The PHP code defines an admin settings page where WordPress admins can set the **API URL** that connects to Django (for fetching student data, etc.). This is created under the **"Settings"** menu in the WordPress admin interface.

   ```php
   add_action('admin_menu', 'competence_register_settings_page');
   ```

5. **Integration with React**:

   * The PHP functions register and enqueue the React application (`view.js`) into the WordPress frontend. The API URL is passed into the frontend JavaScript code using **`wp_localize_script`**, making the API URL configurable directly through the WordPress admin settings.

   ```php
   wp_localize_script($handle, 'competenceSettings', [
       'apiUrl' => $api_url,
       'basename' => parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
   ]);
   ```

