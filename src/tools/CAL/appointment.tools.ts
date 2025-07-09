import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  checkAvailabilitySchema,
  getCalBookingsSchema,
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
  getLeadById,
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
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["startDate", "timezone", "leadId"],
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
        dateTime: {
          type: "string",
          description:
            "date time of the appointment, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: ISO 8601. Must be called 'dateTime' in the arguments.",
        },
        timezone: {
          type: "string",
          description:
            "Timezone of the appointment. The timezone must be iana format, example: Aisa/Kolkata and Must be called 'timezone' in the arguments. If the timezone is not clear ask the user their country and city to determine the timezone.",
        },
        name: {
          type: "string",
          description: "Name of the attendee",
        },
        email: {
          type: "string",
          description: "Email of the attendee",
        },
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["dateTime", "timezone", "name", "email", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Use this tool to reschedule an appointment once the user provided the date-time to reschedule. Always call the get_appointments tool to get the list of meetings. if the user have not said which meeting to reschedule, ask the user to provide the meeting to reschedule. Alaways use the rescheduleOrCancelId from the get_appointments response selected meeting.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        rescheduleOrCancelId: {
          type: "string",
          description:
            "Use the exact value after 'rescheduleOrCancelId: ', example: 'xLCTaSvv2bGm7EfTjQ0C'. MUST be called 'rescheduleOrCancelId' in the arguments. Do not use numbers like 1,2,3 etc. Use the exact value from the rescheduleOrCancelId. ",
        },
        newStartTime: {
          type: "string",
          description: `The new start time in ISO 8601 format. Must be called 'newStartTime' in the arguments.`,
        },
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["rescheduleOrCancelId", "newStartTime", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_appointment",
    description:
      "Use this tool to cancel an appointment once the user provided the date-time to cancel. Always call the get_appointments tool to get the list of meetings. if the user have not said which meeting to cancel, ask the user to provide the meeting to cancel. Alaways use the rescheduleOrCancelId from the get_appointments response selected meeting.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        rescheduleOrCancelId: {
          type: "string",
          description:
            "Use the exact value after 'rescheduleOrCancelId: ', example: 'abcdxyq123'. MUST be called 'rescheduleOrCancelId' in the arguments.",
        },
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["rescheduleOrCancelId", "leadId"],
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
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["email", "leadId"],
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
    console.log({ rawArgs });
    // Validate the input using Zod
    const result = checkAvailabilitySchema.safeParse(cleanArgs);
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
    const args = result.data;
    console.log({ parsedArgs: args });
    const lead = await getLeadById(args.leadId);
    const calenderIntegration =
      lead?.Conversation?.ActiveAgent?.CalenderIntegration;
    console.log({
      calenderIntegration,
    });
    if (!calenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get appointments. Please try again.",
          },
        ],
      };
    }
    console.log("checking availability");
    // compact ai formatted response
    const response = await checkAvailability({
      args: result.data,
      calendar: calenderIntegration,
      lead,
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
    console.log({ rawArgs });
    // Validate the input using Zod
    const result = bookAppointmentSchema.safeParse(cleanArgs);
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
    const args = result.data;
    console.log({ parsedArgs: args });
    const lead = await getLeadById(args.leadId);
    const calenderIntegration =
      lead?.Conversation?.ActiveAgent?.CalenderIntegration;
    if (!calenderIntegration || !lead) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to book appointment. Please try again.",
          },
        ],
      };
    }
    console.log("booking appointment");
    // compact ai formatted response
    const response = await bookAppointment({
      args: result.data,
      calendar: calenderIntegration,
      businessName: lead?.Business.name,
      lead,
    });

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
    console.log({ rawArgs });
    // Validate the input using Zod
    const result = rescheduleAppointmentSchema.safeParse(cleanArgs);
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
    const args = result.data;
    console.log({ parsedArgs: args });
    const lead = await getLeadById(args.leadId);
    const calenderIntegration =
      lead?.Conversation?.ActiveAgent?.CalenderIntegration;
    if (!calenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to reschedule appointment. Please try again.",
          },
        ],
      };
    }
    console.log("reschedule appointment");
    // compact ai formatted response
    const response = await rescheduleAppointment({
      args: result.data,
      calendar: calenderIntegration,
      lead,
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
    const args = request.params.arguments as any;
    // Validate input using Zod schema
    const result = cancelAppointmentSchema.safeParse(args);
    if (!result.success) {
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
    const validArgs = result.data;
    const lead = await getLeadById(validArgs.leadId);
    const calenderIntegration =
      lead?.Conversation?.ActiveAgent?.CalenderIntegration;
    if (!calenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to cancel appointment. Please try again.",
          },
        ],
      };
    }
    console.log("cancel appointment");
    // compact ai formatted response
    const response = await cancelAppointment({
      args: result.data,
      calendar: calenderIntegration,
      lead,
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
    // Validate the input using Zod
    console.log({ cleanArgs });
    const result = getCalBookingsSchema.safeParse(cleanArgs);
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
    const args = result.data;
    console.log({ args });
    const lead = await getLeadById(args.leadId);
    console.log({ lead });
    const calenderIntegration =
      lead?.Conversation?.ActiveAgent?.CalenderIntegration;
    console.log({ calenderIntegration: lead?.Conversation?.ActiveAgent });
    if (!calenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get appointments. Please try again.",
          },
        ],
      };
    }
    if (!lead?.email) {
      return {
        content: [
          {
            type: "text",
            text: "Do not have any appointments.",
          },
        ],
      };
    }

    console.log("get appointments");
    // compact ai formatted response
    const response = await getCalBookings({
      args: result.data,
      calendar: calenderIntegration,
      email: lead?.email,
      lead,
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
