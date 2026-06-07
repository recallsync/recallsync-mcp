import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import cors from "cors";
import winston from "winston";
import morgan from "morgan";
import { randomUUID } from "node:crypto";

import dotenv from "dotenv";
import { primaryServer } from "./src/servers/primary.server.js";
import { ghlServer } from "./src/servers/ghl.server.js";
import { calServer } from "./src/servers/cal.server.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

dotenv.config();

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "recallsync-mcp" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

const app = express();

// HTTP request logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

// Enable body parsing
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Store active transports by session ID
// StreamableHTTP transports
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const ghlTransports: { [sessionId: string]: StreamableHTTPServerTransport } =
  {};
const calTransports: { [sessionId: string]: StreamableHTTPServerTransport } =
  {};

// SSE transports (for backward compatibility)
const sseTransports: { [sessionId: string]: SSEServerTransport } = {};
const ghlSSETransports: { [sessionId: string]: SSEServerTransport } = {};
const calSSETransports: { [sessionId: string]: SSEServerTransport } = {};

// Session cleanup function
const cleanupTransport = (
  transportMap: any,
  sessionId: string,
  transportType: string
) => {
  if (transportMap[sessionId]) {
    delete transportMap[sessionId];
    // Only log cleanup if needed for debugging
    // console.log(`🗑️ ${transportType} transport cleaned up:`, sessionId);
  }
};

type McpServerLike = {
  connect: (transport: StreamableHTTPServerTransport) => Promise<void>;
};

/**
 * Create a Streamable HTTP transport and connect it to an MCP server instance.
 * When `recoverStale` is true we mark the transport initialized immediately so
 * Cursor can keep using its existing session id after a dev hot-reload/restart.
 */
async function createStreamableTransport(options: {
  transportMap: Record<string, StreamableHTTPServerTransport>;
  mcpServer: McpServerLike;
  label: string;
  pinnedSessionId?: string;
  recoverStale?: boolean;
}): Promise<StreamableHTTPServerTransport> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: options.pinnedSessionId
      ? () => options.pinnedSessionId!
      : () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      options.transportMap[sessionId] = transport;
      logger.info(`${options.label} MCP session initialized`, { sessionId });
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      delete options.transportMap[transport.sessionId];
      logger.info(`${options.label} MCP transport closed`, {
        sessionId: transport.sessionId,
      });
    }
  };

  await options.mcpServer.connect(transport);

  if (options.pinnedSessionId && options.recoverStale) {
    transport.sessionId = options.pinnedSessionId;
    (transport as unknown as { _initialized: boolean })._initialized = true;
    options.transportMap[options.pinnedSessionId] = transport;
    logger.info(`${options.label} MCP stale session recovered`, {
      sessionId: options.pinnedSessionId,
    });
  }

  return transport;
}

async function resolveStreamableTransport(options: {
  sessionId: string | undefined;
  body: unknown;
  transportMap: Record<string, StreamableHTTPServerTransport>;
  mcpServer: McpServerLike;
  label: string;
}): Promise<StreamableHTTPServerTransport | null> {
  const { sessionId, body, transportMap, mcpServer, label } = options;

  if (sessionId && transportMap[sessionId]) {
    logger.debug(`Reusing existing ${label} transport`, { sessionId });
    return transportMap[sessionId];
  }

  if (isInitializeRequest(body)) {
    logger.info(`Creating new ${label} MCP transport`, { sessionId });
    return createStreamableTransport({
      transportMap,
      mcpServer,
      label,
      pinnedSessionId:
        sessionId && !transportMap[sessionId] ? sessionId : undefined,
    });
  }

  if (sessionId && !transportMap[sessionId]) {
    // Dev hot-reload: the process restarted but Cursor still sends the old
    // mcp-session-id. Re-bind transparently instead of returning 400/404.
    return createStreamableTransport({
      transportMap,
      mcpServer,
      label,
      pinnedSessionId: sessionId,
      recoverStale: true,
    });
  }

  return null;
}

function invalidSessionResponse(res: Response, label: string) {
  logger.warn(`Invalid ${label} MCP request - no valid session ID provided`);
  res.status(400).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Bad Request: No valid session ID provided",
    },
    id: null,
  });
}

