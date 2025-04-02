import {
  CallToolRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  CreateLeadSchema,
  CreateLeadRequest,
  FindLeadSchema,
  FindLeadRequest,
} from "../schema/tool.js";

export const leadTools = [
  {
    name: "create-lead",
    description: "Create a new lead in the system",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the lead",
        },
        phone: {
          type: "string",
          description: "Phone number of the lead",
        },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "find-lead",
    description: "Find a lead by email or phone number",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Email address of the lead",
        },
        phone: {
          type: "string",
          description: "Phone number of the lead",
        },
      },
      required: ["email", "phone"],
    },
  },
];

export async function handleCreateLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as CreateLeadRequest;

    // Validate the input using Zod
    const result = CreateLeadSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create lead: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { name, phone } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.LEAD.CREATE_LEAD}`;
    const body = { name, phone };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully created lead: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute create-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleFindLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as FindLeadRequest;

    // Validate the input using Zod
    const result = FindLeadSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to find lead: ${errorMessages}. Please provide either an email or phone number.`,
          },
        ],
      };
    }

    const { email, phone } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.LEAD.FIND_LEAD}`;
    const queryParams = new URLSearchParams();
    if (email) queryParams.append("email", email);
    if (phone) queryParams.append("phone", phone);

    const response = await fetch(`${url}?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to find lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Found lead: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute find-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}
