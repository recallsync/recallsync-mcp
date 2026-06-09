import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  FindCampaignLeadSchema,
  FindCampaignLeadRequest,
  AddLeadToCampaignSchema,
  AddLeadToCampaignRequest,
  GetCampaignLeadSchema,
  GetCampaignLeadRequest,
  GetCampaignLeadsSchema,
  GetCampaignLeadsRequest,
  RemoveLeadFromCampaignSchema,
  RemoveLeadFromCampaignRequest,
  UpdateCampaignStatusSchema,
  UpdateCampaignStatusRequest,
  UpdateCampaignLeadSchema,
  UpdateCampaignLeadRequest,
  DeleteCampaignSchema,
  DeleteCampaignRequest,
  FindLeadToCallSchema,
  FindLeadToCallRequest,
  GetAllCampaignsSchema,
  GetAllCampaignsRequest,
  GetCampaignSchema,
  GetCampaignRequest,
  CreateCampaignSchema,
  CreateCampaignRequest,
  UpdateCampaignSchema,
  UpdateCampaignRequest,
  ConfigureCampaignSettingsSchema,
  ConfigureCampaignSettingsRequest,
} from "../schema/tool.js";
import {
  listQueryJsonSchemaProperties,
  paginationSelectJsonSchemaProperties,
} from "../schema/list-query.js";
import {
  appendListQueryToUrl,
  formatPaginatedListText,
} from "../utils/list-query.util.js";

export const campaignTools = [
  {
    name: "get-all-campaigns",
    description:
      "Get paginated campaigns for the business. Default pageSize=10; use 50 or 100 when the user asks for more. Optional status filter. Date filters apply to createdAt. Lean default: id, name, status, primaryAgentId, automationId, settingsUpdated, createdAt, updatedAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "TESTING", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"],
          description: "Optional status filter",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-campaign",
    description:
      "Get a single campaign by id (name, description, status, schedule, retry policy, concurrency, bound primaryAgentId). Use this to pull current config before editing.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "create-campaign",
    description:
      "Create a campaign for the business. Campaigns are created in DRAFT (or TESTING). Activation (ACTIVE) is a separate, explicit step via update-campaign-status. After creating, bind a primary agent + schedule with configure-campaign-settings.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name" },
        description: { type: "string", description: "Campaign description" },
        automationId: {
          type: ["string", "null"],
          description:
            "Optional automation cadence to associate with the campaign. Must belong to the same business.",
        },
        status: {
          type: "string",
          enum: ["DRAFT", "TESTING"],
          description: "Initial status (default DRAFT)",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update-campaign",
    description:
      "Update a campaign's name, description, and/or status (DRAFT|TESTING only). Lifecycle changes (ACTIVE/PAUSED) use update-campaign-status.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
        name: { type: "string", description: "New name" },
        description: { type: "string", description: "New description" },
        automationId: {
          type: ["string", "null"],
          description:
            "Optional automation cadence to associate with the campaign. Use null to clear.",
        },
        status: {
          type: "string",
          enum: ["DRAFT", "TESTING"],
          description: "New status (configuration only)",
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "configure-campaign-settings",
    description:
      "Configure a campaign's settings: bind it to a primary agent (the main binding), and set timezone, retry policy, concurrency, and weekly schedule. Marks the campaign's settings as updated (required before it can be activated). Only the fields you pass are changed (primaryAgentId is always required).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
        primaryAgentId: {
          type: "string",
          description:
            "Primary agent that runs this campaign (must belong to the business). This is the main thing a campaign binds to.",
        },
        timeZone: {
          type: "string",
          description: "IANA/abbrev timezone (e.g. IST, UTC, EST)",
        },
        withRetries: {
          type: "boolean",
          description: "Whether the campaign retries unreached leads",
        },
        maxRetryAttempts: {
          type: "number",
          description: "Max retry attempts (1-10)",
        },
        retryInterval: {
          type: "number",
          description: "Retry interval value (1-30)",
        },
        retryIntervalType: {
          type: "string",
          enum: ["hour", "day"],
          description: "Unit for retryInterval",
        },
        concurrentCalls: {
          type: "number",
          description: "Concurrent calls/conversations (1-10)",
        },
        automationId: {
          type: ["string", "null"],
          description:
            "Optional automation cadence to run with this campaign. Must belong to the selected primary agent. Use null to clear.",
        },
        channels: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "EMAIL",
              "SMS",
              "WHATSAPP",
              "FACEBOOK",
              "INSTAGRAM",
              "LIVE_CHAT",
              "VOICE_CALL",
              "WP_VOICE_CALL",
              "NONE",
            ],
          },
          description:
            "Channels to start on triggerAgent. 'NONE' = no channel agents. Omit/null uses agent default behavior.",
        },
        assistantIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional assistant ids to attach to the campaign",
        },
        weeklySchedule: {
          type: "object",
          description:
            "Weekly schedule: { monday..sunday: { enabled: boolean, timeSlots: [{ startTime: 'HH:MM', endTime: 'HH:MM' }] } }",
        },
      },
      required: ["campaignId", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "update-campaign-status",
    description:
      "Update the lifecycle status of a campaign (DRAFT, TESTING, ACTIVE, PAUSED, COMPLETED, FAILED). Activating (ACTIVE) requires the campaign's settings to be configured first, and should only be done with explicit approval.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
        status: {
          type: "string",
          enum: ["DRAFT", "TESTING", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"],
          description: "New status for the campaign",
        },
      },
      required: ["campaignId", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "update-campaign-lead",
    description:
      "Update a campaign lead's status. Use the CampaignLead id (not the Lead id).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignLeadId: {
          type: "string",
          description: "ID of the CampaignLead row to update",
        },
        status: {
          type: "string",
          enum: ["PENDING", "RETRYING", "IN_PROGRESS", "COMPLETED", "FAILED"],
          description: "New campaign-lead status",
        },
      },
      required: ["campaignLeadId", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-campaign",
    description:
      "Delete a campaign by id. The server refuses deletion if the campaign still has leads.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "find-campaign-lead",
    description: "Find a campaign lead by email or phone number",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address of the lead" },
        phone: { type: "string", description: "Phone number of the lead" },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "add-lead-to-campaign",
    description: "Add a lead to a campaign",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
        leadId: { type: "string", description: "ID of the lead to add" },
      },
      required: ["campaignId", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-campaign-lead",
    description: "Get details of a specific lead in a campaign",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "ID of the lead to retrieve" },
      },
      required: ["leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-campaign-leads",
    description:
      "Get paginated leads in a campaign. Default pageSize=10; use 50 or 100 when the user asks for more. Lean default includes campaign-lead fields plus lean Lead (id, name, email, phone, status). No date filters (CampaignLead has no createdAt).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
        withoutWorkingHoursCheck: {
          type: "boolean",
          description:
            "Skip working-hours guard (default true for listing all leads)",
        },
        ...paginationSelectJsonSchemaProperties,
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "remove-lead-from-campaign",
    description: "Remove a lead from a campaign (does not delete the lead record)",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
        leadId: { type: "string", description: "ID of the lead to remove" },
      },
      required: ["campaignId", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "find-lead-to-call",
    description:
      "Find the next lead to contact in a campaign (respects the campaign schedule and status)",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID of the campaign" },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
];

