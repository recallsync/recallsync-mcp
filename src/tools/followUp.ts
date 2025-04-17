import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  CreateFollowUpSchema,
  CreateFollowUpRequest,
  UpdateFollowUpSchema,
  UpdateFollowUpRequest,
  GetFollowUpSchema,
  GetFollowUpRequest,
  GetAllFollowUpsSchema,
  GetAllFollowUpsRequest,
} from "../schema/tool.js";

export const followUpTools = [
  {
    name: "create-follow-up",
    description: "Create a new follow-up for a lead",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to follow up with",
        },
        followUpAt: {
          type: "string",
          description: "Date and time for the follow-up (ISO format)",
        },
        reason: {
          type: "string",
          description: "Reason for the follow-up",
        },
        notes: {
          type: "string",
          description: "Additional notes about the follow-up",
        },
        summary: {
          type: "string",
          description: "Summary of the follow-up",
        },
        status: {
          type: "string",
          description: "Status of the follow-up",
          enum: [
            "PENDING",
            "COMPLETED",
            "RESCHEDULED",
            "NO_SHOW",
            "NOT_INTERESTED",
            "DROPPED",
          ],
          default: "PENDING",
        },
        priority: {
          type: "string",
          description: "Priority level of the follow-up",
          enum: ["LOW", "MEDIUM", "HIGH"],
          default: "LOW",
        },
        type: {
          type: "string",
          description: "Type of follow-up (HUMAN_AGENT or AI_AGENT)",
          enum: ["HUMAN_AGENT", "AI_AGENT"],
          default: "HUMAN_AGENT",
        },
      },
      required: ["leadId", "followUpAt", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "get-follow-up",
    description: "Get a follow-up by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the follow-up to retrieve",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get-all-follow-ups",
    description:
      "Get all follow-ups, optionally filtered by type, status, or priority",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Filter follow-ups by type",
          enum: ["HUMAN_AGENT", "AI_AGENT"],
        },
        status: {
          type: "string",
          description: "Filter follow-ups by status",
          enum: [
            "PENDING",
            "COMPLETED",
            "RESCHEDULED",
            "NO_SHOW",
            "NOT_INTERESTED",
            "DROPPED",
          ],
        },
        priority: {
          type: "string",
          description: "Filter follow-ups by priority",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        all: {
          type: "boolean",
          description: "Optional parameter to get all follow-ups",
          default: true,
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "update-follow-up",
    description: "Update a follow-up by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the follow-up to update",
        },
        status: {
          type: "string",
          description: "New status for the follow-up",
          enum: [
            "PENDING",
            "COMPLETED",
            "RESCHEDULED",
            "NO_SHOW",
            "NOT_INTERESTED",
            "DROPPED",
          ],
        },
        priority: {
          type: "string",
          description: "New priority level",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        followUpAt: {
          type: "string",
          description: "New follow-up date and time (ISO format)",
        },
        notes: {
          type: "string",
          description: "Additional notes about the follow-up",
        },
        attempts: {
          type: "number",
          description: "Number of follow-up attempts made",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-follow-up",
    description: "Delete a follow-up by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the follow-up to delete",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleCreateFollowUp(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as CreateFollowUpRequest;

    // Validate the input using Zod
    const result = CreateFollowUpSchema.safeParse(args);

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

    const { leadId, followUpAt, reason, summary, type } = result.data;

    const requestBody = {
      leadId,
      followUpAt,
      reason,
      summary,
      type,
    };

    const response = await fetch(
      `${process.env.BASE_URL}${API_ENDPOINTS.FOLLOW_UP.CREATE_FOLLOW_UP}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Failed to create follow-up: ${
              errorData.message || response.statusText
            }. Status: ${response.status}`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Follow-up created successfully for lead ID: ${leadId}`,
        },
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
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

export async function handleGetFollowUp(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetFollowUpRequest;

    // Validate the input using Zod
    const result = GetFollowUpSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get follow-up: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { id } = result.data;

    const response = await fetch(
      `${process.env.BASE_URL}${API_ENDPOINTS.FOLLOW_UP.GET_FOLLOW_UP}/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        content: [
          {
            type: "text",
            text: errorData.message || `Failed to get follow-up with ID: ${id}`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Follow-up details retrieved successfully for ID: ${id}`,
        },
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting follow-up:", error);
    return {
      content: [
        {
          type: "text",
          text: "An error occurred while getting the follow-up",
        },
      ],
    };
  }
}

export async function handleGetAllFollowUps(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetAllFollowUpsRequest;

    // Validate the input using Zod
    const result = GetAllFollowUpsSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get follow-ups: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { type, status, priority } = result.data;

    let url = `${process.env.BASE_URL}${API_ENDPOINTS.FOLLOW_UP.GET_ALL_FOLLOW_UPS}`;
    const params = new URLSearchParams();

    if (type) {
      params.append("type", type);
    }

    if (status) {
      params.append("status", status);
    }

    if (priority) {
      params.append("priority", priority);
    }

    const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;

    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        content: [
          {
            type: "text",
            text: errorData.message || "Failed to get follow-ups",
          },
        ],
      };
    }

    const data = await response.json();
    const followUps = Array.isArray(data) ? data : [data];

    return {
      content: [
        {
          type: "text",
          text: `Retrieved ${followUps.length} follow-up(s)`,
        },
        {
          type: "text",
          text: JSON.stringify(followUps, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting follow-ups:", error);
    return {
      content: [
        {
          type: "text",
          text: "An error occurred while getting the follow-ups",
        },
      ],
    };
  }
}

export async function handleUpdateFollowUp(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as UpdateFollowUpRequest;

    // Validate the input using Zod
    const result = UpdateFollowUpSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err: any) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update follow-up: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const {
      id,
      followUpAt,
      reason,
      summary,
      attempts,
      status,
      priority,
      notes,
    } = result.data;

    const updateData: Record<string, any> = {};
    if (followUpAt) updateData.followUpAt = followUpAt;
    if (reason) updateData.reason = reason;
    if (summary) updateData.summary = summary;
    if (attempts !== undefined) updateData.attempts = attempts;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;

    const response = await fetch(
      `${process.env.BASE_URL}${API_ENDPOINTS.FOLLOW_UP.UPDATE_FOLLOW_UP}/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify({
          status,
          priority,
          followUpAt,
          notes,
          attempts,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response:", errorData);
      return {
        content: [
          {
            type: "text",
            text: `Failed to update follow-up: ${
              errorData.message || response.statusText
            }. Status: ${response.status}`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Follow-up with ID ${id} updated successfully`,
        },
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error updating follow-up:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while updating the follow-up: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleDeleteFollowUp(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetFollowUpRequest;

    const result = GetFollowUpSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      console.error("Validation failed:", errorMessages);
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete follow-up: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { id } = result.data;

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.FOLLOW_UP.DELETE_FOLLOW_UP}/${id}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to delete follow-up. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error("Error response data:", errorData);
        errorMessage = `Failed to delete follow-up: ${
          errorData.message || response.statusText
        }. Status: ${response.status}`;
      } catch (e) {
        console.error("Error parsing error response:", e);
        const text = await response.text();
        errorMessage = `Failed to delete follow-up: ${
          text || response.statusText
        }. Status: ${response.status}`;
      }

      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
      };
    }

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      console.log("No JSON response body");
      responseData = { success: true, id };
    }

    return {
      content: [
        {
          type: "text",
          text: `Follow-up with ID ${id} deleted successfully`,
        },
        {
          type: "text",
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error deleting follow-up:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while deleting the follow-up: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
