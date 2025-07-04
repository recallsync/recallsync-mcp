import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  getAvailableChunkedSlots,
  bookAppointment,
  getAppointments,
  updateAppointment,
} from "../../controller/GHL/ghl.appointment.js";
import { combineDateAndTime, getPrimaryAgent } from "../../utils/ghl.js";
import { prisma } from "../../lib/prisma.js";
import {
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  getAppointmentsSchema,
  checkAvailabilitySchema,
} from "../../schema/GHL/appointment.schema.js";
import { getLeadById } from "../../utils/integration.util.js";

export const appointmentTools = [
  {
    name: "check_availability",
    description:
      "Use this tool to check availability. Reference the Today's date-time when if user say tomorrow or next week etc. If the date is not provided use the current date for startDate. The timezone must be iana format, example: Aisa/Kolkata",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description:
            "Start date to check availability from, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: YYYY-MM-DD. Must be called 'startDate' in the arguments. If the date is not clear use the current date for startDate",
        },
        timezone: {
          type: "string",
          description:
            "Timezone of the appointment. The timezone must be iana format, example: Aisa/Kolkata and Must be called 'timezone' in the arguments. If the timezone is not clear ask the user their country and city to determine the timezone.",
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
      "Use this tool to book an appointment once the user provided the dateTime to book.",
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
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["dateTime", "timezone", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_appointment",
    description: `Reschedule an existing appointment to a new date and time. You need 'rescheduleOrCancelId' to rescheduel the appointment. Either you have it from the recently booked appointment response, or you can call the get_appointments tool to list the appointments and ask the user to select the appointment they wish to reschedule. Required fields: 'rescheduleOrCancelId', 'newStartTime', 'leadId'`,
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
      "cancel an existing appointment to a new date and time. If the user does not specify which appointment to cancel, first use the get_appointments tool to retrieve all appointments, then clearly ask the user to select the specific appointment they wish to cancel before proceeding.",
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
    description: "Use this tool to list the user's appointments",
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description:
            "leadId from available details. Always include this from 'Available Details'. Must be called 'leadId' in the arguments.",
        },
      },
      required: ["leadId"],
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
    const ghlAccessToken = lead?.Business.BusinessIntegration?.ghlAccessToken;
    const ghlContactId = lead?.ghlContactId;
    const ghlCalendarId = lead?.Conversation?.ActiveAgent?.ghlCalendarId;
    if (!ghlAccessToken || !ghlContactId || !ghlCalendarId) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get appointments. Please try again.",
          },
        ],
      };
    }
    const slots = await getAvailableChunkedSlots({
      input: args,
      ghlAccessToken,
      ghlCalendarId,
    });

    return {
      content: slots.map((slot) => ({
        type: "text",
        text: slot.formattedRange,
      })),
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
            text: `Failed to check availability: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }
    const args = result.data;
    console.log({ parsedArgs: args });
    const lead = await getLeadById(args.leadId);
    const ghlAccessToken = lead?.Business.BusinessIntegration?.ghlAccessToken;
    const ghlLocationId = lead?.Business.BusinessIntegration?.ghlLocationId;
    const ghlContactId = lead?.ghlContactId;
    const ghlCalendarId = lead?.Conversation?.ActiveAgent?.ghlCalendarId;
    if (!ghlAccessToken || !ghlContactId || !ghlCalendarId || !ghlLocationId) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get appointments. Please try again.",
          },
        ],
      };
    }

    const resultBook = await bookAppointment({
      input: args,
      ghlCalendarId,
      ghlAccessToken,
      businessId: lead.businessId,
      agencyId: lead.agencyId,
      ghlContactId,
      ghlLocationId,
    });
    if (resultBook.success) {
      return {
        content: [
          {
            type: "text",
            text: `Appointment booked successfully!. rescheduleOrCancelId: ${
              resultBook.data?.id
            } Details: ${JSON.stringify(resultBook.data)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Failed to book appointment. Please try again.`,
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while booking the appointment: ${
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
    console.log({ rescheduleRawArgs: rawArgs });

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
    const ghlAccessToken = lead?.Business.BusinessIntegration?.ghlAccessToken;
    const ghlLocationId = lead?.Business.BusinessIntegration?.ghlLocationId;
    const ghlContactId = lead?.ghlContactId;
    const ghlCalendarId = lead?.Conversation?.ActiveAgent?.ghlCalendarId;
    if (!ghlAccessToken || !ghlContactId || !ghlCalendarId || !ghlLocationId) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get appointments. Please try again.",
          },
        ],
      };
    }

    const response = await updateAppointment({
      rescheduleOrCancelId: args.rescheduleOrCancelId,
      type: "reschedule",
      newStartTime: args.newStartTime,
      ghlAccessToken,
      agencyId: lead?.agencyId || "",
      businessId: lead?.businessId || "",
      leadId: args.leadId,
    });
    if (response.success) {
      return {
        content: [
          {
            type: "text",
            text: `Appointment rescheduled successfully! Details: ${JSON.stringify(
              response.data
            )}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Failed to reschedule appointment. Please try again.`,
          },
        ],
      };
    }
  } catch (error) {
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
    const lead = await prisma.lead.findUnique({
      where: {
        id: validArgs.leadId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });
    const response = await updateAppointment({
      rescheduleOrCancelId: validArgs.rescheduleOrCancelId,
      type: "cancel",
      ghlAccessToken: lead?.Business?.BusinessIntegration?.ghlAccessToken || "",
      agencyId: lead?.agencyId || "",
      businessId: lead?.businessId || "",
      leadId: validArgs.leadId,
    });
    if (response.success) {
      return {
        content: [
          {
            type: "text",
            text: `Appointment cancelled successfully! Details: ${JSON.stringify(
              response.data
            )}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Failed to cancel appointment. Please try again.`,
          },
        ],
      };
    }
  } catch (error) {
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
    const result = getAppointmentsSchema.safeParse(cleanArgs);
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

    const lead = await getLeadById(args.leadId);
    const ghlAccessToken = lead?.Business.BusinessIntegration?.ghlAccessToken;
    const ghlContactId = lead?.ghlContactId;
    if (!ghlAccessToken || !ghlContactId) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get appointments. Please try again.",
          },
        ],
      };
    }

    const appointments = await getAppointments({
      ghlContactId,
      ghlAccessToken: ghlAccessToken || "",
    });
    if (appointments.success) {
      return {
        content: [
          {
            type: "text",
            text: `Here are your appointments: \n ${JSON.stringify(
              appointments.data
            )}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get appointments. Please try again.`,
          },
        ],
      };
    }
  } catch (error) {
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
