import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import cors from "cors";

import dotenv from "dotenv";
import { primaryServer } from "./src/servers/primary.server.js";
import { ghlServer } from "./src/servers/ghl.server.js";

dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors());

// Store active SSE transports
const transports: { [sessionId: string]: SSEServerTransport } = {};
const ghlTransports: { [sessionId: string]: SSEServerTransport } = {};

// SSE endpoint for establishing connections
app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  // Clean up transport when connection closes
  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await primaryServer.connect(transport);
});

// Endpoint for handling messages
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  const api_token = req.headers["api_token"] as string;
  // if (!api_token) {
  //   res.status(401).send("Unauthorized");
  //   return;
  // }

  if (transport) {
    try {
      // Add API token to request metadata
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error handling message:", error);
      res.status(500).send("Error handling message");
    }
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// GoHighLevel MCP
app.get("/sse-ghl", async (_: Request, res: Response) => {
  const ghlTransport = new SSEServerTransport("/ghl-messages", res);
  ghlTransports[ghlTransport.sessionId] = ghlTransport;

  // Clean up transport when connection closes
  res.on("close", () => {
    delete ghlTransports[ghlTransport.sessionId];
  });

  await ghlServer.connect(ghlTransport);
});

// Endpoint for handling messages
app.post("/ghl-messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = ghlTransports[sessionId];
  const api_token = req.headers["api_token"] as string;
  // if (!api_token) {
  //   res.status(401).send("Unauthorized");
  //   return;
  // }

  if (transport) {
    try {
      // Add API token to request metadata
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error handling message:", error);
      res.status(500).send("Error handling message");
    }
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
