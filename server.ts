import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import cors from "cors";
import {
  leadTools,
  handleCreateLead,
  handleFindLead,
} from "./src/tools/lead.js";
import dotenv from "dotenv";

dotenv.config();

const server = new Server(
  {
    name: "recallsync-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
      operations: {
        "list-prompts": {},
        "get-prompt": {},
        "list-resources": {},
        "get-resource": {},
        "list-tools": {},
        "get-tool": {},
        "execute-tool": {},
      },
    },
  }
);

// Register the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [...leadTools],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "create-lead":
      return handleCreateLead(request);
    case "find-lead":
      return handleFindLead(request);

    default:
      throw new Error("Unknown tool");
  }
});

// Keep the existing prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  throw new Error("Unknown prompt");
});

const app = express();

// Enable CORS for all routes
app.use(cors());

// Store active SSE transports
const transports: { [sessionId: string]: SSEServerTransport } = {};

// SSE endpoint for establishing connections
app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  // Clean up transport when connection closes
  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

// Endpoint for handling messages
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  const api_token = req.headers["api_token"] as string;
  if (!api_token) {
    res.status(401).send("Unauthorized");
    return;
  }

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
