import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  BookAppointmentRequest,
  bookAppointmentSchema,
  CheckAvailabilityRequest,
  checkAvailabilitySchema,
  RescheduleAppointmentRequest,
  rescheduleAppointmentSchema,
} from "../../schema/CAL/appointment.schema.js";
import {
  bookAppointment,
  checkAvailability,
  rescheduleAppointment,
} from "../../controller/CAL/cal.appointment.js";
import {
  getIntegration,
  getPrimaryAgent,
} from "../../utils/integration.util.js";

export const appointmentTools = [
  {
    name: "check_availability",
    description:
      "Use this tool to check availability once the user proivided the date. Reference the Today's date-time when if user say tomorrow or next week etc.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description:
            "Start date to check availability from, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: YYYY-MM-DD",
        },

        timezone: {
          type: "string",
          description: "Timezone of the appointment. Example: Asia/Kolkata",
        },
        primaryAgentId: {
          type: "string",
          description: "primaryAgentId from available details",
        },
      },
      required: ["startDate", "timezone", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "book_appointment",
    description:
      "Use this tool to book an appointment once the user provided the date-time to book.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        startTime: {
          type: "string",
          description:
            "start time of the appointment, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: ISO 8601",
        },
        timezone: {
          type: "string",
          description:
            "'timezone' of the appointment in iana format, example: Asia/Kolkata",
        },
        name: {
          type: "string",
          description: "Name of the attendee",
        },
        email: {
          type: "string",
          description: "Email of the attendee",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: ["startTime", "timezone", "name", "email", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Use this tool to reschedule an appointment once the user provided the date-time to reschedule.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        startTime: {
          type: "string",
          description:
            "start time of the rescheduled appointment - the updated time of the appointment, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: ISO 8601. MUST be called 'startTime' in the arguments.",
        },
        uid: {
          type: "string",
          description:
            "'uid' of the appointment to reschedule, MUST be called 'uid' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: ["startTime", "uid", "primaryAgentId"],
      additionalProperties: false,
    },
  },
];

export async function handleCheckAvailability(request: CallToolRequest) {
  try {
    const rawArgs = request.params.arguments as any;

    // Extract API key from injected arguments
    const apiKey = rawArgs._apiKey;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Authentication failed: No API key provided",
          },
        ],
      };
    }

    // Remove _apiKey from args before validation
    const { _apiKey, ...cleanArgs } = rawArgs;
    const args = cleanArgs as CheckAvailabilityRequest;

    // Validate the input using Zod
    const result = checkAvailabilitySchema.safeParse(args);
    const integration = await getIntegration(apiKey);
    if (!integration) {
      return {
        content: [
          {
            type: "text",
            text: "Integration not found",
          },
        ],
      };
    }
    const agent = await getPrimaryAgent(args.primaryAgentId);
    if (!agent?.CalenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Primary agent not found",
          },
        ],
      };
    }

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to check availability: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }
    console.log("checking availability");
    // compact ai formatted response
    const response = await checkAvailability({
      args: result.data,
      calendar: agent.CalenderIntegration,
    });
    console.log("availability checked", response);
    return {
      content: [
        {
          type: "text",
          text: `Available slots retrieved successfully: \n ${JSON.stringify(
            response
          )}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error checking availability:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while checking availability: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleBookAppointment(request: CallToolRequest) {
  try {
    const rawArgs = request.params.arguments as any;

    // Extract API key from injected arguments
    const apiKey = rawArgs._apiKey;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Authentication failed: No API key provided",
          },
        ],
      };
    }

    // Remove _apiKey from args before validation
    const { _apiKey, ...cleanArgs } = rawArgs;
    const args = cleanArgs as BookAppointmentRequest;
    console.log("book appointment args", args);
    // Validate the input using Zod
    const result = bookAppointmentSchema.safeParse(args);
    console.log("book appointment parsing result", result);
    const integration = await getIntegration(apiKey);
    if (!integration) {
      return {
        content: [
          {
            type: "text",
            text: "Integration not found",
          },
        ],
      };
    }
    const agent = await getPrimaryAgent(args.primaryAgentId);
    if (!agent?.CalenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Primary agent not found",
          },
        ],
      };
    }

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to book appointment: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }
    console.log("booking appointment");
    // compact ai formatted response
    const response = await bookAppointment({
      args: result.data,
      calendar: agent.CalenderIntegration,
      businessName: integration.Business.name,
    });
    console.log("booking appointment", response);
    return {
      content: [
        {
          type: "text",
          text: `Appointment booked successfully: \n ${response}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error booking appointment:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while booking appointment: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleRescheduleAppointment(request: CallToolRequest) {
  try {
    const rawArgs = request.params.arguments as any;

    // Extract API key from injected arguments
    const apiKey = rawArgs._apiKey;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Authentication failed: No API key provided",
          },
        ],
      };
    }

    // Remove _apiKey from args before validation
    const { _apiKey, ...cleanArgs } = rawArgs;
    const args = cleanArgs as RescheduleAppointmentRequest;
    console.log("reschedule appointment args", args);
    // Validate the input using Zod
    const result = rescheduleAppointmentSchema.safeParse(args);
    console.log("reschedule appointment parsing result", result);
    const integration = await getIntegration(apiKey);
    if (!integration) {
      return {
        content: [
          {
            type: "text",
            text: "Integration not found",
          },
        ],
      };
    }
    const agent = await getPrimaryAgent(args.primaryAgentId);
    if (!agent?.CalenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Primary agent not found",
          },
        ],
      };
    }

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to reschedule appointment: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }
    console.log("reschedule appointment");
    // compact ai formatted response
    const response = await rescheduleAppointment({
      args: result.data,
      calendar: agent.CalenderIntegration,
    });
    console.log("reschedule appointment", response);
    return {
      content: [
        {
          type: "text",
          text: `Appointment rescheduled successfully: \n ${response}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error reschedule appointment:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while rescheduling appointment: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
