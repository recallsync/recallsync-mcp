import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  appointmentTools,
  handleBookAppointment,
  handleCancelAppointment,
  handleCheckAvailability,
  handleGetAppointments,
  handleRescheduleAppointment,
} from "../tools/CAL/appointment.tools.js";
import { executeToolWithTimeout } from "../utils/tool-timeout.util.js";

export const calServer = new Server(
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
calServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [...appointmentTools],
  };
});

// Handle tool execution
calServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  try {
    switch (name) {
      case "check_availability":
        console.log("check_availability", { request });
        return await executeToolWithTimeout(
          () => handleCheckAvailability(request),
          name,
          { retries: 2 }
        );
      case "get_appointments":
        return await executeToolWithTimeout(
          () => handleGetAppointments(request),
          name,
          { retries: 2 }
        );
      case "book_appointment":
        return await executeToolWithTimeout(
          () => handleBookAppointment(request),
          name
        );
      case "reschedule_appointment":
        return await executeToolWithTimeout(
          () => handleRescheduleAppointment(request),
          name
        );
      case "cancel_appointment":
        return await executeToolWithTimeout(
          () => handleCancelAppointment(request),
          name
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      content: [{ type: "text", text: `Tool execution failed: ${message}` }],
    };
  }
});

// Keep the existing prompt handlers
calServer.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

calServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
  throw new Error("Unknown prompt");
});
