import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  CreateMeetingSchema,
  CreateMeetingRequest,
  UpdateMeetingSchema,
  UpdateMeetingRequest,
  UpdateMeetingByLeadSchema,
  UpdateMeetingByLeadRequest,
  UpdateMeetingStatusSchema,
  UpdateMeetingStatusRequest,
  UpdateOverdueNoShowSchema,
  UpdateOverdueNoShowRequest,
  GetUpcomingMeetingsByLeadSchema,
} from "../schema/tool.js";
import { listQueryJsonSchemaProperties } from "../schema/list-query.js";
import {
  appendListQueryToUrl,
  formatPaginatedListText,
} from "../utils/list-query.util.js";

export const meetingTools = [
  {
    name: "create-meeting",
    description: "Create a new meeting in the system",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead for the meeting",
        },
        calMeetingID: {
          type: "number",
          description: "Calendar Meeting ID",
        },
        calMeetingUID: {
          type: "string",
          description: "Calendar Meeting UID",
        },
        startTime: {
          type: "string",
          description: "Start time of the meeting (ISO format)",
        },
        messageOfLead: {
          type: "string",
          description: "Message from the lead",
        },
        meetingUrl: {
          type: "string",
          description: "URL for the meeting",
        },
      },
      required: [
        "leadId",
        "calMeetingID",
        "calMeetingUID",
        "startTime",
        "messageOfLead",
        "meetingUrl",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "get-meetings",
    description:
      "Get paginated meetings with optional filters. Default pageSize=10; use 50 or 100 when the user asks for more. Pass select for specific fields. Date filters apply to startTime.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description:
            "Optional lead ID to filter meetings for a specific lead",
        },
        status: {
          type: "string",
          description: "Optional status to filter meetings",
          enum: ["UPCOMING", "SUCCESS", "NO_SHOW", "CANCELLED", "RESCHEDULED"],
        },
        all: {
          type: "boolean",
          description: "Optional parameter to get all meetings",
          default: true,
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-meetings-by-lead",
    description: "Get meetings for a specific lead with optional status filter",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to get meetings for",
        },
        status: {
          type: "string",
          description: "Optional status to filter meetings",
          enum: ["UPCOMING", "SUCCESS", "NO_SHOW", "CANCELLED", "RESCHEDULED"],
        },
      },
      required: ["leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-meeting-by-uid",
    description: "Get meeting details by its UID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        meetingUID: {
          type: "string",
          description: "UID of the meeting to retrieve",
        },
      },
      required: ["meetingUID"],
      additionalProperties: false,
    },
  },
  {
    name: "update-meeting",
    description: "Update a meeting by its UID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        meetingUID: {
          type: "string",
          description: "UID of the meeting to update",
        },
        startTime: {
          type: "string",
          description: "New start time for the meeting (ISO format)",
        },
        status: {
          type: "string",
          description: "New status for the meeting",
          enum: ["UPCOMING", "SUCCESS", "NO_SHOW", "CANCELLED", "RESCHEDULED"],
        },
      },
      required: ["meetingUID"],
      additionalProperties: false,
    },
  },
  {
    name: "update-meeting-by-lead",
    description: "Update a meeting by lead ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead whose meeting to update",
        },
        status: {
          type: "string",
          description: "New status for the meeting",
          enum: ["UPCOMING", "SUCCESS", "NO_SHOW", "CANCELLED", "RESCHEDULED"],
        },
      },
      required: ["leadId", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "update-meeting-status",
    description: "Update a meeting's status by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        meetingId: {
          type: "string",
          description: "ID of the meeting to update",
        },
        status: {
          type: "string",
          description: "New status for the meeting",
          enum: ["UPCOMING", "SUCCESS", "NO_SHOW", "CANCELLED", "RESCHEDULED"],
        },
      },
      required: ["meetingId", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "update-overdue-no-show",
    description: "Update overdue meetings to no-show status",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        unit: {
          type: "string",
          description: "Time unit (hours, day, week)",
          enum: ["hours", "day", "week"],
          default: "hours",
        },
        amount: {
          type: "number",
          description: "Number of units",
          default: 12,
        },
        markLeadAsCold: {
          type: "boolean",
          description: "Whether to mark the lead as cold",
          default: false,
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-upcoming-meetings-by-lead",
    description:
      "Get only the UPCOMING meetings for a specific lead. Returns { meetings, hasMeeting }. Use this to check whether a lead currently has a meeting booked.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to get upcoming meetings for",
        },
      },
      required: ["leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "set-all-overdue-no-show",
    description:
      "Bulk-mark every UPCOMING meeting whose start time is more than 1 day overdue as NO_SHOW (business-wide). Takes no parameters. For a custom window or to also cool leads, use update-overdue-no-show instead.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

export async function handleCreateMeeting(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as CreateMeetingRequest;

    // Validate the input using Zod
    const result = CreateMeetingSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create meeting: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.CREATE_MEETING}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create meeting: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully created meeting: ${JSON.stringify(data)}`,
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
          text: `Failed to execute create-meeting tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetMeetings(request: CallToolRequest) {
  try {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.GET_MEETINGS}`,
      args,
      {
        leadId: args.leadId as string | undefined,
        status: args.status as string | undefined,
      }
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get meetings: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText(
            "Meetings",
            "meetings",
            data as Record<string, unknown>
          ),
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
          text: `Failed to execute get-meetings tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetMeetingsByLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as {
      leadId: string;
      status?: string;
    };

    if (!args.leadId) {
      return {
        content: [
          {
            type: "text",
            text: "Lead ID is required to get meetings",
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.GET_MEETING_BY_LEAD}/${args.leadId}`;
    const queryParams = new URLSearchParams();
    if (args.status) queryParams.append("status", args.status);

    const response = await fetch(`${url}?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get meetings for lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Retrieved meetings for lead: ${JSON.stringify(data)}`,
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
          text: `Failed to execute get-meetings-by-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateMeeting(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as UpdateMeetingRequest;

    // Validate the input using Zod
    const result = UpdateMeetingSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update meeting: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { meetingUID, ...updateData } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.UPDATE_MEETING}/${meetingUID}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update meeting: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated meeting: ${JSON.stringify(data)}`,
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
          text: `Failed to execute update-meeting tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateMeetingByLead(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as UpdateMeetingByLeadRequest;

    // Validate the input using Zod
    const result = UpdateMeetingByLeadSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update meeting: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { leadId, status } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.UPDATE_MEETING_BY_LEAD}/${leadId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update meeting: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated meeting: ${JSON.stringify(data)}`,
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
          text: `Failed to execute update-meeting-by-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateMeetingStatus(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as UpdateMeetingStatusRequest;

    // Validate the input using Zod
    const result = UpdateMeetingStatusSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update meeting status: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { meetingId, status } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.UPDATE_MEETING_STATUS}/${meetingId}`;

    const response = await fetch(`${url}?status=${status}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update meeting status: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated meeting status: ${JSON.stringify(data)}`,
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
          text: `Failed to execute update-meeting-status tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateOverdueNoShow(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as UpdateOverdueNoShowRequest;

    // Validate the input using Zod
    const result = UpdateOverdueNoShowSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update overdue meetings: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.UPDATE_OVERDUE_NO_SHOW}`;
    const queryParams = new URLSearchParams();
    if (result.data.unit) queryParams.append("unit", result.data.unit);
    if (result.data.amount)
      queryParams.append("amount", result.data.amount.toString());
    if (result.data.markLeadAsCold !== undefined) {
      queryParams.append(
        "markLeadAsCold",
        result.data.markLeadAsCold.toString()
      );
    }

    const response = await fetch(`${url}?${queryParams.toString()}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update overdue meetings: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated overdue meetings: ${JSON.stringify(
            data
          )}`,
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
          text: `Failed to execute update-overdue-no-show tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetUpcomingMeetingsByLead(request: CallToolRequest) {
  try {
    const result = GetUpcomingMeetingsByLeadSchema.safeParse(
      request.params.arguments
    );
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get upcoming meetings: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.GET_UPCOMING_BY_LEAD}/${result.data.leadId}/upcoming`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get upcoming meetings for lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Upcoming meetings for lead: ${JSON.stringify(data)}`,
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
          text: `Failed to execute get-upcoming-meetings-by-lead tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleSetAllOverdueNoShow(request: CallToolRequest) {
  try {
    // No params. REST route is PATCH /meeting/{id}; the id segment is ignored
    // server-side (setAllOverdueMeetingsNoShow is business-wide), so we pass a
    // stable placeholder.
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.MEETING.SET_ALL_OVERDUE_NO_SHOW}/all`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to set all overdue meetings as no-show: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully set all overdue meetings as no-show: ${JSON.stringify(
            data
          )}`,
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
          text: `Failed to execute set-all-overdue-no-show tool: ${errorMessage}`,
        },
      ],
    };
  }
}
