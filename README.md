# RecallSync MCP Server

A Model Context Protocol (MCP) server that provides REST API capabilities.

## Features

- GET request capability to Google.com

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the server:

```bash
npm start
```

## Docker Setup

1. Build and run using Docker Compose:

```bash
docker-compose up --build
```

## Development

- The server is written in TypeScript
- Uses node-fetch for HTTP requests
- Built with the Model Context Protocol SDK

# Run MCP locally

1. yarn dev
2. $ npx ngrok http --domain=busy-strongly-mayfly.ngrok-free.app 3008
