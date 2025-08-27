# ---- Build stage ----
FROM node:18-alpine AS build

WORKDIR /app

# Make sure devDependencies are installed for build
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Install only production deps for slim image
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/env.example ./env.example

EXPOSE 3004
CMD ["npm", "run", "start:prod"]
