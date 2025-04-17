import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  CreateLeadSchema,
  CreateLeadRequest,
  FindLeadSchema,
  FindLeadRequest,
  UpdateLeadSchema,
  UpdateLeadRequest,
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
          description: "Full name of the lead",
        },
        firstName: {
          type: "string",
          description: "First name of the lead",
        },
        lastName: {
          type: "string",
          description: "Last name of the lead",
        },
        email: {
          type: "string",
          description: "Primary email address of the lead",
        },
        bestEmail: {
          type: "string",
          description: "Best email address to reach the lead",
        },
        phone: {
          type: "string",
          description: "Primary phone number of the lead",
        },
        bestPhone: {
          type: "string",
          description: "Best phone number to reach the lead",
        },
        dateOfBirth: {
          type: "string",
          description: "Date of birth (ISO format)",
        },
        ianaTimezone: {
          type: "string",
          description: "IANA timezone (e.g., Asia/Kolkata)",
        },
        country: {
          type: "string",
          description: "Country of the lead",
        },
        city: {
          type: "string",
          description: "City of the lead",
        },
        state: {
          type: "string",
          description: "State of the lead",
        },
        zipCode: {
          type: "string",
          description: "Zip code of the lead",
        },
        address: {
          type: "string",
          description: "Address of the lead",
        },
        company: {
          type: "string",
          description: "Company name",
        },
        companyAddress: {
          type: "string",
          description: "Company address",
        },
        industry: {
          type: "string",
          description: "Industry (e.g., Real Estate, Marketing)",
        },
        website: {
          type: "string",
          description: "Website URL",
        },
        message: {
          type: "string",
          description: "Message sent by the lead",
        },
        source: {
          type: "string",
          description: "Lead source (website, social media, referral, etc.)",
        },
        note: {
          type: "string",
          description: "Note about the lead by agency/agent",
        },
      },
      required: ["name", "phone"],
      additionalProperties: false,
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
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-leads",
    description:
      "Get all leads in the system with optional filters for status, status type, and quality",
    arguments: [],
    inputSchema: {
      type: "object",

      properties: {
        status: {
          type: "string",
          description: "Optional parameter status to filter leads",
          enum: ["NEW", "CONTACTED", "RETRYING", "JUNK", "BOOKED"],
        },
        statusType: {
          type: "string",
          description: "Optional parameter statusType to filter leads",
          enum: ["HOT", "WARM", "COLD"],
        },
        quality: {
          type: "string",
          description: "Optional parameter quality to filter leads",
          enum: ["UNQUALIFIED", "LOW", "MEDIUM", "HIGH", "PERFECT"],
        },
        all: {
          type: "boolean",
          description: "Optional parameter to get all leads",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-lead",
    description: "Get details of a specific lead by its lead id.",

    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the lead to retrieve",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "update-lead",
    description: "Update a lead by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the lead to update",
        },
        status: {
          type: "string",
          description: "New status for the lead",
          enum: ["NEW", "CONTACTED", "RETRYING", "JUNK", "BOOKED"],
        },
        statusType: {
          type: "string",
          description: "New status type for the lead",
          enum: ["HOT", "WARM", "COLD"],
        },
        quality: {
          type: "string",
          description: "New quality rating for the lead",
          enum: ["UNQUALIFIED", "LOW", "MEDIUM", "HIGH", "PERFECT"],
        },
        // Add other updateable fields from create-lead schema
        firstName: {
          type: "string",
          description: "First name of the lead",
        },
        lastName: {
          type: "string",
          description: "Last name of the lead",
        },
        email: {
          type: "string",
          description: "Primary email address of the lead",
        },
        bestEmail: {
          type: "string",
          description: "Best email address to reach the lead",
        },
        bestPhone: {
          type: "string",
          description: "Best phone number to reach the lead",
        },
        note: {
          type: "string",
          description: "Note about the lead by agency/agent",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-lead",
    description: "Delete a lead by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the lead to delete",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get-lead-by-name",
    description: "Get details of a specific lead by their name",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the lead to retrieve",
        },
      },
      required: ["name"],
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

export async function handleGetLeads(request: CallToolRequest) {
  try {
    const url = `${process.env.BASE_URL}/leads`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.text();
        console.error("Get All Leads Error Response:", errorData);
        // Try to parse as JSON if it looks like JSON
        if (
          errorData.trim().startsWith("{") ||
          errorData.trim().startsWith("[")
        ) {
          const jsonError = JSON.parse(errorData);
          errorMessage = jsonError.message || errorData;
        } else {
          errorMessage = errorData;
        }
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to get leads: ${errorMessage}`,
          },
        ],
      };
    }

    const res = await response.json();
    const data = res.leads;

    // format the response in a more readable way
    if (Array.isArray(data) && data.length > 0) {
      const formattedLeads = data
        .map((lead: any) => {
          return `- ${lead.name} (ID: ${lead.id})${
            lead.phone ? ` - Phone: ${lead.phone}` : ""
          }${lead.email ? ` - Email: ${lead.email}` : ""}`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${data.length} leads:\n${formattedLeads}`,
          },
        ],
      };
    } else if (Array.isArray(data) && data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No leads found in the system.",
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Unexpected response format from the server.",
          },
        ],
      };
    }
  } catch (error: unknown) {
    console.error("Get All Leads Exception:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while getting the leads: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleGetLead(request: CallToolRequest) {
  try {
    const { id } = request.params.arguments as { id: string };
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.LEAD.GET_LEADS}/lead/${id}`;

    const response = await fetch(url, {
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
            text: `Failed to get lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Lead details: ${JSON.stringify(data)}`,
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
          text: `Failed to execute get-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as UpdateLeadRequest;
    const result = UpdateLeadSchema.safeParse(args);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update lead: ${errorMessages}`,
          },
        ],
      };
    }

    const { id, status } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.LEAD.CREATE_LEAD}/lead/${id}`;
    const body = { status };

    const response = await fetch(url, {
      method: "PUT",
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
            text: `Failed to update lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated lead: ${JSON.stringify(data)}`,
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
          text: `Failed to execute update-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleDeleteLead(request: CallToolRequest) {
  try {
    const { id } = request.params.arguments as { id: string };
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.LEAD.GET_LEADS}/lead/${id}`;

    const response = await fetch(url, {
      method: "DELETE",
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
            text: `Failed to delete lead: ${response.statusText}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted lead with ID: ${id}`,
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
          text: `Failed to execute delete-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetLeadByName(request: CallToolRequest) {
  try {
    const { name } = request.params.arguments as { name: string };
    const url = `${process.env.BASE_URL}${
      API_ENDPOINTS.LEAD.GET_LEADS
    }/search/?name=${encodeURIComponent(name)}`;

    const response = await fetch(url, {
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
            text: `Failed to get lead by name: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Lead details: ${JSON.stringify(data)}`,
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
          text: `Failed to execute get-lead-by-name tool: ${errorMessage}`,
        },
      ],
    };
  }
}
