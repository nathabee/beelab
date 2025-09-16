# BeeLab on Hetzner VPS — Docker Prerequisites & Manual Install

> Target: bring up the **BeeLab** stack (Django + Next.js + WordPress + DBs) on a fresh Hetzner VPS using Docker. This is a **manual** install you can run end‑to‑end. Later we can automate with Jenkins/Git.

---

## Assumptions

* VPS: Ubuntu 22.04/24.04 x86\_64 on Hetzner (root or sudo access).
* DNS not required (you can use the server IP + ports). We’ll open only the ports we need.
* You’ll log in as a non‑root sudo user (recommended) or `root`.

> If your OS is not Ubuntu/Debian, call it out and we’ll adapt the commands.

---

## 1) System prep

```bash
# Update system
sudo apt-get update --allow-releaseinfo-change
sudo apt-get upgrade -y


# Useful base tools
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw

# Optional: create a non-root user (skip if you already have one)
sudo adduser beelab
sudo usermod -aG sudo beelab
# Re-login as that user (or use 'su - beelab')
```
 

---

## 2) Install Docker Engine + Compose (official repo)

```bash
# Remove any old Docker bits
sudo apt-get remove -y docker docker-engine docker.io containerd runc || true

# Add Docker’s GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable + start, add your user to the docker group (logout/login after)
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Verify:

```bash
docker --version

docker compose version
systemctl status docker --no-pager     
# should be active (running)

groups                               
  # should include: docker

```

> If `docker` requires sudo, log out/in (or reboot) so the group change applies.

---
### 3) Security & networking

**Inbound (Hetzner Cloud Firewall ):**
Use the Hetzner Console  to set allow ports:

* Allow: `22/tcp` (SSH), `80/tcp`, `443/tcp` 

**Outbound:**

Use the Hetzner Console  to set allow ports:
* Allow: `53/udp` (DNS), `53/tcp` (DNS fallback), **`443/tcp` (HTTPS pulls)**, **`80/tcp` (HTTP pulls)**
* Simpler: allow **all outbound**.

**Check ports are free:**

```bash
sudo ss -tulpn | grep -E ':(9001|9080|9082)' || echo "9001/9080/9082 appear free"
```


---

## Fill in your “install certbot” section like this

### Certbot (webroot on host Apache)

1. Install Certbot (Ubuntu 22.04/24.04):

```bash
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

2. Create ACME webroot and the HTTP vhost:

```bash
sudo mkdir -p /var/www/certbot/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/certbot
```

`/etc/apache2/sites-available/00-acme-redirects.conf`

```apache
<VirtualHost *:80>
    ServerName nathabee.de
    ServerAlias beelab-wp.nathabee.de beelab-api.nathabee.de beelab-web.nathabee.de

    Alias /.well-known/acme-challenge/ /var/www/certbot/.well-known/acme-challenge/
    <Directory "/var/www/certbot/.well-known/acme-challenge/">
        Options None
        AllowOverride None
        Require all granted
    </Directory>

    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>
```

Enable modules & the HTTP site, then reload:

```bash
sudo a2enmod ssl headers proxy proxy_http proxy_wstunnel rewrite
sudo a2ensite 00-acme-redirects.conf
sudo apachectl configtest
sudo systemctl reload apache2
```

3. Issue certs (one cert per hostname):

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d beelab-api.nathabee.de -m admin@nathabee.de --agree-tos --no-eff-email
sudo certbot certonly --webroot -w /var/www/certbot -d beelab-web.nathabee.de -m admin@nathabee.de --agree-tos --no-eff-email
sudo certbot certonly --webroot -w /var/www/certbot -d beelab-wp.nathabee.de  -m admin@nathabee.de --agree-tos --no-eff-email
# (Optional apex)
# sudo certbot certonly --webroot -w /var/www/certbot -d nathabee.de -m admin@nathabee.de --agree-tos --no-eff-email
```

4. Auto-reload Apache after renew:

```bash
sudo install -d /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh >/dev/null <<'SH'
#!/usr/bin/env bash
systemctl reload apache2
SH
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
```

Certbot’s systemd timers handle the periodic `renew` automatically.

---

## Apache vhosts  
 

**New Files to create:**

```
/etc/apache2/sites-available/
  beelab-api-ssl.conf
  beelab-web-ssl.conf
  beelab-wp-ssl.conf
  00-acme-redirects.conf    # already created above
 
