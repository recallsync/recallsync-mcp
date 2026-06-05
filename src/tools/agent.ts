import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey } from "../utils/auth.util.js";
import {
  CreatePrimaryAgentSchema,
  UpdatePrimaryAgentSchema,
  CreateChannelAgentSchema,
  GetChannelAgentSchema,
  UpdateChannelAgentSchema,
  DeleteChannelAgentSchema,
  SetChannelAgentToolsSchema,
  SetChannelAgentFlowDraftSchema,
  TestChannelAgentSchema,
  ClearTestConversationSchema,
  GetConversationMessagesSchema,
} from "../schema/tool.js";

// (get-test-lead takes no args, so it needs no schema import)

const primaryAgentFieldProperties = {
  description: { type: "string", description: "Short description of the agent" },
  agentGoal: { type: "string", description: "What the agent is trying to achieve" },
  goalCompleteCriteria: {
    type: "string",
    description: "How to know the agent's goal is complete",
  },
  stopScenarioDescription: {
    type: "string",
    description: "When the agent should stop / hand off",
  },
  calendarType: {
    type: "string",
    enum: ["CAL", "CALENDLY", "GHL"],
    description: "Calendar provider type",
  },
  calenderIntegrationId: {
    type: "string",
    description: "Linked CalenderIntegration id (must belong to this business)",
  },
  ghlCalendarId: { type: "string", description: "GHL calendar id" },
  nextPrimaryAgentId: {
    type: "string",
    description: "Id of the next primary agent to chain to (or null to clear)",
  },
  n8nTrainingUrl: { type: "string", description: "n8n training webhook URL" },
  n8nTrainingToken: { type: "string", description: "n8n training token" },
};

