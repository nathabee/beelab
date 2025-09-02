# ./django/Dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev ca-certificates curl && rm -rf /var/lib/apt/lists/*
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
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 --workers=2 --timeout 30 --max-requests 1000 --max-requests-jitter 100"
CMD ["gunicorn","config.wsgi:application"]
