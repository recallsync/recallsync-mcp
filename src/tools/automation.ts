import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey } from "../utils/auth.util.js";
import {
  GetAutomationsSchema,
  GetAutomationSchema,
  CreateAutomationSchema,
  UpdateAutomationSchema,
  TriggerAutomationSchema,
  StopAutomationSchema,
  GetLeadAutomationSessionsSchema,
} from "../schema/tool.js";
import { listQueryJsonSchemaProperties } from "../schema/list-query.js";
import {
  appendListQueryToUrl,
  formatPaginatedListText,
} from "../utils/list-query.util.js";

export const automationTools = [
  {
    name: "get-automations",
    description:
      "Get paginated automations for the business. Default pageSize=10; use 50 or 100 when the user asks for more. Optional status filter. Date filters apply to createdAt. Lean default: id, name, description, status, primaryAgentId, createdAt, updatedAt (no flow JSON). Use get-automation for full cadence.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "PAUSED", "TERMINATED", "COMPLETED", "FAILED"],
          description: "Optional status filter",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-automation",
    description:
      "Get a single automation by id (name, description, status, bound primaryAgentId, and the React-Flow `flow` cadence). Use this to pull current config before editing.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        automationId: { type: "string", description: "ID of the automation" },
      },
      required: ["automationId"],
      additionalProperties: false,
    },
  },
  {
    name: "create-automation",
    description:
      "Create an automation (outbound multi-channel cadence) bound to a primary agent. The `flow` is React-Flow JSON: a single `trigger` node connected to a chain of step nodes (`email`, `sms`, `whatsapp`, `instagram`, `phone`) and `wait` delays, wired by `edges`. Each channel step is delivered by the bound primary agent's matching channel agent. Created in DRAFT unless a status is given.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Automation name" },
        description: { type: "string", description: "Automation description" },
        primaryAgentId: {
          type: "string",
          description:
            "Primary agent that runs this automation (must belong to the business). Its channel agents deliver each step.",
        },
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "PAUSED", "TERMINATED", "COMPLETED", "FAILED"],
          description: "Initial status (default DRAFT). ACTIVE makes it triggerable.",
        },
        flow: {
          type: "object",
          description:
            "React-Flow JSON { nodes: [...], edges: [...] }. Include one `trigger` node (id like 'trigger-1') as entry, then step nodes. Email node data: { label, description, emailSubject, messageContent, messageType: 'static'|'ai' }. Wait node data: { label, delayAmount, delayUnit: 'minute'|'hour'|'day'|'week'|'month' }.",
          properties: {
            nodes: { type: "array", items: { type: "object" } },
            edges: { type: "array", items: { type: "object" } },
          },
          required: ["nodes", "edges"],
        },
        flowSettings: {
          type: "object",
          description: "Optional React-Flow builder settings.",
        },
      },
      required: ["name", "primaryAgentId"],
      additionalProperties: false,
    },
  },
  {
    name: "update-automation",
    description:
      "Update an automation's name, description, status, and/or flow (React-Flow cadence). Only the fields you pass are changed.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        automationId: { type: "string", description: "ID of the automation" },
        name: { type: "string", description: "New name" },
        description: { type: "string", description: "New description" },
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "PAUSED", "TERMINATED", "COMPLETED", "FAILED"],
          description: "New status",
        },
        flow: {
          type: "object",
          description: "React-Flow JSON { nodes, edges } to replace the cadence.",
          properties: {
            nodes: { type: "array", items: { type: "object" } },
            edges: { type: "array", items: { type: "object" } },
          },
          required: ["nodes", "edges"],
        },
        flowSettings: { type: "object", description: "Optional builder settings." },
      },
      required: ["automationId"],
      additionalProperties: false,
    },
  },
  {
    name: "trigger-automation",
    description:
      "Start an automation cadence for a single lead. Creates the automation session and dispatches the first step through the bound primary agent's channel agents. The automation and lead must belong to the business. Use the automation's id (not the campaign id) and the lead's id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        automationId: { type: "string", description: "ID of the automation to start" },
        leadId: { type: "string", description: "ID of the lead to run the cadence for" },
      },
      required: ["automationId", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "stop-automation",
    description:
      "Stop any active automation sessions for a single lead on the automation's primary agent. Safe to call when nothing is running (reports no active sessions). The automation and lead must belong to the business.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        automationId: { type: "string", description: "ID of the automation to stop" },
        leadId: { type: "string", description: "ID of the lead whose sessions to stop" },
      },
      required: ["automationId", "leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-lead-automation-sessions",
    description:
      "List the automation run sessions for a single lead — i.e. what automations are actively running for that lead. Defaults to status=ACTIVE; pass status to query TERMINATED/COMPLETED/FAILED. NOTE: sessions key on the lead's primary agent (the schema has no automationId), so each row carries the PrimaryAgent id+name rather than a specific automation id. Paginated; date filters apply to createdAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "ID of the lead to list sessions for" },
        status: {
          type: "string",
          enum: ["ACTIVE", "TERMINATED", "COMPLETED", "FAILED"],
          description: "Session status filter (default ACTIVE)",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: ["leadId"],
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

export async function handleGetAutomations(request: CallToolRequest) {
  try {
    const result = GetAutomationsSchema.safeParse(
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
            text: `Failed to get automations: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = appendListQueryToUrl(
      `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.GET_AUTOMATIONS}`,
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
          { type: "text", text: await errorText("Failed to get automations", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText(
            "Automations",
            "automations",
            data as Record<string, unknown>
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to get automations: ${error.message}` },
      ],
    };
  }
}

