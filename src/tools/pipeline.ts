import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey } from "../utils/auth.util.js";
import {
  GetPipelinesSchema,
  GetPipelineByIdSchema,
  CreatePipelineSchema,
  UpdatePipelineSchema,
  DeletePipelineSchema,
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

export const pipelineTools = [
  {
    name: "get-pipelines",
    description:
      "Get paginated pipelines for the business. Default pageSize=10. Date filters apply to createdAt. Lean default: id, name, createdAt, opportunity count.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { ...listQueryJsonSchemaProperties },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-pipeline",
    description:
      "Get a single pipeline by id, including its stages. Use get-stages for a paginated stage list.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Pipeline id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-pipeline",
    description: "Create a new pipeline for the business.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Pipeline name" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update-pipeline",
    description: "Update a pipeline's name by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Pipeline id to update" },
        name: { type: "string", description: "New pipeline name" },
      },
      required: ["id", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-pipeline",
    description:
      "Delete a pipeline by id. Cascades to its stages and opportunities.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Pipeline id to delete" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleGetPipelines(request: CallToolRequest) {
  try {
    const result = GetPipelinesSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get pipelines: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = appendListQueryToUrl(
      `${process.env.BASE_URL}${API_ENDPOINTS.PIPELINE.GET_PIPELINES}`,
      result.data
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
          { type: "text", text: `Failed to get pipelines: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText("Pipelines", "pipelines", data as Record<string, unknown>),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-pipelines: ${msg}` }],
    };
  }
}

export async function handleGetPipeline(request: CallToolRequest) {
  try {
    const result = GetPipelineByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get pipeline: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.PIPELINE.GET_PIPELINE_BY_ID}/${result.data.id}`;
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
          { type: "text", text: `Failed to get pipeline: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Pipeline: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-pipeline: ${msg}` }],
    };
  }
}

export async function handleCreatePipeline(request: CallToolRequest) {
  try {
    const result = CreatePipelineSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to create pipeline: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.PIPELINE.CREATE_PIPELINE}`;
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
          { type: "text", text: `Failed to create pipeline: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Created pipeline: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute create-pipeline: ${msg}` }],
    };
  }
}

export async function handleUpdatePipeline(request: CallToolRequest) {
  try {
    const result = UpdatePipelineSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to update pipeline: ${formatZodErrors(result)}` },
        ],
      };
    }

    const { id, name } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.PIPELINE.UPDATE_PIPELINE}/${id}`;
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
          { type: "text", text: `Failed to update pipeline: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Updated pipeline: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute update-pipeline: ${msg}` }],
    };
  }
}

export async function handleDeletePipeline(request: CallToolRequest) {
  try {
    const result = DeletePipelineSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to delete pipeline: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.PIPELINE.DELETE_PIPELINE}/${result.data.id}`;
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
          { type: "text", text: `Failed to delete pipeline: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Deleted pipeline: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute delete-pipeline: ${msg}` }],
    };
  }
}
