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

## Usage

The server provides the following prompt:

- `google-get`: Makes a GET request to Google.com and returns the response

## Development

- The server is written in TypeScript
- Uses node-fetch for HTTP requests
- Built with the Model Context Protocol SDK
