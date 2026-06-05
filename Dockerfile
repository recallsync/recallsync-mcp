FROM node:20-slim as builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN echo "Building TypeScript files..." && \
    npm run build && \
    echo "Build complete. Contents of dist/src/generated:" && \
    ls -la dist/src/generated/

FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma in production image
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Verify files are copied correctly
RUN echo "Contents of dist directory in final image:" && \
    ls -la dist/ && \
    echo "Contents of dist/src/generated:" && \
    ls -la dist/src/generated/

CMD ["npm", "start"] 