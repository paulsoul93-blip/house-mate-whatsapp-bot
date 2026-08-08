# Multi-stage Dockerfile for House Mate WhatsApp Bot
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HTTP_HOST=0.0.0.0

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create volume directories
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
