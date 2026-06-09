import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  GetCustomFieldsSchema,
  GetCustomFieldByIdSchema,
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
  DeleteCustomFieldSchema,
  GetLeadCustomFieldValuesSchema,
  UpsertCustomFieldValueSchema,
  BulkUpsertCustomFieldValuesSchema,
  DeleteCustomFieldValueSchema,
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

export const customFieldTools = [
  {
    name: "get-custom-fields",
    description:
      "Get paginated custom field definitions for the business. Default pageSize=10. Date filters apply to createdAt. Lean default: id, key, label, type, options, source, createdAt.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { ...listQueryJsonSchemaProperties },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-custom-field",
    description: "Get a single custom field definition by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom field definition id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-custom-field",
    description:
      "Create a custom field definition for the business. key must be unique per business.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Human-readable label" },
        key: {
          type: "string",
          description: "Unique key/slug for the field (unique per business)",
        },
        type: {
          type: "string",
          description:
            'Field type (e.g. "TEXT", "NUMBER", "SELECT"). Defaults to empty.',
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Options for SELECT-like fields",
        },
      },
      required: ["label", "key"],
      additionalProperties: false,
    },
  },
  {
    name: "update-custom-field",
    description: "Update a custom field definition by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom field definition id" },
        label: { type: "string" },
        key: { type: "string" },
        type: { type: "string" },
        options: { type: "array", items: { type: "string" } },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-custom-field",
    description:
      "Delete a custom field definition by id. Cascades to all its values across leads.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom field definition id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get-lead-custom-field-values",
    description:
      "Get all custom field values set for a lead (includes each value's field definition key/label/type/options).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Lead id" },
      },
      required: ["leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "set-lead-custom-field-value",
    description:
      "Set (create or update) a single custom field value for a lead. Upserts on lead+field. Syncs to GHL if the field is mapped and the lead has a GHL contact.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Lead id" },
        fieldDefId: {
          type: "string",
          description: "Custom field definition id",
        },
        value: {
          type: ["string", "null"],
          description: "Value to set (null/omit to clear)",
        },
      },
      required: ["leadId", "fieldDefId"],
      additionalProperties: false,
    },
  },
  {
    name: "bulk-set-lead-custom-field-values",
    description:
      "Set (create or update) multiple custom field values for a lead in one call. Upserts each on lead+field.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Lead id" },
        values: {
          type: "array",
          description: "Array of { fieldDefId, value } to upsert",
          items: {
            type: "object",
            properties: {
              fieldDefId: { type: "string" },
              value: { type: ["string", "null"] },
            },
            required: ["fieldDefId"],
          },
        },
      },
      required: ["leadId", "values"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-lead-custom-field-value",
    description: "Delete a single custom field value row by its id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom field value id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleGetCustomFields(request: CallToolRequest) {
  try {
    const result = GetCustomFieldsSchema.safeParse(
      request.params.arguments ?? {}
    );
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get custom fields: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.GET_CUSTOM_FIELDS}`,
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
          { type: "text", text: `Failed to get custom fields: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText("Custom fields", "customFields", data as Record<string, unknown>),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-custom-fields: ${msg}` }],
    };
  }
}

export async function handleGetCustomField(request: CallToolRequest) {
  try {
    const result = GetCustomFieldByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get custom field: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.GET_CUSTOM_FIELD_BY_ID}/${result.data.id}`;
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
          { type: "text", text: `Failed to get custom field: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Custom field: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-custom-field: ${msg}` }],
    };
  }
}

export async function handleCreateCustomField(request: CallToolRequest) {
  try {
    const result = CreateCustomFieldSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to create custom field: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.CREATE_CUSTOM_FIELD}`;
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
          { type: "text", text: `Failed to create custom field: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Created custom field: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute create-custom-field: ${msg}` }],
    };
  }
}

export async function handleUpdateCustomField(request: CallToolRequest) {
  try {
    const result = UpdateCustomFieldSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to update custom field: ${formatZodErrors(result)}` },
        ],
      };
    }

    const { id, ...rest } = result.data;
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.UPDATE_CUSTOM_FIELD}/${id}`;
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
          { type: "text", text: `Failed to update custom field: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Updated custom field: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute update-custom-field: ${msg}` }],
    };
  }
}

export async function handleDeleteCustomField(request: CallToolRequest) {
  try {
    const result = DeleteCustomFieldSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to delete custom field: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.DELETE_CUSTOM_FIELD}/${result.data.id}`;
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
          { type: "text", text: `Failed to delete custom field: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: `Deleted custom field: ${JSON.stringify(data)}` }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute delete-custom-field: ${msg}` }],
    };
  }
}

export async function handleGetLeadCustomFieldValues(request: CallToolRequest) {
  try {
    const result = GetLeadCustomFieldValuesSchema.safeParse(
      request.params.arguments
    );
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to get values: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.GET_LEAD_VALUES}/${result.data.leadId}`;
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
          { type: "text", text: `Failed to get values: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Lead custom field values: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-lead-custom-field-values: ${msg}` }],
    };
  }
}

export async function handleSetLeadCustomFieldValue(request: CallToolRequest) {
  try {
    const result = UpsertCustomFieldValueSchema.safeParse(
      request.params.arguments
    );
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to set value: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.UPSERT_VALUE}`;
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
          { type: "text", text: `Failed to set value: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Set custom field value: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute set-lead-custom-field-value: ${msg}` }],
    };
  }
}

export async function handleBulkSetLeadCustomFieldValues(
  request: CallToolRequest
) {
  try {
    const result = BulkUpsertCustomFieldValuesSchema.safeParse(
      request.params.arguments
    );
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to set values: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.UPSERT_VALUE}`;
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
          { type: "text", text: `Failed to set values: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Set custom field values: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute bulk-set-lead-custom-field-values: ${msg}` }],
    };
  }
}

export async function handleDeleteLeadCustomFieldValue(
  request: CallToolRequest
) {
  try {
    const result = DeleteCustomFieldValueSchema.safeParse(
      request.params.arguments
    );
    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to delete value: ${formatZodErrors(result)}` },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.CUSTOM_FIELD.DELETE_VALUE}/${result.data.id}`;
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
          { type: "text", text: `Failed to delete value: ${response.statusText}` },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Deleted custom field value: ${JSON.stringify(data)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute delete-lead-custom-field-value: ${msg}` }],
    };
  }
}
