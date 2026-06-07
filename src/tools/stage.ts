import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey } from "../utils/auth.util.js";
import {
  GetStagesSchema,
  GetStageByIdSchema,
  CreateStageSchema,
  UpdateStageSchema,
  DeleteStageSchema,
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

export const stageTools = [
  {
    name: "get-stages",
    description:
      "Get paginated stages for a pipeline, ordered by position (order asc). Requires pipelineId. Default pageSize=10. Date filters apply to createdAt. Lean default: id, name, order, pipelineId, createdAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        pipelineId: {
          type: "string",
          description: "Pipeline id to list stages for",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: ["pipelineId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-stage",
    description: "Get a single stage by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Stage id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-stage",
    description:
      "Create a new stage in a pipeline. Order is auto-assigned as the next position.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Stage name" },
        pipelineId: { type: "string", description: "Pipeline id to add the stage to" },
      },
      required: ["name", "pipelineId"],
      additionalProperties: false,
    },
  },
  {
    name: "update-stage",
    description: "Update a stage's name by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Stage id to update" },
        name: { type: "string", description: "New stage name" },
      },
      required: ["id", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-stage",
    description:
      "Delete a stage by id. Cascades to opportunities in that stage.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Stage id to delete" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleGetStages(request: CallToolRequest) {
  try {
    const result = GetStagesSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get stages: ${formatZodErrors(result)}` },
        ],
      };
    }

    const { pipelineId, ...listArgs } = result.data;
    const url = appendListQueryToUrl(
      `${process.env.BASE_URL}${API_ENDPOINTS.STAGE.GET_STAGES}`,
      listArgs,
      { pipelineId }
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
          { type: "text", text: `Failed to get stages: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText("Stages", "stages", data as Record<string, unknown>),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-stages: ${msg}` }],
    };
  }
}

export async function handleGetStage(request: CallToolRequest) {
  try {
    const result = GetStageByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get stage: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.STAGE.GET_STAGE_BY_ID}/${result.data.id}`;
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
          { type: "text", text: `Failed to get stage: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Stage: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-stage: ${msg}` }],
    };
  }
}

export async function handleCreateStage(request: CallToolRequest) {
  try {
    const result = CreateStageSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to create stage: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.STAGE.CREATE_STAGE}`;
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
          { type: "text", text: `Failed to create stage: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Created stage: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute create-stage: ${msg}` }],
    };
  }
}

export async function handleUpdateStage(request: CallToolRequest) {
  try {
    const result = UpdateStageSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to update stage: ${formatZodErrors(result)}` },
        ],
      };
    }

    const { id, name } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.STAGE.UPDATE_STAGE}/${id}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: `Failed to update stage: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Updated stage: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute update-stage: ${msg}` }],
    };
  }
}

export async function handleDeleteStage(request: CallToolRequest) {
  try {
    const result = DeleteStageSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to delete stage: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.STAGE.DELETE_STAGE}/${result.data.id}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: `Failed to delete stage: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Deleted stage: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute delete-stage: ${msg}` }],
    };
  }
}
