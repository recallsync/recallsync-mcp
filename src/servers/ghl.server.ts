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
} from "../tools/GHL/appointment.tools.js";

export const ghlServer = new Server(
  {
    name: "recallsync-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

// Register the tools
ghlServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [...appointmentTools],
  };
});

// Handle tool execution
ghlServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const startTime = Date.now();
  const startIso = new Date().toISOString();

  let result;
  switch (toolName) {
    case "check_availability":
      result = await handleCheckAvailability(request);
      break;
    case "book_appointment":
      result = await handleBookAppointment(request);
      break;
    case "cancel_appointment":
      result = await handleCancelAppointment(request);
      break;
    case "reschedule_appointment":
      result = await handleRescheduleAppointment(request);
      break;
    case "get_appointments":
      result = await handleGetAppointments(request);
      break;
    default:
      console.log({ error: "Got here - unknown tool call" });
      throw new Error("Unknown tool");
  }

  const endTime = Date.now();
  const endIso = new Date().toISOString();
  const durationMs = endTime - startTime;
  console.log(`[GHL] ${toolName} started: ${startIso} | ended: ${endIso} | duration: ${durationMs}ms`);

  return result;
});

// Keep the existing prompt handlers
ghlServer.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

ghlServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
  throw new Error("Unknown prompt");
});