function errorText(prefix: string, response: Response): Promise<string> {
  return response
    .json()
    .then((body: any) => {
      if (body?.message) return `${prefix}: ${body.message}`;
      if (body?.error) return `${prefix}: ${JSON.stringify(body.error)}`;
      return `${prefix}: ${response.statusText}`;
    })
    .catch(() => `${prefix}: ${response.statusText}`);
}

export async function handleGetAllCampaigns(request: CallToolRequest) {
  try {
    const result = GetAllCampaignsSchema.safeParse(
      request.params.arguments ?? {}
    );
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get campaigns: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.GET_ALL_CAMPAIGNS}`,
      result.data,
      { status: result.data.status }
    );

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to get campaigns", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText(
            "Campaigns",
            "campaigns",
            data as Record<string, unknown>
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to get campaigns: ${error.message}` },
      ],
    };
  }
}

export async function handleGetCampaign(request: CallToolRequest) {
  try {
    const result = GetCampaignSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get campaign: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.GET_CAMPAIGN_BY_ID}/${campaignId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to get campaign", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Campaign: ${JSON.stringify(data)}` }],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to get campaign: ${error.message}` },
      ],
    };
  }
}

export async function handleCreateCampaign(request: CallToolRequest) {
  try {
    const result = CreateCampaignSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create campaign: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.CREATE_CAMPAIGN}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to create campaign", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully created campaign: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to create campaign: ${error.message}` },
      ],
    };
  }
}

