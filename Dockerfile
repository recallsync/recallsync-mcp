FROM node:20-slim as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN echo "Building TypeScript files..." && \
    npm run build && \
    echo "Build complete. Contents of dist directory:" && \
    ls -la dist/ && \
    echo "Contents of root directory:" && \
    ls -la

FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Verify files are copied correctly
RUN echo "Contents of dist directory in final image:" && \
    ls -la dist/

CMD ["npm", "start"] 