// Root Endpoint (status)
app.get("/", (req: Request, res: Response) => {
  const port = process.env.PORT || 3001;
  const nodeEnv = process.env.NODE_ENV || "development";
  res.send(
    `Recallsync MCP Server is running on port ${port} in ${nodeEnv} mode`
  );
});

// =============================================================================
// MODERN STREAMABLE HTTP ENDPOINTS (for VAPI, newer clients)
// =============================================================================

// Primary MCP StreamableHTTP endpoint
app.all("/mcp", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const api_token = req.headers["api_key"] as string;

    const transport = await resolveStreamableTransport({
      sessionId,
      body: req.body,
      transportMap: transports,
      mcpServer: primaryServer,
      label: "Primary",
    });

    if (!transport) {
      invalidSessionResponse(res, "Primary");
      return;
    }

    // Check for API key
    if (!api_token) {
      logger.warn(`Unauthorized primary request - missing API key`, {
        sessionId,
      });
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Missing API key",
        },
        id: null,
      });
      return;
    }

    // Inject API key into tool call arguments (forwarded to the REST API as Bearer token)
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
    }

    // Handle the request
    await transport.handleRequest(req, res, modifiedBody);
  } catch (error) {
    logger.error("Error handling primary MCP request", { error });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// GHL MCP StreamableHTTP endpoint
app.all("/mcp-ghl", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const api_token = req.headers["api_key"] as string;
    const transport = await resolveStreamableTransport({
      sessionId,
      body: req.body,
      transportMap: ghlTransports,
      mcpServer: ghlServer,
      label: "GHL",
    });

    if (!transport) {
      invalidSessionResponse(res, "GHL");
      return;
    }

    // Check for API key
    if (!api_token) {
      logger.warn(`Unauthorized GHL request - missing API key`, { sessionId });
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Missing API key",
        },
        id: null,
      });
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
            _apiKey: api_token,
          },
        },
      };
      logger.info("Injected API key into GHL tool call arguments", {
        sessionId,
        toolName: req.body.params?.name,
        originalArgs: req.body.params?.arguments,
      });
    }

    // Handle the request
    logger.info(`About to handle GHL request`, {
      sessionId,
      method: req.method,
      bodyMethod: req.body?.method,
    });

    await transport.handleRequest(req, res, modifiedBody);

    logger.info(`GHL request handled`, {
      sessionId,
      method: req.method,
      bodyMethod: req.body?.method,
      statusCode: res.statusCode,
      headersSent: res.headersSent,
    });
  } catch (error) {
    logger.error("Error handling GHL MCP request", { error });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// Cal MCP StreamableHTTP endpoint
app.all("/mcp-cal", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const api_key = req.headers["api_key"] as string;

    const isToolCall = req.body && req.body.method === "tools/call";

    let transport = await resolveStreamableTransport({
      sessionId,
      body: req.body,
      transportMap: calTransports,
      mcpServer: calServer,
      label: "Cal",
    });

    if (!transport && isToolCall && Object.keys(calTransports).length > 0) {
      const availableSessionId = Object.keys(calTransports)[0];
      transport = calTransports[availableSessionId];
    }

    if (!transport) {
      invalidSessionResponse(res, "Cal");
      return;
    }

    // Check for API key
    if (!api_key) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Missing API key",
        },
        id: null,
      });
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
            _apiKey: api_key,
          },
        },
      };
    }

    // Handle the request
    await transport.handleRequest(req, res, modifiedBody);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// =============================================================================
// LEGACY SSE ENDPOINTS (for n8n, older clients)
// =============================================================================

// Primary SSE endpoint
app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  sseTransports[transport.sessionId] = transport;

  logger.info(`Primary SSE connection established`, {
    sessionId: transport.sessionId,
  });

  res.on("close", () => {
    delete sseTransports[transport.sessionId];
    logger.info(`Primary SSE connection closed`, {
      sessionId: transport.sessionId,
    });
  });

  await primaryServer.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports[sessionId];

  if (transport) {
    try {
      await transport.handlePostMessage(req, res);
      logger.debug(`Primary SSE message handled successfully`, { sessionId });
    } catch (error) {
      logger.error("Error handling primary SSE message", { error, sessionId });
      res.status(500).send("Error handling message");
    }
  } else {
    logger.warn(`No primary SSE transport found for sessionId: ${sessionId}`);
    res.status(400).send("No transport found for sessionId");
  }
});

