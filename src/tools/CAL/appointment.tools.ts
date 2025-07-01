import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  CheckAvailabilityRequest,
  checkAvailabilitySchema,
} from "../../schema/CAL/appointment.schema.js";
import { checkAvailability } from "../../controller/CAL/cal.appointment.js";
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
            "Start date to check availability from in ISO 8601 format, if user said tomorrow or next day - always reference the Today's date. If today is 24th november 2025, it means tomorrow is 25th november 2025.",
        },

        timezone: {
          type: "string",
          description: "Timezone of the appointment",
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
];

export async function handleCheckAvailability(request: CallToolRequest) {
  try {
    console.log({ request, jsonRequest: JSON.stringify(request) });
    const rawArgs = request.params.arguments as any;
    console.log({ rawArgs });

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
          text: `Available slots retrieved successfully: \n ${response}`,
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