export const agentTools = [
  {
    name: "get-primary-agents",
    description:
      "Get all primary agents (RECALL type) for the business, including their channel agents",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "create-primary-agent",
    description:
      "Create a new primary agent (a wrapper that groups channel agents). Only `name` is required.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Display name of the primary agent" },
        ...primaryAgentFieldProperties,
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update-primary-agent",
    description:
      "Granularly update a primary agent by id. Only the fields you pass are changed.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Primary agent id to update" },
        name: { type: "string", description: "New display name" },
        ...primaryAgentFieldProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "list-integrations",
    description:
      "List the providers connected to this business (e.g. GHL, N8N). Use this to confirm a provider is connected before creating a channel agent that depends on it.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "create-channel-agent",
    description:
      "Create a channel agent (BaseAgent) attached to a primary agent. The provider must be allowed for the channel AND connected to the business. Defaults: baseAgentType=STANDARD, type=INTEGRATED, isActive=false (paused), prompt='' (authored & synced later).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        primaryAgentId: {
          type: "string",
          description: "Id of the primary agent to attach this channel agent to",
        },
        name: { type: "string", description: "Display name of the channel agent" },
        channel: {
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
          ],
          description: "Channel this agent serves",
        },
        provider: {
          type: "string",
          enum: [
            "VAPI",
            "TWILIO",
            "GHL",
            "HUBSPOT",
            "N8N",
            "LLM",
            "ELEVEN_LABS",
            "CARTESIA",
            "RETELL",
            "ULTRA_VOX",
            "DEEPGRAM",
            "WHATSAPP",
            "INSTAGRAM",
          ],
          description: "Delivery provider (must be connected for this business)",
        },
        description: { type: "string", description: "Short description of the agent" },
        prompt: { type: "string", description: "System prompt (defaults to empty)" },
        baseAgentType: {
          type: "string",
          enum: ["STANDARD", "RECALL", "FLOW"],
          description: "Builder type (default STANDARD)",
        },
        type: {
          type: "string",
          enum: ["INTEGRATED", "N8N", "VAPI", "ELEVEN_LABS", "RETELL", "ULTRA_VOX"],
          description: "Agent type (default INTEGRATED)",
        },
        isActive: {
          type: "boolean",
          description: "Whether the agent is active (default false / paused)",
        },
        n8nWorkflowId: {
          type: "string",
          description:
            "Required when provider is N8N. Use list-n8n-workflows to get a valid id.",
        },
      },
      required: ["primaryAgentId", "name", "channel", "provider"],
      additionalProperties: false,
    },
  },
  {
    name: "get-channel-agent",
    description:
      "Fetch a single channel agent (BaseAgent) by id, including its prompt (STANDARD), flow + currentFlow (FLOW), tools, and metadata. Use this to pull the latest live state before editing a prompt or flow, so local edits reconcile against current live values.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Channel agent (BaseAgent) id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "update-channel-agent",
    description:
      "Granularly update a channel agent (BaseAgent): activate/deactivate via isActive, rename, set description, or push the STANDARD (single-prompt) system prompt via prompt. FLOW flow-graph updates use a separate tool/SOP.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Channel agent (BaseAgent) id" },
        name: { type: "string", description: "New display name" },
        description: {
          type: ["string", "null"],
          description: "Short description (or null to clear)",
        },
        isActive: {
          type: "boolean",
          description: "Whether the channel agent is active",
        },
        prompt: {
          type: "string",
          description:
            "STANDARD (single-prompt) system prompt. Use this to push the authored channel-agent-prompt.md to a STANDARD agent. FLOW prompts live in the flow graph.",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-channel-agent",
    description:
      "Permanently delete a channel agent (BaseAgent) by id. This removes the agent and its FLOW/STANDARD config, sessions, and tool links. Conversations that used it are detached (not deleted). Irreversible — confirm with the owner first.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Channel agent (BaseAgent) id to delete" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "set-channel-agent-tools",
    description:
      "Replace the full set of HTTP tools on a STANDARD channel agent (BaseAgent). Each tool is an HTTP call the agent can make during a conversation (e.g. hand off a qualified lead). 'parameters' are filled by the LLM from the conversation and merged into the JSON body; the platform also appends leadId/baseAgentId/baseAgentChannel as query params. Sending an empty array clears all tools.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Channel agent (BaseAgent) id" },
        tools: {
          type: "array",
          description: "Full set of tools (replaces existing tools)",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Short tool identifier, e.g. handoff_qualified_lead",
              },
              description: {
                type: "string",
                description:
                  "Tells the LLM WHEN to call this tool (the trigger condition).",
              },
              serverUrl: {
                type: "string",
                description: "Endpoint to call (http/https only).",
              },
              headers: {
                type: "object",
                description: "Optional request headers (e.g. Authorization).",
                additionalProperties: { type: "string" },
              },
              parameters: {
                type: "array",
                description:
                  "Fields the LLM fills from the conversation, merged into the JSON body.",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["string", "number", "boolean"],
                    },
                    description: { type: "string" },
                    required: { type: "boolean" },
                  },
                  required: ["name"],
                  additionalProperties: false,
                },
              },
              body: {
                type: "object",
                description:
                  "Optional static JSON merged under the LLM-provided args.",
              },
            },
            required: ["name", "description", "serverUrl"],
            additionalProperties: false,
          },
        },
      },
      required: ["id", "tools"],
      additionalProperties: false,
    },
  },
  {
    name: "set-channel-agent-flow-draft",
    description:
      "Push a flow graph to a FLOW channel agent's draft (currentFlow) — the version the builder and test-channel-agent run. Pass the v2 flow object (or a full export bundle with a `flow` key); it is validated/migrated server-side. Headers/secrets in ba_http nodes are sent as-is (not stored in Git). Use publish=true to also promote the draft to the live `flow`.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Channel agent (BaseAgent) id" },
        flow: {
          type: "object",
          description:
            "The v2 flow object ({ version: 2, agentRootId, entryNodeId, nodes, edges }) or a full export bundle containing a `flow` key.",
        },
        publish: {
          type: "boolean",
          description:
            "When true, also copy the draft into the live `flow` field (default false: draft only).",
        },
      },
      required: ["id", "flow"],
      additionalProperties: false,
    },
  },
  {
    name: "list-n8n-workflows",
    description:
      "List the N8N workflows configured for this business (id + name). Use this to pick a valid n8nWorkflowId before creating an N8N channel agent.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-test-lead",
    description:
      "Get the business's designated test lead (the lead marked isTestLead), or null if none is set. Always call this before test-channel-agent; if it returns no test lead, ask the user to set one up in RecallSync.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "test-channel-agent",
    description:
      "Test a channel agent by sending a message AS the business's designated test lead. Requires a test lead to be set (use get-test-lead first). Persists the inbound + AI reply to the test lead's conversation (existing history is included) but performs NO real channel delivery (DB-only).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        baseAgentId: {
          type: "string",
          description: "Id of the channel agent (BaseAgent) to test",
        },
        message: {
          type: "string",
          description:
            "The inbound message, sent as if from the designated test lead",
        },
      },
      required: ["baseAgentId", "message"],
      additionalProperties: false,
    },
  },
  {
    name: "clear-test-conversation",
    description:
      "Clear the business's designated test lead conversation history so the next test run starts fresh (mirrors the test-chat UI 'Clear Chat'). Call this BEFORE each test-channel-agent run to avoid contamination from prior turns. Optionally pass baseAgentId to reconnect the conversation's active agent.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        baseAgentId: {
          type: "string",
          description:
            "Optional: the channel agent (BaseAgent) about to be tested; reconnects the conversation's active agent.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-conversation-messages",
    description:
      "Get all messages for a conversation (by conversationId). Useful to review a test conversation or analyze an agent's replies.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        conversationId: {
          type: "string",
          description: "Id of the conversation to fetch messages for",
        },
      },
      required: ["conversationId"],
      additionalProperties: false,
    },
  },
];

