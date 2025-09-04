### **Rebuilding WordPress Plugins in BeeLab**

In BeeLab, the source code for the plugins is located in `wordpress/plugin-src/<plugin-name>`. The plugins are built using **Next.js** and **React**, so you'll need to run **npm** commands to install dependencies and build the project after any code modifications. Here’s a step-by-step guide on how to rebuild and install the plugins.

### **Steps to Rebuild and Install Plugins**

#### 1. **Install Dependencies for the First Time**

Each plugin (either **PomoloBee** or **Competence**) has its own `package.json` file. Before you can build the plugins, you need to **install the dependencies**:

* Navigate to the plugin directory:

  ```bash
  cd wordpress/plugin-src/<plugin-name>
  ```

* Run `npm install` to install the necessary dependencies:

  ```bash
  npm install
  ```

#### 2. **Build the Plugin**

After making code modifications (for example, updating React components or styles), you will need to **build** the plugin so that it can be packaged as a **ZIP** file for installation.

* Run the build command:

  ```bash
  npm run build
  ```

This will **build** the plugin and prepare the necessary distribution files, which will be stored in the `dist` folder.

#### 3. **Create the ZIP File**

After building the plugin, the next step is to **create the ZIP file** that will be used to install the plugin in WordPress.

* Use the `build_zip.sh` script, which packages the built plugin into a ZIP file:

  ```bash
  ./build_zip.sh
  ```

This will generate a `.zip` file of the plugin inside the `dist` directory, ready for installation.

#### 4. **Install the Plugin in WordPress**

You can **install** it into your WordPress environment.

* Use the `install_plugin.sh` script to install the plugin. This script will automatically upload the ZIP and install it in the WordPress container:

  ```bash
  ./install_plugin.sh
  ```

This will:
 
* Replace the existing plugin with the newly built one on the server side.
* Ensure that the plugin is ready to be activated in the WordPress admin interface.

#### 5. **Activate the Plugin**

Once the plugin is installed, you can go to the WordPress Admin panel to **activate the plugin**:

* **Go to**: [http://localhost:9082/wp-admin/plugins.php](http://localhost:9082/wp-admin/plugins.php)
* Find the **PomoloBee** or **Competence** plugin and **activate** it.

---

### **Commands for Building and Installing Plugins**

Here is a quick reference for the commands you need to run for both plugins:

1. **Navigate to the plugin directory**:

   ```bash
   cd wordpress/plugin-src/<plugin-name>
   ```

2. **Install dependencies (first time)**:

   ```bash
   npm install
   ```

3. **Build the plugin after code modification**:

   ```bash
   npm run build
   ```

4. **Create the ZIP file** (optional):

   ```bash
   ./build_zip.sh
   ```

5. **Install the plugin into WordPress**:

   ```bash
   ./install_plugin.sh
   ```

---

### **WordPress Plugin Workflow Summary**

* **Install dependencies** once via `npm install`.
* **Build** the plugin after code changes using `npm run build`.
* **Generate a ZIP** using `build_zip.sh`.
* **Install the plugin** via `install_plugin.sh` to upload the ZIP and install it into WordPress.

This process allows you to quickly rebuild and install your plugins, ensuring that changes to the plugin code are reflected in your WordPress environment.
