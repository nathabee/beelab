# BeeLab on Hetzner VPS — Docker Prerequisites & Manual Install

> Target: bring up the **BeeLab** stack (Django + Next.js + WordPress + DBs) on a fresh Hetzner VPS using Docker. This is a **manual** install.

> We just have tested on Hetzner, put any other hosting is possible. if you want to install in a local LAN, keep dev mod.
> if you want to rerun the install again go direct to paragraph "4) Get BeeLab code & prepare"

---

## Assumptions

* VPS: Ubuntu 22.04/24.04 x86\_64 on Hetzner (root or sudo access).
* DNS required  (subdomains)
* You’ll log in as a non‑root sudo user  
* You will replace the reference to domain "nathabee.de" into your own domainname.

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

DNS and Apache configuration is detailed in a separate doc: 
<div class="doc-list">
<li><a href="installation-vps-dns.md">☁️ Installation on a VPS : DNS and Apache</a></li>
</div>

---
## 4) Get BeeLab code & prepare

### retrieve the git
```bash
# Choose a working directory

# Clone (SSH requires your GitHub key; HTTPS is fine too)
git clone https://github.com/nathabee/beelab.git
cd beelab

# Env + runtime folders for prod or dev
cp .env.prod.example .env.prod
# or
cp .env.dev.example .env.dev

mkdir -p django/{media,staticfiles} web/public

# in dev for Testing purpose
##########################
# if you wish to use pytest (actually associated to dev in compose.yaml and django Dockerfile)
mkdir -p django/media/test-coverage django/media/test-reports django/media/test-artifacts
# to make django app unit test 
mkdir -p django/media/test-coverage/user django/media/test-coverage/pomolobee django/media/test-coverage/competence
 
openssl rand -base64 48 | tr -d '\n'
```

> Tip: set a strong Django `SECRET_KEY` in `.env.prod` or `.env.dev` (e.g. output of `openssl rand -base64 48 | tr -d '\n'`).

change all other necessary env variable


### add helpers

```bash
# edit your user profile bashrc
nano ~/.bashrc
```

 add these linesafter changing ~/coding/project/docker/beelab/ with the correct path to the retrieved git repository:


```bash
# beelab project
alias cdbeelab='cd ~/beelab/'
# on dev
# alias beelab-dev='source ~/beelab/scripts/alias.sh dev'
# on prod
alias beelab-prod='source ~/beelab/scripts/alias.sh prod'
```

Run 'beelab-prod' each time you open a new editor call, in order to access command line helpers:

```bash
cdbeelab
beelab-prod 
``` 

 
```txt
New aliases are activated :

###### DOCKER ALIAS ##########
dcup                # start current env stack
dcbuild             # build
dcdown              # stop stack (remove orphans)
dcstop SERVICE      # stop one service
dcps                # ps
dclogs [SERVICE]    # follow logs (or use the service-specific ones below)
dcexec SERVICE CMD  # exec inside a service

###### DJANGO ##########
dcdjango CMD...     # run manage.py, shell, etc.
dcdjlogs            # follow django logs
dcdjup / dcdjdown   # start/stop django only
dcdjpwd USER [NEW]  # change password (interactive if NEW omitted)

###### WORDPRESS ######
dcwplogs | dcwplog  # follow wordpress logs
dcwpup / dcwpdown   # start/stop wordpress only
dcwp ARGS...           # run wp-cli (e.g. dcwp plugin list)
dcwpcachflush          # flush wp cache (object + /wp-content/cache)
dcwpcliup / dcwpclidown# start/stop wpcli sidecar (optional)
dcwpfixroutes


###### WEB (Next.js) ##
dcweblogs           # follow web logs
dcwebup / dcwebdown # start/stop web only

###### MISC ##########
blenv dev|prod      # switch env in this shell

### and lots of other aliases...
``` 

---

## 5) First run — installer script

 
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

