# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app

# Copy only manifests first so npm ci is cached unless dependencies change.
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY frontend frontend

# Vite inlines VITE_* vars at build time, so they must arrive as build args.
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm --workspace frontend run build

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