// GHL SSE endpoints
app.get("/sse-ghl", async (_: Request, res: Response) => {
  logger.info("GHL SSE connecting");
  const ghlTransport = new SSEServerTransport("/ghl-messages", res);
  ghlSSETransports[ghlTransport.sessionId] = ghlTransport;

  res.on("close", () => {
    delete ghlSSETransports[ghlTransport.sessionId];
    logger.info(`GHL SSE connection closed`, {
      sessionId: ghlTransport.sessionId,
    });
  });

  await ghlServer.connect(ghlTransport);
  logger.info("GHL SSE connected", { sessionId: ghlTransport.sessionId });
});

app.post("/ghl-messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = ghlSSETransports[sessionId];
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
    logger.debug("Injected API key into GHL SSE tool call arguments", {
      sessionId,
    });
  }

  if (!api_token) {
    logger.warn(`Unauthorized GHL SSE request - missing API key`, {
      sessionId,
    });
    res.status(401).send("Unauthorized");
    return;
  }

  if (transport) {
    try {
      await transport.handlePostMessage(req, res, modifiedBody);
      logger.debug(`GHL SSE message handled successfully`, { sessionId });
    } catch (error) {
      logger.error("Error handling GHL SSE message", { error, sessionId });
      res.status(500).send("Error handling message");
    }
  } else {
    logger.warn(`No GHL SSE transport found for sessionId: ${sessionId}`);
    res.status(400).send("No transport found for sessionId");
  }
});

// Cal SSE endpoints
app.get("/sse-cal", async (_: Request, res: Response) => {
  const calTransport = new SSEServerTransport("/cal-messages", res);
  calSSETransports[calTransport.sessionId] = calTransport;

  logger.info("Cal SSE connection established", {
    sessionId: calTransport.sessionId,
  });

  res.on("close", () => {
    delete calSSETransports[calTransport.sessionId];
    logger.info(`Cal SSE connection closed`, {
      sessionId: calTransport.sessionId,
    });
  });

  await calServer.connect(calTransport);
});

app.post("/cal-messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = calSSETransports[sessionId];
  const api_key = req.headers["api_key"] as string;

  if (!api_key) {
    logger.warn(`Unauthorized Cal SSE request - missing API key`, {
      sessionId,
    });
    res.status(401).send("Unauthorized");
    return;
  }

  let modifiedBody = req.body;
  if (req.body && req.body.method === "tools/call" && req.body.params) {
    modifiedBody = {
      ...req.body,
      params: {
        ...req.body.params,
        arguments: {
          ...req.body.params.arguments,
          _apiKey: api_key,
        },
      },
    };
    logger.debug("Injected API key into Cal SSE tool call arguments", {
      sessionId,
    });
  }

  if (transport) {
    try {
      await transport.handlePostMessage(req, res, modifiedBody);
      logger.debug(`Cal SSE message handled successfully`, { sessionId });
    } catch (error) {
      logger.error("Error handling Cal SSE message", { error, sessionId });
      res.status(500).send("Error handling message");
    }
  } else {
    logger.warn(`No Cal SSE transport found for sessionId: ${sessionId}`);
    res.status(400).send("No transport found for sessionId");
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
console.log("🚀 Starting server...");
console.log("📊 Environment:", process.env.NODE_ENV);
console.log("🔗 Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  logger.info(`Server running on port ${PORT}`);
  logger.info(`=== MODERN ENDPOINTS (StreamableHTTP) ===`);
  logger.info(`Primary MCP endpoint: http://localhost:${PORT}/mcp`);
  logger.info(`GHL MCP endpoint: http://localhost:${PORT}/mcp-ghl`);
  logger.info(`Cal MCP endpoint: http://localhost:${PORT}/mcp-cal`);
  logger.info(`=== LEGACY ENDPOINTS (SSE) ===`);
  logger.info(`Primary SSE endpoint: http://localhost:${PORT}/sse`);
  logger.info(`GHL SSE endpoint: http://localhost:${PORT}/sse-ghl`);
  logger.info(`Cal SSE endpoint: http://localhost:${PORT}/sse-cal`);
});
