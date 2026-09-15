import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  CreateNoteSchema,
  DeleteNoteSchema,
  GetNoteByIdSchema,
  ListNotesSchema,
  UpdateNoteSchema,
  UpdateNoteStatusSchema,
} from "../schema/tool.js";
import { listQueryJsonSchemaProperties } from "../schema/list-query.js";
import {
  appendListQueryToUrl,
  formatPaginatedListText,
} from "../utils/list-query.util.js";

function formatZodErrors(result: {
  success: false;
  error: { errors: { path: (string | number)[]; message: string }[] };
}) {
  return result.error.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ");
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
      const json = JSON.parse(text) as { message?: string };
      return json.message ?? text;
    }
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

export const noteTools = [
  {
    name: "list-notes",
    description:
      "List paginated notes for a lead or an opportunity (exactly one of leadId or opportunityId). Default pageSize=10. Date filters apply to createdAt. Lean default includes id, note, kind, status, dueAt, completedAt, leadId, opportunityId, createdAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "Lead id (mutually exclusive with opportunityId)",
        },
        opportunityId: {
          type: "string",
          description: "Opportunity id (mutually exclusive with leadId)",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-note",
    description: "Get a single note by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-note",
    description:
      "Create a note on a lead or opportunity. kind INFO (default) or ACTION; dueAt only for ACTION.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Lead id (XOR opportunityId)" },
        opportunityId: {
          type: "string",
          description: "Opportunity id (XOR leadId)",
        },
        note: { type: "string", description: "Note body" },
        kind: {
          type: "string",
          enum: ["INFO", "ACTION"],
          description: "Note kind. Default INFO.",
        },
        dueAt: {
          type: "string",
          description: "ISO due date for ACTION notes only",
        },
      },
      required: ["note"],
      additionalProperties: false,
    },
  },
  {
    name: "update-note",
    description:
      "Update note content, kind, or dueAt by id. Partial updates; at least one field required.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note id" },
        note: { type: "string", description: "New body" },
        kind: { type: "string", enum: ["INFO", "ACTION"] },
        dueAt: {
          type: "string",
          description: "ISO due date (ACTION only); pass null to clear",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "update-note-status",
    description:
      "Set status on an ACTION note (PENDING, IN_PROGRESS, COMPLETED, SKIPPED).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note id" },
        status: {
          type: "string",
          enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"],
        },
      },
      required: ["id", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-note",
    description: "Delete a note by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleListNotes(request: CallToolRequest) {
  try {
    const result = ListNotesSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to list notes: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { leadId, opportunityId, ...listArgs } = result.data;
    const listBase = leadId
      ? `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.LIST_FOR_LEAD(leadId)}`
      : `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.LIST_FOR_OPPORTUNITY(opportunityId!)}`;

    const url = appendListQueryToUrl(listBase, listArgs);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to list notes: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText("Notes", "notes", data as Record<string, unknown>),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute list-notes: ${msg}` }],
    };
  }
}

export async function handleGetNote(request: CallToolRequest) {
  try {
    const result = GetNoteByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get note: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.BY_ID(result.data.id)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get note: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Note:\n${JSON.stringify(data, null, 2)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-note: ${msg}` }],
    };
  }
}

export async function handleCreateNote(request: CallToolRequest) {
  try {
    const result = CreateNoteSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create note: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { leadId, opportunityId, note, kind, dueAt } = result.data;
    const url = leadId
      ? `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.LIST_FOR_LEAD(leadId)}`
      : `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.LIST_FOR_OPPORTUNITY(opportunityId!)}`;

    const body: Record<string, unknown> = { note };
    if (kind) body.kind = kind;
    if (dueAt !== undefined) body.dueAt = dueAt;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create note: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Created note ${data.id}:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute create-note: ${msg}` }],
    };
  }
}

export async function handleUpdateNote(request: CallToolRequest) {
  try {
    const result = UpdateNoteSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { id, ...patch } = result.data;
    const body: Record<string, unknown> = {};
    if (patch.note !== undefined) body.note = patch.note;
    if (patch.kind !== undefined) body.kind = patch.kind;
    if (patch.dueAt !== undefined) body.dueAt = patch.dueAt;

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.BY_ID(id)}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Updated note ${id}:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute update-note: ${msg}` }],
    };
  }
}

export async function handleUpdateNoteStatus(request: CallToolRequest) {
  try {
    const result = UpdateNoteStatusSchema.safeParse(
      request.params.arguments ?? {}
    );
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note status: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.STATUS(result.data.id)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify({ status: result.data.status }),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note status: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Note status updated:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute update-note-status: ${msg}` },
      ],
    };
  }
}

export async function handleDeleteNote(request: CallToolRequest) {
  try {
    const result = DeleteNoteSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete note: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.NOTE.BY_ID(result.data.id)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete note: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text", text: `Deleted note ${result.data.id}.` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute delete-note: ${msg}` }],
    };
  }
}
