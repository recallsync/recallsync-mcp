import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  getAvailableChunkedSlots,
  bookAppointment,
  getAppointments,
  updateAppointment,
} from "../../controller/GHL/ghl.appointment.js";
import { combineDateAndTime, getPrimaryAgent } from "../../utils/ghl.js";
import { prisma } from "../../lib/prisma.js";

export const appointmentTools = [
  {
    name: "check_availability",
    description: `Ask the user for a date (e.g., 'July 1, 2024'). If the user says 'today' or 'tomorrow', always resolve it to the actual date at the time of the request. Only require a date and timezone. The tool will check available slots for the given date and the next day (2 days total). Respond with available slots in a user-friendly format, e.g., 'Available on July 1, Monday: 10am-1pm, 4pm-6pm'.`,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "The date to check availability for, in YYYY-MM-DD format. If the user says 'today' or 'tomorrow', use the actual date at the time of the request.",
        },
        timezone: {
          type: "string",
          description: "Timezone of the appointment",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
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
            "date time of the appointment, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025. Format: ISO 8601",
        },
        timezone: {
          type: "string",
          description:
            "'timezone' of the appointment in iana format, example: Asia/Kolkata",
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
      required: ["dateTime", "timezone", "primaryAgentId", "contactId"],
      additionalProperties: false,
    },
  },

  {
    name: "reschedule_appointment",
    description: `Reschedule an existing appointment to a new date and time.
  Rescheduling Guidelines:
  - Firslty, use the get_appointments tool to get the list and ask them to select the appointment they wish to reschedule.
  - if the user provide a new date-time, make sure you have the appointmentId from the get_appointments tool response.`,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: {
          type: "string",
          description:
            "Copy the exact value after 'appointmentId: ' from get_appointments response. Example: if you see 'appointmentId: abc123xyz', use 'abc123xyz'. MUST be called 'appointmentId' in the arguments.",
        },
        newTime: {
          type: "string",
          description: `The new start time in ISO 8601 format with timezone offset. (e.g., '2025-07-04T12:30:00+05:30'). Always convert user input to this format.`,
        },
        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'",
        },
        required: ["appointmentId", "startTime", "contactId"],
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
            "Copy the exact value after 'appointmentId: ' from get_appointments response. Example: if you see 'appointmentId: abc123xyz', use 'abc123xyz'. MUST be called 'appointmentId' in the arguments.",
        },

        contactId: {
          type: "string",
          description:
            "contactId from available details. Always include this from 'Available Details'",
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
    if (!args.date || !args.timezone) {
      return {
        content: [
          {
            type: "text",
            text: "Please provide a date (YYYY-MM-DD) and timezone to check availability.",
          },
        ],
      };
    }

    // Convert date to timestamp (start of day)
    const startDate = new Date(args.date).getTime();
    const date = startDate;
    const primaryAgentId = (args.primaryAgentId as string) || "";
    // Call the business logic with startTime and timezone
    const primaryAgent = await getPrimaryAgent(primaryAgentId);
    const slots = await getAvailableChunkedSlots({
      input: { date, timezone: args.timezone },
      ghlAccessToken: String(request.params?.arguments?._ghlAccessToken || ""),
      ghlCalendarId: primaryAgent?.ghlCalendarId || undefined,
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
    const args = request.params.arguments as {
      dateTime?: string;
      date?: string;
      time?: string;
      timezone?: string;
      primaryAgentId: string;
      contactId: string;
    };
    console.log("book appointment args", args);
    const primaryAgentId = (args.primaryAgentId as string) || "";
    const primaryAgent = await getPrimaryAgent(primaryAgentId);

    const lead = await prisma.lead.findUnique({
      where: {
        id: args.contactId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });

    // Combine date and time if dateTime is not provided
    let startTime = args.dateTime;
    if (!startTime && args.date && args.time) {
      startTime = combineDateAndTime(args.date, args.time);
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

    const result = await bookAppointment({
      calendarId: primaryAgent?.ghlCalendarId || "",
      contactId: args.contactId,
      startTime,
      ghlAccessToken: lead?.Business?.BusinessIntegration?.ghlAccessToken || "",
      ghlLocationId:
        primaryAgent?.Business?.BusinessIntegration?.ghlLocationId || "",
      agencyId: primaryAgent?.agencyId || "",
      businessId: primaryAgent?.Business?.id || "",
      ghlContactId: lead?.ghlContactId || "",
    });

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Appointment booked successfully! Details: ${JSON.stringify(
              result.data
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
    console.log("reschedule appointment args", request.params.arguments);
    const args = request.params.arguments as {
      appointmentId: string;
      newTime: string;
      contactId: string;
      newStartTime?: string;
    };

    const lead = await prisma.lead.findUnique({
      where: {
        id: args.contactId,
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
      appointmentId: args.appointmentId,
      type: "reschedule",
      newStartTime: args.newTime || args.newStartTime || "",
      ghlAccessToken,
      agencyId: lead?.agencyId || "",
      businessId: lead?.businessId || "",
      contactId: args.contactId,
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
    console.error("Error rescheduling appointment:", error);
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
    console.log("cancel appointment args", request.params.arguments);
    const args = request.params.arguments as {
      appointmentId: string;
      startTime: string;
      primaryAgentId: string;
      contactId: string;
    };
    const lead = await prisma.lead.findUnique({
      where: {
        id: args.contactId,
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
      appointmentId: args.appointmentId,
      type: "cancel",
      ghlAccessToken: lead?.Business?.BusinessIntegration?.ghlAccessToken || "",
      agencyId: lead?.agencyId || "",
      businessId: lead?.businessId || "",
      contactId: args.contactId,
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
    console.error("Error canceling appointment:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while canceling appointment: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
export async function handleGetAppointments(request: CallToolRequest) {
  try {
    const args = request.params.arguments as {
      contactId: string;
    };
    console.log("get appointments args", args);
    // Validate the input
    const lead = await prisma.lead.findUnique({
      where: {
        id: args.contactId,
      },
      include: {
        Business: {
          include: {
            BusinessIntegration: true,
          },
        },
      },
    });
    if (!args.contactId) {
      return {
        content: [
          {
            type: "text",
            text: "Please provide a contactId to get appointments.",
          },
        ],
      };
    }
    const appointments = await getAppointments({
      ghlContactId: lead?.ghlContactId || "",
      // timezone: undefined,
      // userTimezone: undefined,
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
    console.error("Error getting appointments:", error);
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