```
  
in this example we will use apache2 to make the 4 files :
cd /etc/apache2/sites-available
    sudo touch beelab-api-ssl.conf 
    sudo touch beelab-wp-ssl.conf
    sudo touch beelab-web-ssl.conf
    sudo touch beelab-api-ssl.conf 


please make the next example extentable not to have too much info
fill the files with the contentsimilar to :
  
::::::::::::::
beelab-api-ssl.conf
::::::::::::::
<VirtualHost *:443>
    ServerName beelab-api.nathabee.de

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/beelab-api.nathabee.de/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/beelab-api.nathabee.de/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port  "443"

    ProxyPass        / http://127.0.0.1:9001/
    ProxyPassReverse / http://127.0.0.1:9001/

    ErrorLog  ${APACHE_LOG_DIR}/beelab-api-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/beelab-api-ssl-access.log combined
</VirtualHost>
::::::::::::::
beelab-web-ssl.conf
::::::::::::::
<VirtualHost *:443>
    ServerName beelab-web.nathabee.de

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/beelab-web.nathabee.de/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/beelab-web.nathabee.de/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port  "443"

    # WS upgrade
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://127.0.0.1:9080/$1 [P,L]

    ProxyPass        / http://127.0.0.1:9080/
    ProxyPassReverse / http://127.0.0.1:9080/

    ErrorLog  ${APACHE_LOG_DIR}/beelab-web-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/beelab-web-ssl-access.log combined
</VirtualHost>
::::::::::::::
beelab-wp-ssl.conf
::::::::::::::
<VirtualHost *:443>
    ServerName beelab-wp.nathabee.de

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/beelab-wp.nathabee.de/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/beelab-wp.nathabee.de/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port  "443"

    ProxyPass        / http://127.0.0.1:9082/ connectiontimeout=5 timeout=60
    ProxyPassReverse / http://127.0.0.1:9082/

    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"

    ErrorLog  ${APACHE_LOG_DIR}/beelab-wp-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/beelab-wp-ssl-access.log combined
</VirtualHost>
::::::::::::::
  00-acme-redirects.conf


<VirtualHost *:80>
    ServerName nathabee.de
    ServerAlias beelab-wp.nathabee.de beelab-api.nathabee.de beelab-web.nathabee.de

    # ACME webroot for all names
    Alias /.well-known/acme-challenge/ /var/www/certbot/.well-known/acme-challenge/
    <Directory "/var/www/certbot/.well-known/acme-challenge/">
        Options None
        AllowOverride None
        Require all granted
    </Directory>

    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
    ErrorLog  ${APACHE_LOG_DIR}/http-error.log
    CustomLog ${APACHE_LOG_DIR}/http-access.log combined
</VirtualHost>

activate the conf
   a2ensite 00-acme-redirects.conf 
   a2ensite beelab-wp-ssl.conf
   a2ensite beelab-api-ssl.conf
   a2ensite beelab-web-ssl.conf

check the configuration and load it:
sudo apachectl configtest
sudo systemctl reload apache2


## 4) Get BeeLab code & prepare

```bash
# Choose a working directory
# mkdir -p ~/apps && cd ~/apps

# Clone (SSH requires your GitHub key; HTTPS is fine too)
git clone https://github.com/nathabee/beelab.git
cd beelab

# Env + runtime folders for prod or dev
cp .env.prod.example .env.prod
# or
cp .env.dev.example .env.dev
mkdir -p django/{media,staticfiles} wweb/public

openssl rand -base64 48 | tr -d '\n'
```

> Tip: set a strong Django `SECRET_KEY` in `.env.prod` or `.env.dev` (e.g. output of `openssl rand -base64 48 | tr -d '\n'`).

change all other necessary env variable
---

## 5) Port bindings (public access from your VPS IP)

BeeLab defaults map services to host ports **9080 / 9001 / 9082**. On Linux, Compose publishes on **all interfaces** by default (0.0.0.0).  

Example inside `compose.yaml` (edit only if you see `127.0.0.1`):

```yaml
services:
  web:
    ports:
      - "127.0.0.1:9080:3000" 
  django:
    ports:
      - "127.0.0.1:9001:8000"
  wordpress:
    ports:
      - "127.0.0.1:9082:80"