export async function handleUpdateCampaign(request: CallToolRequest) {
  try {
    const result = UpdateCampaignSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update campaign: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId, ...updateFields } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.UPDATE_CAMPAIGN}/${campaignId}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateFields),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to update campaign", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully updated campaign: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to update campaign: ${error.message}` },
      ],
    };
  }
}

export async function handleConfigureCampaignSettings(request: CallToolRequest) {
  try {
    const result = ConfigureCampaignSettingsSchema.safeParse(
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
            text: `Failed to configure campaign settings: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId, ...settings } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.CONFIGURE_SETTINGS}/${campaignId}/settings`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: await errorText("Failed to configure campaign settings", response),
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully configured campaign settings: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to configure campaign settings: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleFindCampaignLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as FindCampaignLeadRequest;
    const result = FindCampaignLeadSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to find campaign lead: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { email, phone } = result.data;
    const queryParams = new URLSearchParams();
    if (email) queryParams.append("email", email);
    if (phone) queryParams.append("phone", phone);

    const url = `${getBaseUrl(request)}${
      API_ENDPOINTS.CAMPAIGN.FIND_LEAD
    }?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to find campaign lead", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Campaign lead: ${JSON.stringify(data)}` }],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to find campaign lead: ${error.message}` },
      ],
    };
  }
}

export async function handleAddLeadToCampaign(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as AddLeadToCampaignRequest;
    const result = AddLeadToCampaignSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to add lead to campaign: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId, leadId } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.ADD_LEAD_TO_CAMPAIGN}/${campaignId}/add-lead/${leadId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to add lead to campaign", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully added lead to campaign: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to add lead to campaign: ${error.message}` },
      ],
    };
  }
}

export async function handleGetCampaignLeads(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetCampaignLeadsRequest;
    const result = GetCampaignLeadsSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get campaign leads: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId, withoutWorkingHoursCheck = true } = result.data;
    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.GET_CAMPAIGN_LEADS}/${campaignId}/leads`,
      result.data,
      {
        withoutWorkingHoursCheck: withoutWorkingHoursCheck ? "true" : "false",
      }
    );

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to get campaign leads", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText(
            "Campaign leads",
            "leads",
            data as Record<string, unknown>
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to get campaign leads: ${error.message}` },
      ],
    };
  }
}

export async function handleRemoveLeadFromCampaign(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as RemoveLeadFromCampaignRequest;
    const result = RemoveLeadFromCampaignSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to remove lead from campaign: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId, leadId } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.REMOVE_LEAD_FROM_CAMPAIGN}/${campaignId}/lead/${leadId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: await errorText("Failed to remove lead from campaign", response),
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully removed lead from campaign: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to remove lead from campaign: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleGetCampaignLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetCampaignLeadRequest;
    const result = GetCampaignLeadSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get campaign lead: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { leadId } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.GET_LEAD_BY_ID}/${leadId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to get campaign lead", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Campaign lead: ${JSON.stringify(data)}` }],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to get campaign lead: ${error.message}` },
      ],
    };
  }
}

export async function handleUpdateCampaignStatus(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as UpdateCampaignStatusRequest;
    const result = UpdateCampaignStatusSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update campaign status: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId, status } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.UPDATE_CAMPAIGN_STATUS}/${campaignId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to update campaign status", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully updated campaign status: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to update campaign status: ${error.message}` },
      ],
    };
  }
}

export async function handleUpdateCampaignLead(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as UpdateCampaignLeadRequest;
    const result = UpdateCampaignLeadSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update campaign lead: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignLeadId, status } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.UPDATE_CAMPAIGN_LEAD}/${campaignLeadId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: await errorText("Failed to update campaign lead", response),
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated campaign lead: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to update campaign lead: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleDeleteCampaign(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as DeleteCampaignRequest;
    const result = DeleteCampaignSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete campaign: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.DELETE_CAMPAIGN}/${campaignId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: await errorText("Failed to delete campaign", response),
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted campaign: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to delete campaign: ${error.message}` },
      ],
    };
  }
}

export async function handleFindLeadToCall(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as FindLeadToCallRequest;
    const result = FindLeadToCallSchema.safeParse(args);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to find lead to call: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { campaignId } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CAMPAIGN.FIND_LEAD_TO_CALL}/${campaignId}/find`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to find lead to call", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Lead to call: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to find lead to call: ${error.message}` },
      ],
    };
  }
}
