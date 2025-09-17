# Security & networking

> Target: configure VPS network to host Docker on a VPS

---

 
## Access

### Port bindings (public access from your VPS IP)

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

### Check for free Ports

**Inbound (Hetzner Cloud Firewall ):**
Use the Hetzner Console  to set allow ports:

* Allow: `22/tcp` (SSH), `80/tcp`, `443/tcp` 

**Outbound:**

Use the Hetzner Console  to set allow ports:
* Allow: `53/udp` (DNS), `53/tcp` (DNS fallback), **`443/tcp` (HTTPS pulls)**, **`80/tcp` (HTTP pulls)**
* Simpler: allow **all outbound**.

**Check ports are free:**

we will use per default the 3 ports (9001|9080|9082), check that theyare available
```bash
sudo ss -tulpn | grep -E ':(9001|9080|9082)' || echo "9001/9080/9082 appear free"
```

### in Hetzner DNS console

create 3 "A records" for each subdomains :
* Django API: `https://beelab-api.nathabee.de`  
* Next.js web: `https://beelab-web.nathabee.de`
* WordPress: `https://beelab-wp.nathabee.de`

A record | beelab-api | nathabee.de 
A record | beelab-web | nathabee.de 
A record | beelab-wp | nathabee.de 

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

 

 
 