# =============================================================================
# MTG Hand Oracle — Multi-stage Docker Build
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf

# Copy SPA-aware config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets
COPY --from=builder /build/dist/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]