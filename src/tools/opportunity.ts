import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey } from "../utils/auth.util.js";
import {
  GetOpportunitiesSchema,
  GetOpportunityByIdSchema,
  CreateOpportunitySchema,
  UpdateOpportunitySchema,
  DeleteOpportunitySchema,
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

export const opportunityTools = [
  {
    name: "get-opportunities",
    description:
      "Get paginated opportunities. Filter by pipelineId, stageId, or leadId (mutually exclusive priority: stageId > pipelineId > leadId). Default pageSize=10. Date filters apply to createdAt. Lean default: id, name, status, value, stageId, pipelineId, leadId, createdAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        pipelineId: {
          type: "string",
          description: "Optional pipeline id filter",
        },
        stageId: {
          type: "string",
          description: "Optional stage id filter (takes priority over pipelineId)",
        },
        leadId: {
          type: "string",
          description: "Optional lead id filter (used when stageId and pipelineId omitted)",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-opportunity",
    description: "Get a single opportunity by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Opportunity id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-opportunity",
    description:
      "Add a lead as an opportunity into a pipeline stage. Requires name, stageId, leadId, pipelineId. One opportunity per lead per pipeline.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Opportunity name" },
        description: { type: "string", description: "Optional description" },
        value: { type: "number", description: "Optional deal value" },
        stageId: { type: "string", description: "Stage id to place the opportunity in" },
        leadId: { type: "string", description: "Lead id" },
        pipelineId: { type: "string", description: "Pipeline id" },
      },
      required: ["name", "stageId", "leadId", "pipelineId"],
      additionalProperties: false,
    },
  },
  {
    name: "update-opportunity",
    description:
      "Update an opportunity by id. Pass stageId to move it to another stage (sets addedToStageAt and fires OPPORTUNITY_STAGE_CHANGED). Partial updates supported.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Opportunity id to update" },
        name: { type: "string", description: "New name" },
        description: { type: "string", description: "New description" },
        value: { type: "number", description: "New deal value" },
        status: {
          type: "string",
          enum: ["OPEN", "LOST", "WON", "ABANDONED"],
          description: "Opportunity status",
        },
        source: { type: "string", description: "Lead source" },
        businessName: { type: "string", description: "Business name on the deal" },
        stageId: {
          type: "string",
          description: "Move to this stage id",
        },
        leadId: { type: "string", description: "Reassign lead id" },
        pipelineId: { type: "string", description: "Reassign pipeline id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-opportunity",
    description: "Remove an opportunity from the pipeline (delete by id).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Opportunity id to delete" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleGetOpportunities(request: CallToolRequest) {
  try {
    const result = GetOpportunitiesSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get opportunities: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { pipelineId, stageId, leadId, ...listArgs } = result.data;
    const url = appendListQueryToUrl(
      `${process.env.BASE_URL}${API_ENDPOINTS.OPPORTUNITY.GET_OPPORTUNITIES}`,
      listArgs,
      { pipelineId, stageId, leadId }
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
            text: `Failed to get opportunities: ${response.statusText}`,
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
            "Opportunities",
            "opportunities",
            data as Record<string, unknown>
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute get-opportunities: ${msg}` },
      ],
    };
  }
}

export async function handleGetOpportunity(request: CallToolRequest) {
  try {
    const result = GetOpportunityByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get opportunity: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.OPPORTUNITY.GET_OPPORTUNITY_BY_ID}/${result.data.id}`;
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
            text: `Failed to get opportunity: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Opportunity: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute get-opportunity: ${msg}` },
      ],
    };
  }
}

export async function handleCreateOpportunity(request: CallToolRequest) {
  try {
    const result = CreateOpportunitySchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create opportunity: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.OPPORTUNITY.CREATE_OPPORTUNITY}`;
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
            text: `Failed to create opportunity: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Created opportunity: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute create-opportunity: ${msg}` },
      ],
    };
  }
}

export async function handleUpdateOpportunity(request: CallToolRequest) {
  try {
    const result = UpdateOpportunitySchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update opportunity: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { id, ...body } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.OPPORTUNITY.UPDATE_OPPORTUNITY}/${id}`;
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
            text: `Failed to update opportunity: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Updated opportunity: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute update-opportunity: ${msg}` },
      ],
    };
  }
}

export async function handleDeleteOpportunity(request: CallToolRequest) {
  try {
    const result = DeleteOpportunitySchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete opportunity: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.OPPORTUNITY.DELETE_OPPORTUNITY}/${result.data.id}`;
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
          {
            type: "text",
            text: `Failed to delete opportunity: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Deleted opportunity: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute delete-opportunity: ${msg}` },
      ],
    };
  }
}
