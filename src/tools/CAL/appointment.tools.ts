import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  BookAppointmentRequest,
  bookAppointmentSchema,
  CancelAppointmentRequest,
  cancelAppointmentSchema,
  CheckAvailabilityRequest,
  checkAvailabilitySchema,
  GetCalBookingsRequest,
  getCalBookingsSchema,
  RescheduleAppointmentRequest,
  rescheduleAppointmentSchema,
} from "../../schema/CAL/appointment.schema.js";
import {
  bookAppointment,
  cancelAppointment,
  checkAvailability,
  getCalBookings,
  rescheduleAppointment,
} from "../../controller/CAL/cal.appointment.js";
import {
  getIntegration,
  getPrimaryAgent,
} from "../../utils/integration.util.js";
import { prisma } from "../../lib/prisma.js";

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
          description:
            "Timezone of the appointment. Must be called 'timezone' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'. Must be called 'primaryAgentId' in the arguments.",
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
        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: [
        "startTime",
        "timezone",
        "name",
        "email",
        "primaryAgentId",
        "contactId",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Use this tool to reschedule an appointment once the user provided the date-time to reschedule. Always call the get_appointments tool to get the list of meetings. if the user have not said which meeting to reschedule, ask the user to provide the meeting to reschedule. Alaways use the rescheduleOrCancelUid from the get_appointments response selected meeting.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        updatedStartTime: {
          type: "string",
          description:
            "start time of the rescheduled appointment - the updated time of the appointment, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: ISO 8601. MUST be called 'updatedStartTime' in the arguments.",
        },
        rescheduleOrCancelUid: {
          type: "string",
          description:
            "Copy the exact value after 'rescheduleOrCancelUid: ' from get_appointments response. Example: if you see 'rescheduleOrCancelUid: abc123xyz', use 'abc123xyz'. MUST be called 'rescheduleOrCancelUid' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: ["updatedStartTime", "rescheduleOrCancelUid", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_appointment",
    description:
      "Use this tool to cancel an appointment once the user provided the date-time to cancel. Always call the get_appointments tool to get the list of meetings. if the user have not said which meeting to cancel, ask the user to provide the meeting to cancel. Alaways use the rescheduleOrCancelUid from the get_appointments response selected meeting.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        rescheduleOrCancelUid: {
          type: "string",
          description:
            "Copy the exact value after 'rescheduleOrCancelUid: ' from get_appointments response. Example: if you see 'rescheduleOrCancelUid: abc123xyz', use 'abc123xyz'. MUST be called 'rescheduleOrCancelUid' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: ["rescheduleOrCancelUid", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_appointments",
    description: "Use this tool to get all the appointments for the user.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description:
            "Email of the user, MUST be called 'email' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: ["email", "primaryAgentId"],
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
    //TODO: leter we can get the lead from workflow , and fing ghlcontactId from it
    const lead = await prisma.lead.findFirst({
      where: {
        ghlContactId: args.contactId,
      },
    });
    // compact ai formatted response
    const response = await bookAppointment({
      args: result.data,
      calendar: agent.CalenderIntegration,
      businessName: integration.Business.name,
      businessId: agent.businessId,
      agencyId: agent.agencyId,
      contactId: lead?.id || "",
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

export async function handleCancelAppointment(request: CallToolRequest) {
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
    const args = cleanArgs as CancelAppointmentRequest;
    console.log("cancel appointment args", args);
    // Validate the input using Zod
    const result = cancelAppointmentSchema.safeParse(args);
    console.log("cancel appointment parsing result", result);
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
            text: `Failed to cancel appointment: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }
    console.log("cancel appointment");
    // compact ai formatted response
    const response = await cancelAppointment({
      args: result.data,
      calendar: agent.CalenderIntegration,
    });
    console.log("cancel appointment", response);
    return {
      content: [
        {
          type: "text",
          text: `Appointment cancelled successfully: \n ${response}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error cancel appointment:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while cancelling appointment: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleGetAppointments(request: CallToolRequest) {
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
    const args = cleanArgs as GetCalBookingsRequest;
    console.log("get appointments args", args);
    // Validate the input using Zod
    const result = getCalBookingsSchema.safeParse(args);
    console.log("get appointments parsing result", result);
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
            text: `Failed to get appointments: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }
    console.log("get appointments");
    // compact ai formatted response
    const response = await getCalBookings({
      args: result.data,
      calendar: agent.CalenderIntegration,
    });
    console.log("get appointments", response);
    return {
      content: [
        {
          type: "text",
          text: `Appointments fetched successfully: \n ${response}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error get appointments:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while getting appointments: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
