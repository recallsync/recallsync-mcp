import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import cors from "cors";

import dotenv from "dotenv";
import { primaryServer } from "./src/servers/primary.server.js";
import { ghlServer } from "./src/servers/ghl.server.js";
import { PrismaClient } from "@prisma/client";
import { calServer } from "./src/servers/cal.server.js";

dotenv.config();

const app = express();

// Enable body parsing
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Store active SSE transports
const transports: { [sessionId: string]: SSEServerTransport } = {};
const ghlTransports: { [sessionId: string]: SSEServerTransport } = {};
const prisma = new PrismaClient();
const calTransports: { [sessionId: string]: SSEServerTransport } = {};

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
  const api_token = req.headers["api_key"] as string;
  let modifiedBody = req.body;
  if (req.body && req.body.method === "tools/call" && req.body.params) {
    modifiedBody = {
      ...req.body,
      params: {
        ...req.body.params,
        arguments: {
          ...req.body.params.arguments,
          _apiKey: api_token,
        },
      },
    };
    console.log("✅ Injected API key into tool call arguments");
  }
  if (!api_token) {
    res.status(401).send("Unauthorized");
    return;
  }

  if (transport) {
    try {
      await transport.handlePostMessage(req, res, modifiedBody);
    } catch (error) {
      res.status(500).send("Error handling message");
    }
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.get("/sse-cal", async (_: Request, res: Response) => {
  const calTransport = new SSEServerTransport("/cal-messages", res);
  calTransports[calTransport.sessionId] = calTransport;

  // Clean up transport when connection closes
  res.on("close", () => {
    delete calTransports[calTransport.sessionId];
  });

  await calServer.connect(calTransport);
});

app.post("/cal-messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = calTransports[sessionId];
  const api_key = req.headers["api_key"] as string;
  if (!api_key) {
    res.status(401).send("Unauthorized");
    return;
  }

  // Inject API key into tool call arguments
  let modifiedBody = req.body;
  if (req.body && req.body.method === "tools/call" && req.body.params) {
    modifiedBody = {
      ...req.body,
      params: {
        ...req.body.params,
        arguments: {
          ...req.body.params.arguments,
          _apiKey: api_key, // Add API key to arguments
        },
      },
    };
    console.log("✅ Injected API key into tool call arguments");
  }

  if (transport) {
    try {
      await transport.handlePostMessage(req, res, modifiedBody);
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
