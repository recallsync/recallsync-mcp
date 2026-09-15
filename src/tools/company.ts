import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  CreateCompanySchema,
  DeleteCompanySchema,
  GetCompaniesSchema,
  GetCompanyByIdSchema,
  UpdateCompanySchema,
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

export const companyTools = [
  {
    name: "get-companies",
    description:
      "Get paginated companies for the business. Optional name contains filter. Default pageSize=10. Date filters apply to createdAt. Lean default: id, name, email, phone, website, createdAt, lead/opportunity counts.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Optional substring filter on company name",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-company",
    description: "Get a single company by id.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Company id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-company",
    description: "Create a company record for the business.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Company name" },
        email: { type: "string" },
        phone: { type: "string" },
        website: { type: "string" },
        industry: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zipCode: { type: "string" },
        country: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update-company",
    description: "Update a company by id. Partial fields supported.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Company id" },
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        website: { type: "string" },
        industry: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zipCode: { type: "string" },
        country: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-company",
    description:
      "Delete a company by id. Unlinks associations and removes related opportunities.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Company id to delete" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

export async function handleGetCompanies(request: CallToolRequest) {
  try {
    const result = GetCompaniesSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get companies: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { name, ...listArgs } = result.data;
    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.COMPANY.LIST}`,
      listArgs,
      { name }
    );

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
            text: `Failed to get companies: ${await readErrorText(response)}`,
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
            "Companies",
            "companies",
            data as Record<string, unknown>
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-companies: ${msg}` }],
    };
  }
}

export async function handleGetCompany(request: CallToolRequest) {
  try {
    const result = GetCompanyByIdSchema.safeParse(request.params.arguments);
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get company: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const url = `${getBaseUrl(request)}${API_ENDPOINTS.COMPANY.BY_ID}/${result.data.id}`;
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
            text: `Failed to get company: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        { type: "text", text: `Company:\n${JSON.stringify(data, null, 2)}` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-company: ${msg}` }],
    };
  }
}

export async function handleCreateCompany(request: CallToolRequest) {
  try {
    const result = CreateCompanySchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create company: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.COMPANY.LIST}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey(request)}`,
        },
        body: JSON.stringify(result.data),
      }
    );

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create company: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Created company ${data.id}:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute create-company: ${msg}` },
      ],
    };
  }
}

export async function handleUpdateCompany(request: CallToolRequest) {
  try {
    const result = UpdateCompanySchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update company: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const { id, ...data } = result.data;
    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.COMPANY.BY_ID}/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey(request)}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update company: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    const updated = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Updated company ${id}:\n${JSON.stringify(updated, null, 2)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute update-company: ${msg}` },
      ],
    };
  }
}

export async function handleDeleteCompany(request: CallToolRequest) {
  try {
    const result = DeleteCompanySchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete company: ${formatZodErrors(result)}`,
          },
        ],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.COMPANY.BY_ID}/${result.data.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getApiKey(request)}`,
        },
      }
    );

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete company: ${await readErrorText(response)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text", text: `Deleted company ${result.data.id}.` },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        { type: "text", text: `Failed to execute delete-company: ${msg}` },
      ],
    };
  }
}
