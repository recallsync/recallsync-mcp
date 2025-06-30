import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  CheckAvailabilityRequest,
  checkAvailabilitySchema,
} from "../../schema/GHL/appointment.schema.js";
import { checkAvailability } from "../../controller/GHL/ghl.appointment.js";

export const appointmentTools = [
  {
    name: "check_availability",
    description:
      "Use this tool to check availability once the user proivided the date. Reference the Today's date-time when if user say tomorrow or next week etc.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        startTime: {
          type: "string",
          description:
            "Start time to check availability from in ISO 8601 format, if user said tomorrow or next day - always reference the Today's date-time. If today is 24th november 2025, it means tomorrow is 25th november 2025.",
        },

        timezone: {
          type: "string",
          description: "Timezone of the appointment",
        },
      },
      required: ["startTime", "timezone"],
      additionalProperties: false,
    },
  },
];

export async function handleCheckAvailability(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as CheckAvailabilityRequest;

    // Validate the input using Zod
    const result = checkAvailabilitySchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create follow-up: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const response = await checkAvailability(result.data);

    return {
      content: [
        {
          type: "text",
          text: `Available slots retrieved successfully`,
        },
        {
          type: "text",
          text: JSON.stringify(response.slots, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error creating follow-up:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while creating the follow-up: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
