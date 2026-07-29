import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  InvokeWebsiteActionSchema,
  SetWebsiteSchemaSqlSchema,
  UpsertWebsiteActionSchema,
  UpsertWebsiteCustomPageSchema,
  WebsiteIdSchema,
} from "../schema/tool.js";

function formatZodErrors(result: {
  success: false;
  error: { errors: { path: (string | number)[]; message: string }[] };
}) {
  return result.error.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ");
}

async function readErrorText(label: string, response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return `${label}: ${response.status} ${response.statusText}${body ? `\n${body}` : ""}`;
}

async function authedFetch(
  request: CallToolRequest,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${getBaseUrl(request)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey(request)}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function jsonOrError(label: string, response: Response) {
  if (!response.ok) {
    return {
      content: [{ type: "text" as const, text: await readErrorText(label, response) }],
      isError: true as const,
    };
  }
  const data = await response.json();
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export const websiteAppTools = [
  {
    name: "list-websites",
    description:
      "List funnel websites for the API-key business. Returns id, name, slug, hostname, stagingPath (/sites/w/{id}).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get-website-app-capabilities",
    description:
      "Capabilities for a website: hasSupabase, supabaseTestOk, secretCount, actionCount, customPageCount.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { websiteId: { type: "string" } },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "list-website-actions",
    description: "List invoke actions configured in Recall DB (product.list, cart.addItem, etc.).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { websiteId: { type: "string" } },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "list-website-custom-pages",
    description: "List custom app pages (/shop, /cart, /admin/*) with staging paths.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { websiteId: { type: "string" } },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-website-schema-sql",
    description:
      "Get Supabase DDL stored in Recall for this website (schemaSql, schemaVersion). Run manually in Supabase SQL editor.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { websiteId: { type: "string" } },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "set-website-schema-sql",
    description:
      "Save Supabase DDL in Recall DB for this website. Set applyDefault=true to store platform default commerce schema if empty.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        schemaSql: { type: "string", description: "Full SQL to store" },
        schemaVersion: { type: "string", description: "e.g. commerce-v1" },
        applyDefault: {
          type: "boolean",
          description: "If true, saves default commerce DDL (ignores schemaSql)",
        },
      },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "upsert-website-action",
    description:
      "Upsert an invoke action in Recall DB. Config matches Actions tab JSON (key, operation, collection, auth, etc.).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        key: { type: "string" },
        label: { type: "string" },
        enabled: { type: "boolean" },
        config: { type: "object", additionalProperties: true },
      },
      required: ["websiteId", "key", "config"],
      additionalProperties: false,
    },
  },
  {
    name: "upsert-website-custom-page",
    description:
      "Upsert a custom page (PageDocumentV2 JSON) at a path like /shop or /admin/products. Not editable in visual builder.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        path: { type: "string" },
        title: { type: "string" },
        document: { type: "object", description: "PageDocumentV2" },
        meta: { type: "object", additionalProperties: true },
        source: { type: "string", enum: ["AGENT", "IMPORT", "USER"] },
      },
      required: ["websiteId", "path", "title", "document"],
      additionalProperties: false,
    },
  },
  {
    name: "list-website-products",
    description: "List products via product.list invoke against connected Supabase.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: { websiteId: { type: "string" } },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "invoke-website-action",
    description:
      "Run any invoke action with internal auth. Examples: product.createWithStripe, cart.addItem, checkout.create.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        action: { type: "string" },
        body: { type: "object", additionalProperties: true },
      },
      required: ["websiteId", "action"],
      additionalProperties: false,
    },
  },
];

export async function handleListWebsites(request: CallToolRequest) {
  try {
    const response = await authedFetch(request, API_ENDPOINTS.WEBSITE_APP.LIST_WEBSITES);
    return jsonOrError("list-websites failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute list-websites: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleGetWebsiteAppCapabilities(request: CallToolRequest) {
  const parsed = WebsiteIdSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.CAPABILITIES}/${parsed.data.websiteId}/capabilities`
    );
    return jsonOrError("get-website-app-capabilities failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { type: "text" as const, text: `Failed to execute get-website-app-capabilities: ${msg}` },
      ],
      isError: true,
    };
  }
}

export async function handleListWebsiteActions(request: CallToolRequest) {
  const parsed = WebsiteIdSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.ACTIONS}/${parsed.data.websiteId}/actions`
    );
    return jsonOrError("list-website-actions failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute list-website-actions: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleListWebsiteCustomPages(request: CallToolRequest) {
  const parsed = WebsiteIdSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.CUSTOM_PAGES}/${parsed.data.websiteId}/custom-pages`
    );
    return jsonOrError("list-website-custom-pages failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { type: "text" as const, text: `Failed to execute list-website-custom-pages: ${msg}` },
      ],
      isError: true,
    };
  }
}

export async function handleGetWebsiteSchemaSql(request: CallToolRequest) {
  const parsed = WebsiteIdSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.SCHEMA_SQL}/${parsed.data.websiteId}/schema-sql`
    );
    return jsonOrError("get-website-schema-sql failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute get-website-schema-sql: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleSetWebsiteSchemaSql(request: CallToolRequest) {
  const parsed = SetWebsiteSchemaSqlSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.SCHEMA_SQL}/${parsed.data.websiteId}/schema-sql`,
      {
        method: "POST",
        body: JSON.stringify(
          parsed.data.applyDefault
            ? { applyDefault: true }
            : { schemaSql: parsed.data.schemaSql, schemaVersion: parsed.data.schemaVersion }
        ),
      }
    );
    return jsonOrError("set-website-schema-sql failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute set-website-schema-sql: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleUpsertWebsiteAction(request: CallToolRequest) {
  const parsed = UpsertWebsiteActionSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.ACTIONS}/${parsed.data.websiteId}/actions`,
      {
        method: "POST",
        body: JSON.stringify({
          key: parsed.data.key,
          label: parsed.data.label,
          enabled: parsed.data.enabled,
          config: parsed.data.config,
        }),
      }
    );
    return jsonOrError("upsert-website-action failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute upsert-website-action: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleUpsertWebsiteCustomPage(request: CallToolRequest) {
  const parsed = UpsertWebsiteCustomPageSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.CUSTOM_PAGES}/${parsed.data.websiteId}/custom-pages`,
      {
        method: "POST",
        body: JSON.stringify({
          path: parsed.data.path,
          title: parsed.data.title,
          document: parsed.data.document,
          meta: parsed.data.meta,
          source: parsed.data.source,
        }),
      }
    );
    return jsonOrError("upsert-website-custom-page failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { type: "text" as const, text: `Failed to execute upsert-website-custom-page: ${msg}` },
      ],
      isError: true,
    };
  }
}

export async function handleListWebsiteProducts(request: CallToolRequest) {
  const parsed = WebsiteIdSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.PRODUCTS}/${parsed.data.websiteId}/products`
    );
    return jsonOrError("list-website-products failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute list-website-products: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleInvokeWebsiteAction(request: CallToolRequest) {
  const parsed = InvokeWebsiteActionSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.INVOKE}/${parsed.data.websiteId}/invoke`,
      {
        method: "POST",
        body: JSON.stringify({
          action: parsed.data.action,
          body: parsed.data.body ?? {},
        }),
      }
    );
    return jsonOrError("invoke-website-action failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute invoke-website-action: ${msg}` }],
      isError: true,
    };
  }
}
