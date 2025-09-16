## Data Persistence in Docker for BeeLab


it is possible to rebuild the containers :
beelab-prod (or beelab-dev)
dcbuild
dcup


BeeLab uses **Docker volumes** and **bind mounts** to store data and code between container rebuilds. Here’s a breakdown of **what persists** and **what may be affected** when rebuilding the containers:

### **What Will Persist:**

1. **PostgreSQL Database (`db_data`)**:
   The database files are stored in a **named volume** (`db_data`), so your database will persist across rebuilds.

2. **WordPress Database and Files (`wp_db_data`, `wp_data`)**:
   WordPress's database and content files are stored in **named volumes** (`wp_db_data` for database and `wp_data` for site content). These volumes persist across container rebuilds.

3. **Django and WordPress Media/Static Files (`./django/media`, `./wordpress/wp-content`)**:
   The **media files** in Django (`./django/media`) and **WordPress content** (`./wordpress/wp-content`) are stored **on the host** through **bind mounts**. As a result, these files persist on the host even after rebuilding containers.

4. **Django Application Code (`./django`)**:
   The Django application code is mounted from your **host machine** (`./django`), meaning it remains intact and unchanged even after a container rebuild.

### **What Might Be Affected (Lost):**

1. **Temporary Container State**:
   Data stored **inside the container** (such as temporary files or logs stored outside the mounted directories) will be lost. However, **mounted volumes** and **bind mounts** will persist as expected.

2. **Python Packages (Installed inside the container)**:
   The installed Python dependencies inside the container (from `pip install`) are **not preserved across container rebuilds** unless you run the install command again or use the `requirements.txt` in your build process.

   To reinstall Python dependencies, run:

   ```bash
   docker-compose exec django bash -c "pip install -r /app/requirements.txt"
   ```

3. **WordPress Install State**:
   Any **WordPress settings** or **installed plugins** that were not persisted in the `wp_data` volume (e.g., certain plugin settings stored only in the container) might need to be reconfigured.

### **How to Ensure Data Persistence**:

* **Django**: Ensure that your database (`db_data`), media (`./django/media`), and static files (`./django/staticfiles`) are mounted correctly and stored on your host machine.

* **WordPress**: Ensure that **WordPress content** (`wp_data`) and **wp-config settings** are correctly bound to your host directories for persistence.

---