export async function handleGetPrimaryAgents(request: CallToolRequest) {
  try {
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AGENT.GET_PRIMARY_AGENTS}`;

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
            text: `Failed to get primary agents: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Primary agents: ${JSON.stringify(data)}`,
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
          text: `An error occurred while getting the primary agents: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleCreatePrimaryAgent(request: CallToolRequest) {
  try {
    const result = CreatePrimaryAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create primary agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AGENT.CREATE_PRIMARY_AGENT}`;
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
            text: `Failed to create primary agent: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully created primary agent: ${JSON.stringify(data)}`,
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
          text: `An error occurred while creating the primary agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdatePrimaryAgent(request: CallToolRequest) {
  try {
    const result = UpdatePrimaryAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update primary agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const { id, ...updateFields } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AGENT.UPDATE_PRIMARY_AGENT}/${id}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(updateFields),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update primary agent: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated primary agent: ${JSON.stringify(data)}`,
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
          text: `An error occurred while updating the primary agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleListIntegrations(request: CallToolRequest) {
  try {
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.INTEGRATION.LIST_PROVIDERS}`;

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
            text: `Failed to list integrations: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Connected providers: ${JSON.stringify(data)}`,
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
          text: `An error occurred while listing integrations: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleListN8nWorkflows(request: CallToolRequest) {
  try {
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.INTEGRATION.LIST_N8N_WORKFLOWS}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to list N8N workflows: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `N8N workflows: ${JSON.stringify(data)}`,
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
          text: `An error occurred while listing N8N workflows: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleCreateChannelAgent(request: CallToolRequest) {
  try {
    const result = CreateChannelAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create channel agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.CREATE_CHANNEL_AGENT}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      // Surface the server's validation message (e.g. provider not connected).
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to create channel agent: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully created channel agent: ${JSON.stringify(data)}`,
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
          text: `An error occurred while creating the channel agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateChannelAgent(request: CallToolRequest) {
  try {
    const result = UpdateChannelAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update channel agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const { id, ...updateFields } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.UPDATE_CHANNEL_AGENT}/${id}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(updateFields),
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to update channel agent: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated channel agent: ${JSON.stringify(data)}`,
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
          text: `An error occurred while updating the channel agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleDeleteChannelAgent(request: CallToolRequest) {
  try {
    const result = DeleteChannelAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete channel agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const { id } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.DELETE_CHANNEL_AGENT}/${id}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete channel agent: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted channel agent: ${JSON.stringify(data)}`,
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
          text: `An error occurred while deleting the channel agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleSetChannelAgentTools(request: CallToolRequest) {
  try {
    const result = SetChannelAgentToolsSchema.safeParse(
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
            text: `Failed to set channel agent tools: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const { id, tools } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.SET_CHANNEL_AGENT_TOOLS}/${id}/tools`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify({ tools }),
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to set channel agent tools: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully set channel agent tools: ${JSON.stringify(data)}`,
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
          text: `An error occurred while setting channel agent tools: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetChannelAgent(request: CallToolRequest) {
  try {
    const result = GetChannelAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get channel agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const { id } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.GET_CHANNEL_AGENT}/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to get channel agent: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Channel agent: ${JSON.stringify(data)}`,
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
          text: `An error occurred while getting the channel agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleSetChannelAgentFlowDraft(request: CallToolRequest) {
  try {
    const result = SetChannelAgentFlowDraftSchema.safeParse(
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
            text: `Failed to set channel agent flow draft: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const { id, flow, publish } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.SET_CHANNEL_AGENT_FLOW_DRAFT}/${id}/flow-draft`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify({ flow, publish }),
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to set channel agent flow draft: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully set channel agent flow draft: ${JSON.stringify(
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
          text: `An error occurred while setting the channel agent flow draft: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetTestLead(request: CallToolRequest) {
  try {
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.GET_TEST_LEAD}`;

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
            text: `Failed to get test lead: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Test lead: ${JSON.stringify(data)}`,
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
          text: `An error occurred while getting the test lead: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleTestChannelAgent(request: CallToolRequest) {
  try {
    const result = TestChannelAgentSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to test channel agent: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.TEST_CHANNEL_AGENT}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to test channel agent: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Channel agent test result: ${JSON.stringify(data)}`,
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
          text: `An error occurred while testing the channel agent: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleClearTestConversation(request: CallToolRequest) {
  try {
    const result = ClearTestConversationSchema.safeParse(
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
            text: `Failed to clear test conversation: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CHANNEL_AGENT.CLEAR_TEST_CONVERSATION}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.message) detail = errBody.message;
        else if (errBody?.error) detail = JSON.stringify(errBody.error);
      } catch {
        // keep statusText
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to clear test conversation: ${detail}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Cleared test conversation: ${JSON.stringify(data)}`,
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
          text: `An error occurred while clearing the test conversation: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetConversationMessages(request: CallToolRequest) {
  try {
    const result = GetConversationMessagesSchema.safeParse(
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
            text: `Failed to get conversation messages: ${errorMessages}. Retry with correct parameters.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.CONVERSATION.GET_MESSAGES(
      result.data.conversationId
    )}`;
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
            text: `Failed to get conversation messages: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Conversation messages: ${JSON.stringify(data)}`,
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
          text: `An error occurred while getting conversation messages: ${errorMessage}`,
        },
      ],
    };
  }
}