# change api for plugin

open wordpress   : `https://beelab-wp.nathabee.de/wp-admin`

choose Pomolobee Settings and Competence Settings (settings of activated plugin) and check that it is pointing to the correct django backend: 
in prod
https://beelab-api.nathabee.de/api


in dev
http://localhost:9001/api


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




## 6)  **Service URLs (from your laptop browser):**

call the subdomains associated to your 
in this example :

* WordPress: [https://beelab-wp.nathabee.de](https://beelab-wp.nathabee.de)
* WordPress admin: [https://beelab-wp.nathabee.de/wp-admin](https://beelab-wp.nathabee.de/wp-admin)
* Django API: [https://beelab-api.nathabee.de/api] (https://beelab-api.nathabee.de/api)
* Django Admin: [https://beelab-api.nathabee.de/admin](https://beelab-api.nathabee.de/admin)
* Django API health : [https://beelab-api.nathabee.de/health] (https://beelab-api.nathabee.de/health)
* Swagger UI: [https://beelab-api.nathabee.de/api/docs/](https://beelab-api.nathabee.de/api/docs/)
* Download OpenAPI schema: [https://beelab-api.nathabee.de/api/schema/](https://beelab-api.nathabee.de/api/schema/)
* Next.js web: [https://beelab-web.nathabee.de](https://beelab-web.nathabee.de)

 
> Replace `nathabee.de` with your own domain name pointing to the VPS IP.

---

## 7) WordPress + plugins

* Admin: `https://beelab-wp.nathabee.de/wp-admin` — log in with the admin you created during setup.
* Activate desired plugins: **Competence WP**, **PomoloBee WP**.

* in the plugins settings: on a VPS change the API address from localhost to your VPS (in prod) to `https://beelab-api.nathabee.de/api`
 

Update Django passwords used by the plugins (examples):
use the helper installed in 4)

```bash

beelab-prod
# in dev : beelab-dev 
dcdjpwd pomofarmer myNewPassword
dcdjpwd nathaprof myNewPassword

```

Test plugins on the WP site menu at `https://beelab-wp.nathabee.de/`.

---

## 8) Django admin

`https://beelab-api.nathabee.de/admin` — log in with the Django superuser you created.

 
---

## 9) Useful ops commands

```bash
# in dev :
beelab-dev
# in prod :
beelab-prod
dchelp


###### DOCKER ALIAS ##########
dcup                # start current env stack
dcdown              # stop stack (remove orphans)
dcstop SERVICE      # stop one service
dcps                # ps
dclogs [SERVICE]    # follow logs (or use the service-specific ones below)
dcexec SERVICE CMD  # exec inside a service

###### DJANGO ##########
dcdjango CMD...     # run manage.py, shell, etc.
dcdjlogs            # follow django logs
dcdjup / dcdjdown   # start/stop django only
dcdjpwd USER [NEW]  # change password (interactive if NEW omitted)

###### WORDPRESS ######
dcwplogs | dcwplog  # follow wordpress logs
dcwpup / dcwpdown   # start/stop wordpress only

###### WEB (Next.js) ##
dcweblogs           # follow web logs
dcwebup / dcwebdown # start/stop web only

###### MISC ##########
blenv dev|prod      # switch env in this shell

 
```

---

## 10) Troubleshooting

**Port already in use**

* Find the process: `sudo lsof -i :9082` (change port) and stop it or change the mapping in `compose.yaml`.

**Docker permission denied**

* Run `groups` — ensure your user is in `docker`. Relogin/reboot after `usermod -aG docker $USER`.

**Slow builds / low RAM**

* Add swap (see §1), or build on a bigger Hetzner flavor.

**WordPress file permissions**

```bash
# If WP files become owned by www-data, restore your user access
sudo setfacl -R -m u:"$USER":rwx wordpress
sudo setfacl -R -d -m u:"$USER":rwx wordpress
```

---
 