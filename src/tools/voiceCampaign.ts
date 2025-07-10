import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  FindVoiceLeadSchema,
  FindVoiceLeadRequest,
  AddLeadToCampaignSchema,
  AddLeadToCampaignRequest,
  GetVoiceLeadSchema,
  GetVoiceLeadRequest,
  UpdateCampaignStatusSchema,
  UpdateCampaignStatusRequest,
  FindLeadToCallSchema,
  FindLeadToCallRequest,
  GetAllVoiceCampaignsSchema,
  GetAllVoiceCampaignsRequest,
} from "../schema/tool.js";

export const voiceCampaignTools = [
  {
    name: "find-voice-lead",
    description: "Find a lead by email or phone number for voice campaigns",
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
    name: "add-lead-to-campaign",
    description: "Add a lead to a voice campaign",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "ID of the voice campaign",
        },
        leadId: {
          type: "string",
          description: "ID of the lead to add",
        },
      },
      required: ["campaignId", "leadId"],
    },
  },
  {
    name: "get-voice-lead",
    description: "Get details of a specific lead in a voice campaign",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to retrieve",
        },
      },
      required: ["leadId"],
    },
  },
  {
    name: "update-campaign-status",
    description: "Update the status of a voice campaign",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "ID of the voice campaign",
        },
        status: {
          type: "string",
          description: "New status for the campaign",
        },
      },
      required: ["campaignId", "status"],
    },
  },
  {
    name: "find-lead-to-call",
    description: "Find a lead to call in a voice campaign",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "ID of the voice campaign",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get-all-voice-campaigns",
    description:
      "Get all voice campaigns, the query could be 'get all campaigns' as well",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        all: {
          type: "boolean",
          description: "Optional parameter to get all campaigns",
          default: true,
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
];

export async function handleFindVoiceLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as FindVoiceLeadRequest;

    // Validate the input using Zod
    const result = FindVoiceLeadSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to find voice lead: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { email, phone } = result.data;
    const queryParams = new URLSearchParams();
    if (email) queryParams.append("email", email);
    if (phone) queryParams.append("phone", phone);

    const url = `${process.env.BASE_URL}${
      API_ENDPOINTS.VOICE_CAMPAIGN.FIND_LEAD
    }?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: "Successfully found voice lead",
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to find voice lead: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleAddLeadToCampaign(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as AddLeadToCampaignRequest;

    // Validate the input using Zod
    const result = AddLeadToCampaignSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
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
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.VOICE_CAMPAIGN.ADD_LEAD_TO_CAMPAIGN}/${campaignId}/add-lead/${leadId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: "Successfully added lead to campaign",
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to add lead to campaign: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleGetVoiceLead(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetVoiceLeadRequest;

    // Validate the input using Zod
    const result = GetVoiceLeadSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get voice lead: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { leadId } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.VOICE_CAMPAIGN.GET_LEAD_BY_ID}/${leadId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: "Successfully retrieved voice lead",
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get voice lead: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleUpdateCampaignStatus(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as UpdateCampaignStatusRequest;

    // Validate the input using Zod
    const result = UpdateCampaignStatusSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
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
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.VOICE_CAMPAIGN.UPDATE_CAMPAIGN_STATUS}/${campaignId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: "Successfully updated campaign status",
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to update campaign status: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleFindLeadToCall(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as FindLeadToCallRequest;

    // Validate the input using Zod
    const result = FindLeadToCallSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
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
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.VOICE_CAMPAIGN.FIND_LEAD_TO_CALL}/${campaignId}/find`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: "Successfully found lead to call",
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to find lead to call: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleGetAllVoiceCampaigns(request: CallToolRequest) {
  try {
    const args = request.params
      .arguments as unknown as GetAllVoiceCampaignsRequest;

    // Validate the input using Zod
    const result = GetAllVoiceCampaignsSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get voice campaigns: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.VOICE_CAMPAIGN.GET_ALL_CAMPAIGNS}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const campaigns = data.campaigns || data;

    // Format the response in a more readable way
    if (Array.isArray(campaigns) && campaigns.length > 0) {
      const formattedCampaigns = campaigns
        .map((campaign: any) => {
          return `- ${campaign.name || "Unnamed Campaign"} (ID: ${
            campaign.id
          })${campaign.status ? ` - Status: ${campaign.status}` : ""}${
            campaign.description
              ? ` - Description: ${campaign.description}`
              : ""
          }`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${campaigns.length} voice campaigns:\n${formattedCampaigns}`,
          },
        ],
      };
    } else if (Array.isArray(campaigns) && campaigns.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No voice campaigns found in the system.",
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
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get voice campaigns: ${error.message}`,
        },
      ],
    };
  }
}
