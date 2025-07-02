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
  switch (request.params.name) {
    case "check_availability":
      return handleCheckAvailability(request);
    case "book_appointment":
      return handleBookAppointment(request);
    case "reschedule_appointment":
      return handleRescheduleAppointment(request);
    case "cancel_appointment":
      return handleCancelAppointment(request);
    case "get_appointments":
      return handleGetAppointments(request);
    default:
      throw new Error("Unknown tool");
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
