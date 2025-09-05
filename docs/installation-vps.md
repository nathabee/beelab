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

## 3) Hetzner firewall / OS firewall

### port check
* 22 (SSH)
* 9080 (Next.js), 9001 (Django API), 9082 (WordPress) — temporary for testing
* Optionally 80/443 if you’ll add a reverse proxy later

check port are free :
sudo ss -tulpn | grep -E ':9001|:9080|:9082' || echo "9001/9080/9082 appear free"
if not use free port, this has an impact on compose.yaml ,  wordpress plugin : php : reference to django api  ( also configurable in wordpress settings)


###  Use **Hetzner Cloud Firewall**  
 
Allow : 
INBOUND TRAFFIC  from any IPv4 and AnyIPv6 to:
* 22 (SSH)
* 9080 (Next.js), 9001 (Django API), 9082 (WordPress) — temporary for testing
* Optionally 80/443 if you’ll add a reverse proxy later
OUTBOUND TRAFFIC:
* 53 (UDP) for docker image retrieve
* 53 (TCP) fallback for docker image retrieve


> You can later close 9001/9080/9082 and put everything behind 80/443 via Nginx/Caddy.

If you do enable the Hetzner firewall, then you’ll also need to add those ports in the Hetzner console (otherwise even if UFW allows, packets never reach the machine).
---

## 4) Get BeeLab code & prepare

```bash
# Choose a working directory
# mkdir -p ~/apps && cd ~/apps

# Clone (SSH requires your GitHub key; HTTPS is fine too)
git clone https://github.com/nathabee/beelab.git
cd beelab

# Env + runtime folders
cp .env.example .env
mkdir -p django/{media,staticfiles}
```

> Tip: set a strong Django `SECRET_KEY` in `.env` (e.g. output of `openssl rand -base64 48 | tr -d '\n'`).

---

## 5) Port bindings (public access from your VPS IP)

BeeLab defaults map services to host ports **9080 / 9001 / 9082**. On Linux, Compose publishes on **all interfaces** by default (0.0.0.0). If the compose file uses loopback bindings like `127.0.0.1:9082:80`, change them to `9082:80` so they’re reachable from outside.

Example inside `compose.yaml` (edit only if you see `127.0.0.1`):

```yaml
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
```

> After edits, save the file.




---

## 6) First run — installer script

```bash
# Make the helper executable
chmod +x scripts/total-reset.sh

# Run the full rebuild/installer (interactive)
./scripts/total-reset.sh
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

* Django API: `http://<VPS_IP>:9001`  (health: `/health`)
* Next.js web: `http://<VPS_IP>:9080`
* WordPress: `http://<VPS_IP>:9082`

> Replace `<VPS_IP>` with your Hetzner server’s public IP.

---

## 7) WordPress + plugins

* Admin: `http://<VPS_IP>:9082/wp-admin` — log in with the admin you created during setup.
* Activate desired plugins: **Competence WP**, **PomoloBee WP**.

Update Django passwords used by the plugins (examples):

```bash
# Pomolobee plugin user
docker compose exec django python manage.py changepassword pomofarmer
# Competence plugin user
docker compose exec django python manage.py changepassword nathaprof
```

Test plugins on the WP site menu at `http://<VPS_IP>:9082/`.

---

## 8) Django admin

`http://<VPS_IP>:9001/admin` — log in with the Django superuser you created.

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
curl -s http://<VPS_IP>:9001/health
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

## 11) (Optional) Put behind a reverse proxy (next step)

Later we can:

* Install Caddy or Nginx, issue free TLS with Let’s Encrypt, and serve everything at
  `https://api.example.com` → Django, `https://app.example.com` → web, `https://wp.example.com` → WP.
* Then **close** 9001/9080/9082 on the firewall and keep only 80/443.

---

## 12) What I need from you to verify

* Your VPS OS version (`lsb_release -a`)
* Whether you’re using Hetzner Cloud Firewall or UFW (or both)
* The public IP you’ll test from (just to confirm reachability, no need to share here)
 