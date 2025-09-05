# ./django/Dockerfile
FROM python:3.12-slim-bookworm AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN set -eux; \
    # Switch to HTTPS no matter which format is present
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

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
COPY . .

# dev
FROM base AS dev
EXPOSE 8000
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 --workers=2 --reload"
CMD ["gunicorn","config.wsgi:application"]

# prod
FROM base AS prod
EXPOSE 8000
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 --workers=2 --timeout=30 --max-requests=1000 --max-requests-jitter=100"
CMD ["gunicorn","config.wsgi:application"]
