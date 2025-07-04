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
import { PrismaClient } from "@prisma/client";
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

// =============================================================================
// MODERN STREAMABLE HTTP ENDPOINTS (for VAPI, newer clients)
// =============================================================================

// Primary MCP StreamableHTTP endpoint
app.all("/mcp", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
      logger.debug(`Reusing existing primary transport`, { sessionId });
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      logger.info(`Creating new primary MCP transport`);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports[sessionId] = transport;
          logger.info(`Primary MCP session initialized`, { sessionId });
        },
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          logger.info(`Primary MCP transport closed`, {
            sessionId: transport.sessionId,
          });
        }
      };

      // Connect to the MCP server
      await primaryServer.connect(transport);
    } else {
      // Invalid request
      logger.warn(`Invalid primary MCP request - no valid session ID provided`);
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
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
    let transport: StreamableHTTPServerTransport;

    // Add detailed request logging for debugging
    logger.info(`GHL MCP Request Details`, {
      method: req.method,
      url: req.url,
      sessionId,
      hasApiKey: !!api_token,
      bodyMethod: req.body?.method,
      bodyParams: req.body?.params,
      headers: Object.keys(req.headers),
    });

    if (sessionId && ghlTransports[sessionId]) {
      // Reuse existing transport
      transport = ghlTransports[sessionId];
      logger.debug(`Reusing existing GHL transport`, { sessionId });
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      logger.info(`Creating new GHL MCP transport`);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          ghlTransports[sessionId] = transport;
          logger.info(`GHL MCP session initialized`, { sessionId });
        },
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete ghlTransports[transport.sessionId];
          logger.info(`GHL MCP transport closed`, {
            sessionId: transport.sessionId,
          });
        }
      };

      // Connect to the GHL server
      await ghlServer.connect(transport);
    } else {
      // Invalid request
      logger.warn(`Invalid GHL MCP request - no valid session ID provided`);
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
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
    let transport: StreamableHTTPServerTransport;

    if (sessionId && calTransports[sessionId]) {
      // Reuse existing transport
      transport = calTransports[sessionId];
      logger.debug(`Reusing existing Cal transport`, { sessionId });
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      logger.info(`Creating new Cal MCP transport`);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          calTransports[sessionId] = transport;
          logger.info(`Cal MCP session initialized`, { sessionId });
        },
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete calTransports[transport.sessionId];
          logger.info(`Cal MCP transport closed`, {
            sessionId: transport.sessionId,
          });
        }
      };

      // Connect to the Cal server
      await calServer.connect(transport);
    } else {
      // Invalid request
      logger.warn(`Invalid Cal MCP request - no valid session ID provided`);
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Check for API key
    if (!api_key) {
      logger.warn(`Unauthorized Cal request - missing API key`, { sessionId });
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
      logger.debug("Injected API key into Cal tool call arguments", {
        sessionId,
      });
    }

    // Handle the request
    await transport.handleRequest(req, res, modifiedBody);
  } catch (error) {
    logger.error("Error handling Cal MCP request", { error });
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
app.listen(PORT, () => {
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
