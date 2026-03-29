# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app
COPY . .

# Run as non-root
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs && chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3000
CMD ["node", "index.js"]