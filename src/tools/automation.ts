import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey } from "../utils/auth.util.js";
import {
  GetAutomationsSchema,
  GetAutomationSchema,
  CreateAutomationSchema,
  UpdateAutomationSchema,
} from "../schema/tool.js";

export const automationTools = [
  {
    name: "get-automations",
    description:
      "Get all automations for the business (optionally filtered by status). An automation is a React-Flow outbound cadence (e.g. email -> wait -> email) bound to a primary agent; a lead reply terminates the running sequence.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "PAUSED", "TERMINATED", "COMPLETED", "FAILED"],
          description: "Optional status filter",
        },
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

    const queryParams = new URLSearchParams();
    if (result.data.status) queryParams.append("status", result.data.status);
    const qs = queryParams.toString();
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.AUTOMATION.GET_AUTOMATIONS}${
      qs ? `?${qs}` : ""
    }`;

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
    const automations = data.automations || data;

    if (Array.isArray(automations) && automations.length > 0) {
      const formatted = automations
        .map((a: any) => {
          const stepCount = Array.isArray(a?.flow?.nodes)
            ? a.flow.nodes.filter((n: any) => n.type !== "trigger").length
            : 0;
          return `- ${a.name || "Unnamed Automation"} (ID: ${a.id})${
            a.status ? ` - Status: ${a.status}` : ""
          }${a.primaryAgentId ? ` - PrimaryAgent: ${a.primaryAgentId}` : ""} - ${stepCount} step(s)`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${automations.length} automations:\n${formatted}`,
          },
        ],
      };
    } else if (Array.isArray(automations) && automations.length === 0) {
      return {
        content: [{ type: "text", text: "No automations found for this business." }],
      };
    } else {
      return {
        content: [
          { type: "text", text: `Automations: ${JSON.stringify(automations)}` },
        ],
      };
    }
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
