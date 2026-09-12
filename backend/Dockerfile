# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app

# Copy only manifests first so npm ci is cached unless dependencies change.
# npm workspaces hoist all deps to the root lockfile, so backend/ alone
# cannot be installed in isolation (see .github/workflows/ci.yml).
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci

COPY backend backend
RUN npm --workspace backend run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/backend/dist backend/dist

EXPOSE 5000
CMD ["node", "backend/dist/server.js"]