export async function handleGetAutomation(request: CallToolRequest) {
  try {
    const result = GetAutomationSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get automation: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { automationId } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.GET_AUTOMATION_BY_ID}/${automationId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to get automation", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Automation: ${JSON.stringify(data)}` }],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to get automation: ${error.message}` },
      ],
    };
  }
}

export async function handleCreateAutomation(request: CallToolRequest) {
  try {
    const result = CreateAutomationSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create automation: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.CREATE_AUTOMATION}`;
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
          { type: "text", text: await errorText("Failed to create automation", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully created automation: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to create automation: ${error.message}` },
      ],
    };
  }
}

export async function handleUpdateAutomation(request: CallToolRequest) {
  try {
    const result = UpdateAutomationSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update automation: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { automationId, ...updateFields } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.UPDATE_AUTOMATION}/${automationId}`;
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
          { type: "text", text: await errorText("Failed to update automation", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully updated automation: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to update automation: ${error.message}` },
      ],
    };
  }
}

export async function handleTriggerAutomation(request: CallToolRequest) {
  try {
    const result = TriggerAutomationSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to trigger automation: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { automationId, leadId } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.TRIGGER_AUTOMATION}/${automationId}/trigger`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ leadId }),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to trigger automation", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully triggered automation: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to trigger automation: ${error.message}` },
      ],
    };
  }
}

export async function handleStopAutomation(request: CallToolRequest) {
  try {
    const result = StopAutomationSchema.safeParse(request.params.arguments);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to stop automation: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { automationId, leadId } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.STOP_AUTOMATION}/${automationId}/stop`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ leadId }),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: await errorText("Failed to stop automation", response) },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Successfully stopped automation: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Failed to stop automation: ${error.message}` },
      ],
    };
  }
}

export async function handleGetLeadAutomationSessions(request: CallToolRequest) {
  try {
    const result = GetLeadAutomationSessionsSchema.safeParse(
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
            text: `Failed to get lead automation sessions: ${errorMessages}. Retry again with correct tool parameters and values.`,
          },
        ],
      };
    }

    const { leadId, status, ...listArgs } = result.data;
    const url = appendListQueryToUrl(
      `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.GET_LEAD_SESSIONS}`,
      listArgs,
      { leadId, status }
    );

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey(request)}` },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: await errorText("Failed to get lead automation sessions", response),
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
            "Lead automation sessions",
            "sessions",
            data as Record<string, unknown>
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get lead automation sessions: ${error.message}`,
        },
      ],
    };
  }
}
