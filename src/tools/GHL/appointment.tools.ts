import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  getAvailableChunkedSlots,
  bookAppointment,
  getAppointments,
  updateAppointment,
} from "../../controller/GHL/ghl.appointment.js";
import { getPrimaryAgent } from "../../utils/ghl.js";

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
      "Book an appointment. Always convert the user's input (e.g., 'July 4 at 12:30 pm', 'today at 10 am') to a valid ISO 8601 string with timezone offset (e.g., '2025-07-04T12:30:00+05:30'). Do not pass natural language or ambiguous times.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        startTime: {
          type: "string",
          description:
            "The appointment start time in ISO 8601 format with offset (e.g., '2025-07-04T12:30:00+05:30'). Always convert user input to this format.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
        },
        ghlContactId: {
          type: "string",
          description:
            "ghlContactId from available details. Always include this from 'Available Details'",
        },
      },
      required: ["startTime", "primaryAgentId", "ghlContactId"],
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_appointment",
    description: `Reschedule an existing appointment to a new date and time.
  Rescheduling Guidelines:
  - if the user did not specify a date-time, use the get_appointments tool to get the list and ask them to select the appointment they wish to reschedule.
  - if the user provide a date-time, make sure you have the appointmentId from the get_appointments tool response.`,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: {
          type: "string",
          description:
            "The appointmentId from available details. Always include this from 'Available Details",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
        startTime: {
          type: "string",
          description: `The new start time in ISO 8601 format with timezone offset. (e.g., '2025-07-04T12:30:00+05:30'). Always convert user input to this format.`,
        },
        ghlContactId: {
          type: "string",
          description:
            "ghlContactId from available details. Always include this from 'Available Details'",
        },
        required: [
          "appointmentId",
          "primaryAgentId",
          "startTime",
          "ghlContactId",
        ],
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
            "The appointmentId from available details. Always include this from 'Available Details",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
        ghlContactId: {
          type: "string",
          description:
            "ghlContactId from available details. Always include this from 'Available Details'",
        },
        required: ["appointmentId", "primaryAgentId", "ghlContactId"],
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
        ghlContactId: {
          type: "string",
          description:
            "ghlContactId from available details. Always include this from 'Available Details'",
        },

        required: ["ghlContactId"],
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
    // Validate the input
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
      startTime: string;
      primaryAgentId: string;
      ghlContactId: string;
    };
    const primaryAgentId = (args.primaryAgentId as string) || "";
    const primaryAgent = await getPrimaryAgent(primaryAgentId);
    console.log("primaryAgent", primaryAgentId);
    const result = await bookAppointment({
      calendarId: primaryAgent?.ghlCalendarId || "",
      contactId: args.ghlContactId,
      startTime: args.startTime,
      ghlAccessToken: String(request.params?.arguments?._ghlAccessToken || ""),
      ghlLocationId:
        primaryAgent?.Business?.BusinessIntegration?.ghlLocationId || "",
      agencyId: primaryAgent?.agencyId || "",
      businessId: primaryAgent?.Business?.id || "",
      ghlContactId: args.ghlContactId,
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
      startTime: string;
      primaryAgentId: string;
      ghlContactId: string;
    };
    const primaryAgent = await getPrimaryAgent(args.primaryAgentId);
    const response = await updateAppointment({
      appointmentId: args.appointmentId,
      type: "reschedule",
      newStartTime: args.startTime,
      ghlAccessToken: String(request.params?.arguments?._ghlAccessToken || ""),
      agencyId: primaryAgent?.agencyId || "",
      businessId: primaryAgent?.Business?.id || "",
      contactId: args.ghlContactId,
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
      ghlContactId: string;
    };
    const primaryAgent = await getPrimaryAgent(args.primaryAgentId);
    const response = await updateAppointment({
      appointmentId: args.appointmentId,
      type: "cancel",
      ghlAccessToken: String(request.params?.arguments?._ghlAccessToken || ""),
      agencyId: primaryAgent?.agencyId || "",
      businessId: primaryAgent?.Business?.id || "",
      contactId: args.ghlContactId,
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
      ghlContactId: string;
    };
    console.log("get appointments args", args);
    // Validate the input
    if (!args.ghlContactId) {
      return {
        content: [
          {
            type: "text",
            text: "Please provide a ghlContactId to get appointments.",
          },
        ],
      };
    }
    const appointments = await getAppointments({
      ghlContactId: args.ghlContactId,
      // timezone: undefined,
      // userTimezone: undefined,
      ghlAccessToken: String(request.params?.arguments?._ghlAccessToken || ""),
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
