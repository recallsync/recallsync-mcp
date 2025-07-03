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
  BookAppointmentRequest,
  RescheduleAppointmentRequest,
  GetAppointmentsRequest,
} from "../../schema/GHL/appointment.schema.js";

export const appointmentTools = [
  {
    name: "check_availability",
    description: `Ask the user for a date time and timezone. If the user says 'today' or 'tomorrow', always resolve it to the actual date at the time of the request. Only require a date and timezone. The tool will check available slots for the given date and the next day (2 days total). Respond with available slots in a user-friendly format, e.g., 'Available on July 1, Monday: 10am-1pm, 4pm-6pm'.`,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "The date to check availability for, in YYYY-MM-DD format. If the user says 'today' or 'tomorrow', use the actual date at the time of the request. Must be called 'date' in the arguments.",
        },
        timezone: {
          type: "string",
          description:
            "Timezone to check availability in IANA format (e.g., Asia/Kolkata). Must be called 'timezone' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'. Must be called 'primaryAgentId' in the arguments.",
          required: true,
        },
      },
      required: ["date", "timezone", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "book_appointment",
    description:
      "Use this tool to book an appointment once the user provided the dateTime to book. If date and time are provided separately, combine them into a single ISO 8601 dateTime string. Prefer dateTime if available.",
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
            "'timezone' of the appointment in iana format, example: Asia/Kolkata. Must be called 'timezone' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'. Must be called 'primaryAgentId' in the arguments.",
          required: true,
        },
        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'. Must be called 'contactId' in the arguments.",
          required: true,
        },
      },
      required: ["dateTime", "timezone", "primaryAgentId", "contactId"],
      additionalProperties: false,
    },
  },

  {
    name: "reschedule_appointment",
    description: `Reschedule an existing appointment to a new date and time. Make sure you have the appointmentId.
  Rescheduling Guidelines:
  - if you dont have the appointmentId then use the get_appointments tool to get the list and ask them to select the appointment they wish to reschedule.
  - if the user provide a new date-time and you have the appointmentId, then directly call the reschedule_appointment tool, and if you face any issue with the rescheduling the appointment with new date time, then call the check_availability tool to show the available time slots near to new start tiem provided by user.`,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: {
          type: "string",
          description:
            "Copy the exact value after 'appointmentId: ' from get_appointments response. Example: if you see 'appointmentId: abc123xyz', use 'abc123xyz'. MUST be called 'appointmentId' in the arguments. Must be called 'appointmentId' in the arguments.",
        },
        newStartTime: {
          type: "string",
          description: `The new start time in ISO 8601 format with timezone offset. (e.g., '2025-07-04T12:30:00+05:30'). Always convert user input to this format. Must be called 'newStartTime' in the arguments.`,
        },
        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'. Must be called 'contactId' in the arguments.",
        },
        required: ["appointmentId", "newStartTime", "contactId"],
      },
    },
  },
  {
    name: "cancel_appointment",
    description:
      "cancel an existing appointment to a new date and time. If the user does not specify which appointment to cancel, first use the get_appointments tool to retrieve all appointments, then clearly ask the user to select the specific appointment they wish to cancel before proceeding.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: {
          type: "string",
          description:
            "Copy the exact value after 'appointmentId: ' from get_appointments response. Example: if you see 'appointmentId: abc123xyz', use 'abc123xyz'. MUST be called 'appointmentId' in the arguments. Must be called 'appointmentId' in the arguments.",
        },

        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'. Must be called 'contactId' in the arguments.",
        },
        required: ["appointmentId", "contactId"],
      },
    },
  },
  {
    name: "get_appointments",
    description: "Use this tool to list the user's appointments",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'",
        },
        required: ["contactId"],
      },
    },
  },
];

