# ─────────────────────────────────────────────────────────────────────────────
#  Stage 1 – Build
#  Pass Monday.com config as --build-arg flags.
#  Example:
#    docker build \
#      --build-arg VITE_MONDAY_API_KEY=your_token \
#      --build-arg VITE_VIDEO_BOARD_ID=123456789 \
#      --build-arg VITE_DESIGN_BOARD_ID=987654321 \
#      --build-arg VITE_READ_MODE=false \
#      -t ad-namer .
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached unless package files change)
COPY package*.json ./
RUN npm ci

# Accept all env vars as build args (Vite bakes them in at build time)
ARG VITE_MONDAY_API_KEY=""
ARG VITE_READ_MODE="false"
ARG VITE_VIDEO_BOARD_ID=""
ARG VITE_DESIGN_BOARD_ID=""
ARG VITE_ASSIGNEE_COLUMN_ID="person"
ARG VITE_AD_NAME_COLUMN_ID="ad_name"

# Expose args to the build environment so Vite can read import.meta.env.*
ENV VITE_MONDAY_API_KEY=$VITE_MONDAY_API_KEY
ENV VITE_READ_MODE=$VITE_READ_MODE
ENV VITE_VIDEO_BOARD_ID=$VITE_VIDEO_BOARD_ID
ENV VITE_DESIGN_BOARD_ID=$VITE_DESIGN_BOARD_ID
ENV VITE_ASSIGNEE_COLUMN_ID=$VITE_ASSIGNEE_COLUMN_ID
ENV VITE_AD_NAME_COLUMN_ID=$VITE_AD_NAME_COLUMN_ID

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
#  Stage 2 – Serve
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
