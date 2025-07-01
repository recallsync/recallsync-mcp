import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  CheckAvailabilityRequest,
  checkAvailabilitySchema,
} from "../../schema/GHL/appointment.schema.js";
import {
  checkAvailability,
  getAvailableChunkedSlots,
} from "../../controller/GHL/ghl.appointment.js";

export const appointmentTools = [
  {
    name: "check_availability",
    description: `Ask the user for a date and timezone( like, ist , idt etc) (e.g., 'July 1, 2024'). If the user says 'today' or 'tomorrow', reference the actual date based on the current day. Only require a date and timezone. The tool will check available slots for the given date and the next day (2 days total). Respond with available slots in a user-friendly format, e.g., 'Available on July 1, Monday: 10am-1pm, 4pm-6pm'.`,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "The date to check availability for, in YYYY-MM-DD format. If the user says 'today' or 'tomorrow', use the actual date.",
        },
        timezone: {
          type: "string",
          description: "Timezone of the appointment",
        },
      },
      required: ["date", "timezone"],
      additionalProperties: false,
    },
  },
  // {
  //   type: "function",
  //   function: {
  //     name: "book_appointment",
  //     description: `Book an appointment with the provided date and time. Time should be in ISO 8601 format with timezone offset.`,
  //     parameters: {
  //       type: "object",
  //       properties: {
  //         startTime: {
  //           type: "string",
  //           description: `The start time in ISO 8601 format with offset`,
  //         },
  //       },
  //       required: ["startTime"],
  //     },
  //   },
  // },
];

export async function handleCheckAvailability(request: CallToolRequest) {
  try {
    const args = request.params.arguments as { date: string; timezone: string };

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

    // Call the business logic with startTime and timezone
    const slots = await getAvailableChunkedSlots({
      input: { date, timezone: args.timezone },
      ghlAccessToken: String(request.params?.arguments?._ghlAccessToken || ""),
      ghlCalendarId: String(request.params?.arguments?._ghlCalendarId || ""),
    });
    // Format the slo ts for user-friendly output

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
  } catch (error) {
    console.error("Error creating follow-up:", error);
  }
}