```

> After edits, save the file.




---

## 6) First run — installer script

```bash
# Make the helper executable
chmod +x scripts/total-reset.sh <dev/dev>

# Run the full rebuild/installer (interactive)
./scripts/total-reset.sh prod
```

When prompted:

* Confirm the reset (it removes old BeeLab containers/volumes if any).
* Create the **Django superuser**.
* After containers are up: open WordPress in a browser and finish its initial setup.




### IN CASE OF CONNECTION ERROR BY INSTALL : Tell Docker which DNS to use (daemon-wide)

if this error comes:
```bash
37.57   Unable to connect to deb.debian.org:http:
37.57 Err:1 http://deb.debian.org/debian trixie InRelease
37.57   Could not connect to debian.map.fastlydns.net:80 (146.75.122.132), connection timed out Unable to connect to deb.debian.org:http:
```

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "dns": ["1.1.1.1", "8.8.8.8"]
}
JSON

sudo systemctl restart docker
```

Sanity test from a throwaway container:

```bash
docker run --rm alpine sh -c "wget -qO- http://deb.debian.org/ | head -n1" \
  || echo "still cannot reach deb.debian.org"
```

If you see HTML, DNS is good.

---



### TEST : **Service URLs (from your laptop browser):**

call the subdomains associated to your 
in this example :

* Django API: `https://beelab-api.nathabee.de`  (health: `/health`)
* Next.js web: `https://beelab-web.nathabee.de`
* WordPress: `https://beelab-wp.nathabee.de`

 
> Replace `nathabee.de` with your Hetzner server’s public IP.

---

## 7) WordPress + plugins

* Admin: `https://beelab-wp.nathabee.de/wp-admin` — log in with the admin you created during setup.
* Activate desired plugins: **Competence WP**, **PomoloBee WP**.

* in the competence settings: change the API adresse from localhost to your VPS: `https://beelab-api.nathabee.de`


Update Django passwords used by the plugins (examples):

```bash
# in dev :
docker compose -p beelab_dev --env-file .env.dev --profile dev exec django python manage.py changepassword pomofarmer
docker compose -p beelab_dev --env-file .env.dev --profile dev exec django python manage.py changepassword nathaprof

# inprod
# Pomolobee plugin user
docker compose -p beelab_prod --env-file .env.prod --profile prod exec django python manage.py changepassword pomofarmer
# Competence plugin user
docker compose -p beelab_prod --env-file .env.prod --profile prod exec django python manage.py changepassword nathaprof
```

Test plugins on the WP site menu at `https://beelab-wp.nathabee.de/`.

---

## 8) Django admin

`https://beelab-api.nathabee.de/admin` — log in with the Django superuser you created.

 
---

## 9) Useful ops commands

```bash
# See what’s running
docker compose ps

# Tail logs for a service
docker compose logs -f django
docker compose logs -f web
docker compose logs -f wordpress

# Stop everything (keeps volumes)
docker compose down

# Rebuild + start in background
docker compose up -d --build

# Health checks
curl -s https://beelab-api.nathabee.de/health
./scripts/health-check.sh
```

---

## 10) Troubleshooting

**Port already in use**

* Find the process: `sudo lsof -i :9082` (change port) and stop it or change the mapping in `compose.yaml`.

**Docker permission denied**

* Run `groups` — ensure your user is in `docker`. Relogin/reboot after `usermod -aG docker $USER`.

**Can’t reach services from the Internet**

* Check UFW/Hetzner Cloud firewall rules for ports 9001/9080/9082.
* If `compose.yaml` had `127.0.0.1:PORT:...`, change to `PORT:...` and `docker compose up -d` again.

**Slow builds / low RAM**

* Add swap (see §1), or build on a bigger Hetzner flavor.

**WordPress file permissions**

```bash
# If WP files become owned by www-data, restore your user access
sudo setfacl -R -m u:"$USER":rwx wordpress
sudo setfacl -R -d -m u:"$USER":rwx wordpress
```

---
 