export async function handleCheckAvailability(request: CallToolRequest) {
  try {
    const args = request.params.arguments as {
      date: string;
      timezone: string;
      primaryAgentId: string;
    };
    console.log("check availability args", args);
    const result = checkAvailabilitySchema.safeParse(args);
    if (!result.success) {
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
    const validArgs = result.data;
    const startDate = new Date(validArgs.date).getTime();
    const primaryAgentId = (validArgs.primaryAgentId as string) || "";
    const primaryAgent = await getPrimaryAgent(primaryAgentId);
    const slots = await getAvailableChunkedSlots({
      input: { date: startDate, timezone: validArgs.timezone },
      ghlAccessToken:
        primaryAgent?.Business?.BusinessIntegration?.ghlAccessToken || "",
      ghlCalendarId: primaryAgent?.ghlCalendarId || undefined,
    });

    return {
      content: slots.map((slot) => ({
        type: "text",
        text: `Available slots retrieved successfully: \n ${JSON.stringify(
          slot.formattedRange
        )}`,
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
    const args = request.params.arguments as BookAppointmentRequest;
    // Validate input using Zod schema
    const result = bookAppointmentSchema.safeParse(args);
    if (!result.success) {
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
    const validArgs = result.data;
    const primaryAgentId = validArgs.primaryAgentId || "";
    const primaryAgent = await getPrimaryAgent(primaryAgentId);

    const lead = await prisma.lead.findUnique({
      where: {
        id: validArgs.contactId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });
    if (
      !lead?.Business?.BusinessIntegration?.ghlAccessToken ||
      !primaryAgent?.Business?.BusinessIntegration?.ghlAccessToken
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to book appointment. Please provide valid ghlAccessToken for the business.`,
          },
        ],
      };
    }
    // Combine date and time if dateTime is not provided (fallback logic)
    let startTime = validArgs.dateTime;
    if (!startTime && validArgs.date && validArgs.time) {
      startTime = combineDateAndTime(validArgs.date, validArgs.time);
    }
    if (!startTime) {
      return {
        content: [
          {
            type: "text",
            text: `Missing valid dateTime or (date + time) for booking. Please provide a valid date and time.`,
          },
        ],
      };
    }
    const resultBook = await bookAppointment({
      calendarId: primaryAgent?.ghlCalendarId || "",
      contactId: validArgs.contactId,
      startTime,
      ghlAccessToken: lead?.Business?.BusinessIntegration?.ghlAccessToken || "",
      ghlLocationId:
        primaryAgent?.Business?.BusinessIntegration?.ghlLocationId || "",
      agencyId: primaryAgent?.agencyId || "",
      businessId: primaryAgent?.Business?.id || "",
      ghlContactId: lead?.ghlContactId || "",
    });
    if (resultBook.success) {
      const appointmentId = resultBook.data?.id;
      return {
        content: [
          {
            type: "text",
            text: `Appointment booked successfully!\n\nAppointment ID: ${appointmentId}\nDetails: ${JSON.stringify(
              resultBook.data
            )}`,
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
    const args = request.params.arguments as RescheduleAppointmentRequest;
    // Validate input using Zod schema
    const result = rescheduleAppointmentSchema.safeParse(args);
    if (!result.success) {
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
    const validArgs = result.data;
    const lead = await prisma.lead.findUnique({
      where: {
        id: validArgs.contactId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });
    const ghlAccessToken =
      lead?.Business?.BusinessIntegration?.ghlAccessToken || "";
    const response = await updateAppointment({
      appointmentId: validArgs.appointementId,
      type: "reschedule",
      newStartTime: validArgs.newStartTime,
      ghlAccessToken,
      agencyId: lead?.agencyId || "",
      businessId: lead?.businessId || "",
      contactId: validArgs.contactId,
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
        id: validArgs.contactId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });
    if (!lead?.Business?.BusinessIntegration?.ghlAccessToken) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to cancel appointment. Please provide valid ghlAccessToken for the business.`,
          },
        ],
      };
    }
    const response = await updateAppointment({
      appointmentId: validArgs.appointmentId,
      type: "cancel",
      ghlAccessToken: lead?.Business?.BusinessIntegration?.ghlAccessToken || "",
      agencyId: lead?.agencyId || "",
      businessId: lead?.businessId || "",
      contactId: validArgs.contactId,
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
    const args = request.params.arguments as GetAppointmentsRequest;
    // Validate input using Zod schema
    const result = getAppointmentsSchema.safeParse(args);
    if (!result.success) {
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
    const validArgs = result.data;
    const lead = await prisma.lead.findUnique({
      where: {
        id: validArgs.contactId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });
    const appointments = await getAppointments({
      ghlContactId: lead?.ghlContactId || "",
      ghlAccessToken: lead?.Business?.BusinessIntegration?.ghlAccessToken || "",
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
