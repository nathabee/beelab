📡 Current listening ports
Port	Service / Process	Purpose
22	sshd	SSH remote login
25	postfix (master)	Mail (SMTP)
53	systemd-resolved	Local DNS resolver
80	apache2	Web server (HTTP)
143	dovecot	IMAP (unsecured)
443	apache2	Web server (HTTPS)
587	postfix (master)	Mail submission (SMTP over TLS)
993	dovecot	IMAP (SSL/TLS)
3306	mysqld	MySQL DB (local)
33060	mysqld	MySQL X plugin (local)
9080	gunicorn	Python app (your old Django/Next?)
8891	opendkim	Mail signing (local)
9090	java (jenkins)	Jenkins web interface
3000	next-server	Next.js app (old setup)
🚫 Ports already occupied

80/443 → Apache (don’t use directly for BeeLab unless you remove Apache or put Docker behind reverse proxy)

9080 → gunicorn (old app)

3000 → next-server (old app)

9090 → Jenkins

Mail stack (25, 587, 993, 143, 8891, 3306/33060) — best not to touch


Free for BeeLab

Pretty much any 9xxx range is safe (not in use).
I suggest mapping BeeLab services like this to avoid conflicts:

BeeLab service	Default (in compose)	New mapping (safe)	Access URL
Next.js (web)	9080 → 3000	9080:3000	http://<VPS_IP>:9080
Django (API)	9001 → 8000	9001:8000	http://<VPS_IP>:9001
WordPress	9082 → 80	9082:80	http://<VPS_IP>:9082
🔧 What to do

Edit your compose.yaml (or better: docker-compose.override.yml) to use these ports:

services:
  web:
    ports:
      - "9080:3000"
  django:
    ports:
      - "9001:8000"
  wordpress:
    ports:
      - "9082:80"


Open them in UFW:

sudo ufw allow 9001/tcp
sudo ufw allow 9080/tcp
sudo ufw allow 9082/tcp


Start BeeLab → test with http://<VPS_IP>:9080, etc.

