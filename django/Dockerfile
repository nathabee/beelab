# ./django/Dockerfile
FROM python:3.12-slim-bookworm AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN set -eux; \
    # Force HTTPS apt sources
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i 's|URIs: http://|URIs: https://|g' /etc/apt/sources.list.d/debian.sources; \
    else \
      . /etc/os-release; coden=${VERSION_CODENAME:-bookworm}; \
      printf 'deb https://deb.debian.org/debian %s main\n' "$coden" > /etc/apt/sources.list; \
      printf 'deb https://security.debian.org/debian-security %s-security main\n' "$coden" >> /etc/apt/sources.list; \
      printf 'deb https://deb.debian.org/debian %s-updates main\n' "$coden" >> /etc/apt/sources.list; \
    fi; \
    echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4; \
    apt-get update -o Acquire::Retries=5; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential libpq-dev ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*

# BeeFont system deps (headless)
# BeeFont system deps
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      fontforge \
      potrace \
      imagemagick \
      postgresql-client \
    ; \
    rm -rf /var/lib/apt/lists/*


    
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# copy app code
COPY . .

# ---------- dev ----------
# dev image: NO test deps here
FROM base AS dev
EXPOSE 8000
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 --workers=2  --timeout 300 --reload"
CMD ["gunicorn","config.wsgi:application"]
 


# ---------- test ----------
# test image: includes pytest stack
FROM base AS test
COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt
EXPOSE 8000
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 --workers=2 --reload"
CMD ["gunicorn","config.wsgi:application"]

# ---------- prod ----------
FROM base AS prod
EXPOSE 8000
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 --workers=2 --timeout=30 --max-requests=1000 --max-requests-jitter=100"
CMD ["gunicorn","config.wsgi:application"]