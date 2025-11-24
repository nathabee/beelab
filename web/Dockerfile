# ./web/Dockerfile

# Base deps (node_modules) — used by dev and build
FROM node:22-alpine AS deps
WORKDIR /app
ENV CI=true
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- dev ----------
FROM deps AS dev
ENV NODE_ENV=development
# TS + types only for dev
RUN npm install -D typescript @types/node @types/react @types/react-dom
# bring source
COPY tsconfig.json ./tsconfig.json
COPY next.config.mjs ./next.config.mjs
COPY app ./app
EXPOSE 3000
# This stage is what your compose’s dev service uses
# (compose provides the command, or you can set it here)
# CMD ["npx","next","dev","-H","0.0.0.0","-p","3000"]

# ---------- build (production build artifacts) ----------
FROM deps AS build
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# copy the full source tree to build
COPY . .
# Build Next.js (generates .next)
RUN npm run build

# ---------- prod runtime ----------
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# install only production dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# copy runtime assets
COPY next.config.mjs ./next.config.mjs
COPY public ./public
COPY --from=build /app/.next ./.next

EXPOSE 3000
CMD ["npx","next","start","-H","0.0.0.0","-p","3000"]
