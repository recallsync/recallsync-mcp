import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  GetCallsSchema,
  GetCallByIdSchema,
  CreateCallSchema,
  UpdateCallSchema,
} from "../schema/tool.js";
import { listQueryJsonSchemaProperties } from "../schema/list-query.js";
import {
  appendListQueryToUrl,
  formatPaginatedListText,
} from "../utils/list-query.util.js";

function formatZodErrors(result: { success: false; error: { errors: { path: (string | number)[]; message: string }[] } }) {
  return result.error.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ");
}

export const callTools = [
  {
    name: "get-calls",
    description:
      "Get paginated call (LeadCall) records for the business. Filter by leadId or campaignId. Default pageSize=10. Date filters apply to createdAt. Lean default: id, callId, type, callType, result, callStat, endedReason, callDuration, totalCost, leadId, campaignId, createdAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Filter calls by lead id" },
        campaignId: {
          type: "string",
          description: "Filter calls by campaign id",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-call",
    description: "Get a single call (LeadCall) record by id, including transcript and summary.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Call id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-call",
    description:
      "Create a call (LeadCall) record for a lead. Records call metadata/outcome; it does not place a phone call.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Lead id this call belongs to" },
        type: {
          type: "string",
          enum: ["INBOUND", "OUTBOUND", "WEB"],
          description: "Call direction/type",
        },
        callId: { type: "string", description: "Provider call id" },
        endedReason: {
          type: "string",
          description: "Reason the call ended (CALL_END_REASON value)",
        },
        result: {
          type: "string",
          description: "Call result (CALL_RESULT value)",
        },
        transcript: { description: "Call transcript (any JSON)" },
        summary: { type: "string", description: "Call summary" },
        notes: { type: "string", description: "Notes" },
        audioUrl: { type: "string", description: "Recording URL" },
        callType: {
          type: "string",
          enum: ["GLOBAL", "CAMPAIGN"],
          description: "Whether the call is global or campaign-scoped",
        },
        callDuration: { type: "number", description: "Duration in seconds" },
        costVoiceAi: { type: "number", description: "Voice AI cost" },
        costTelephony: { type: "number", description: "Telephony cost" },
        totalCost: { type: "number", description: "Total call cost" },
        campaignId: {
          type: "string",
          description: "Campaign id (required when callType is CAMPAIGN)",
        },
      },
      required: ["leadId", "type", "callId", "endedReason", "result"],
      additionalProperties: false,
    },
  },
  {
    name: "update-call",
    description: "Update a call (LeadCall) record by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Call id to update" },
        type: { type: "string", enum: ["INBOUND", "OUTBOUND", "WEB"] },
        callId: { type: "string" },
        endedReason: { type: "string" },
        result: { type: "string" },
        transcript: {},
        summary: { type: "string" },
        notes: { type: "string" },
        audioUrl: { type: "string" },
        callType: { type: "string", enum: ["GLOBAL", "CAMPAIGN"] },
        callDuration: { type: "number" },
        costVoiceAi: { type: "number" },
        costTelephony: { type: "number" },
        totalCost: { type: "number" },
        campaignId: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleGetCalls(request: CallToolRequest) {
  try {
    const result = GetCallsSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get calls: ${formatZodErrors(result)}` },
        ],
      };
    }

    const { leadId, campaignId, ...listArgs } = result.data;
    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.CALL.GET_CALLS}`,
      listArgs,
      { leadId, campaignId }
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
          { type: "text", text: `Failed to get calls: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText("Calls", "calls", data as Record<string, unknown>),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-calls: ${msg}` }],
    };
  }
}

export async function handleGetCall(request: CallToolRequest) {
  try {
    const result = GetCallByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get call: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CALL.GET_CALL_BY_ID}/${result.data.id}`;
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
          { type: "text", text: `Failed to get call: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Call: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-call: ${msg}` }],
    };
  }
}

export async function handleCreateCall(request: CallToolRequest) {
  try {
    const result = CreateCallSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to create call: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CALL.CREATE_CALL}`;
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
          { type: "text", text: `Failed to create call: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Created call: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute create-call: ${msg}` }],
    };
  }
}

export async function handleUpdateCall(request: CallToolRequest) {
  try {
    const result = UpdateCallSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to update call: ${formatZodErrors(result)}` },
        ],
      };
    }

    const { id, ...rest } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CALL.UPDATE_CALL}/${id}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(rest),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: `Failed to update call: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Updated call: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute update-call: ${msg}` }],
    };
  }
}
