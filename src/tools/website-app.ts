import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  ExportWebsiteAppPackSchema,
  GetWebsiteCustomPageSchema,
  ImportWebsiteAppPackIntoWebsiteSchema,
  ImportWebsiteAppPackSchema,
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
      "Get Supabase DDL stored in Recall for this website (settings.webapp or connection). Returns schemaSql, schemaVersion, hasSchemaSql.",
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
      "Save Supabase DDL for a website (settings.webapp + connection when connected). Pass schemaSql + optional schemaVersion, OR applyDefault=true to store the platform commerce reference DDL (only if empty). Use before export so bundles include schema SQL.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        schemaSql: { type: "string", description: "Full SQL to store" },
        schemaVersion: { type: "string", description: "e.g. commerce-v1" },
        applyDefault: {
          type: "boolean",
          description:
            "If true, stores platform commerce reference DDL when empty (API/MCP only — for seeding reference sites like Acme Shop)",
        },
      },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "ensure-website-schema-sql",
    description:
      "Ensure a website has schema SQL stored for export/onboarding. Returns current state; if hasSchemaSql is false, applies default commerce DDL (same as set-website-schema-sql applyDefault=true).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        schemaVersion: { type: "string", description: "Used when applying default, default commerce-v1" },
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
  {
    name: "get-website-custom-page",
    description:
      "Get a custom app page by path (full PageDocumentV2). Example path: /admin or /admin/products.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        path: { type: "string" },
      },
      required: ["websiteId", "path"],
      additionalProperties: false,
    },
  },
  {
    name: "export-website-app-pack",
    description:
      "Export a webapp bundle (marketing pages + custom pages + actions + schema SQL metadata) as recallsync/webapp JSON v2.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        packId: { type: "string", description: "e.g. commerce-v1" },
        packVersion: { type: "string" },
        packDescription: { type: "string" },
      },
      required: ["websiteId"],
      additionalProperties: false,
    },
  },
  {
    name: "import-website-app-pack",
    description:
      "Import a recallsync/webapp v2 bundle. Creates a new website unless websiteId is set (then upserts into that site).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        bundle: { type: "object", description: "Full recallsync/webapp JSON" },
        websiteId: { type: "string", description: "Target existing website (optional)" },
        name: { type: "string" },
        slug: { type: "string" },
        publishPages: { type: "boolean" },
        schemaSqlOnlyIfEmpty: { type: "boolean" },
        seedDemoProducts: { type: "boolean" },
      },
      required: ["bundle"],
      additionalProperties: false,
    },
  },
  {
    name: "import-website-app-pack-into-website",
    description:
      "Import a webapp bundle into an existing website (idempotent upsert of actions, custom pages, marketing pages).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        websiteId: { type: "string" },
        bundle: { type: "object" },
        publishPages: { type: "boolean" },
        schemaSqlOnlyIfEmpty: { type: "boolean" },
        seedDemoProducts: { type: "boolean" },
      },
      required: ["websiteId", "bundle"],
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

export async function handleEnsureWebsiteSchemaSql(request: CallToolRequest) {
  const parsed = WebsiteIdSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const getResponse = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.SCHEMA_SQL}/${parsed.data.websiteId}/schema-sql`
    );
    if (!getResponse.ok) {
      return jsonOrError("ensure-website-schema-sql failed (get)", getResponse);
    }
    const current = (await getResponse.json()) as {
      hasSchemaSql?: boolean;
      schemaSql?: string | null;
      schemaVersion?: string | null;
    };

    if (current.hasSchemaSql) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ok: true,
                alreadySet: true,
                schemaVersion: current.schemaVersion,
                schemaSqlLength: current.schemaSql?.length ?? 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const setResponse = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.SCHEMA_SQL}/${parsed.data.websiteId}/schema-sql`,
      {
        method: "POST",
        body: JSON.stringify({ applyDefault: true }),
      }
    );
    if (!setResponse.ok) {
      return jsonOrError("ensure-website-schema-sql failed (apply)", setResponse);
    }
    const applied = await setResponse.json();

    const afterResponse = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.SCHEMA_SQL}/${parsed.data.websiteId}/schema-sql`
    );
    const after = afterResponse.ok
      ? ((await afterResponse.json()) as { hasSchemaSql?: boolean; schemaVersion?: string | null })
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              ok: true,
              alreadySet: false,
              applied,
              hasSchemaSql: after?.hasSchemaSql ?? true,
              schemaVersion: after?.schemaVersion ?? null,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { type: "text" as const, text: `Failed to execute ensure-website-schema-sql: ${msg}` },
      ],
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

export async function handleGetWebsiteCustomPage(request: CallToolRequest) {
  const parsed = GetWebsiteCustomPageSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const params = new URLSearchParams({ path: parsed.data.path });
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.CUSTOM_PAGES}/${parsed.data.websiteId}/custom-pages?${params}`
    );
    return jsonOrError("get-website-custom-page failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute get-website-custom-page: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleExportWebsiteAppPack(request: CallToolRequest) {
  const parsed = ExportWebsiteAppPackSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const params = new URLSearchParams();
    if (parsed.data.packId) params.set("packId", parsed.data.packId);
    if (parsed.data.packVersion) params.set("packVersion", parsed.data.packVersion);
    if (parsed.data.packDescription) params.set("packDescription", parsed.data.packDescription);
    const qs = params.toString();
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.APP_PACK_EXPORT}/${parsed.data.websiteId}/app-pack/export${qs ? `?${qs}` : ""}`
    );
    return jsonOrError("export-website-app-pack failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute export-website-app-pack: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleImportWebsiteAppPack(request: CallToolRequest) {
  const parsed = ImportWebsiteAppPackSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(request, API_ENDPOINTS.WEBSITE_APP.APP_PACK_IMPORT, {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    return jsonOrError("import-website-app-pack failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Failed to execute import-website-app-pack: ${msg}` }],
      isError: true,
    };
  }
}

export async function handleImportWebsiteAppPackIntoWebsite(request: CallToolRequest) {
  const parsed = ImportWebsiteAppPackIntoWebsiteSchema.safeParse(request.params.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text" as const, text: formatZodErrors(parsed) }], isError: true };
  }
  try {
    const response = await authedFetch(
      request,
      `${API_ENDPOINTS.WEBSITE_APP.APP_PACK_EXPORT}/${parsed.data.websiteId}/app-pack/import`,
      {
        method: "POST",
        body: JSON.stringify({
          bundle: parsed.data.bundle,
          publishPages: parsed.data.publishPages,
          schemaSqlOnlyIfEmpty: parsed.data.schemaSqlOnlyIfEmpty,
          seedDemoProducts: parsed.data.seedDemoProducts,
        }),
      }
    );
    return jsonOrError("import-website-app-pack-into-website failed", response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to execute import-website-app-pack-into-website: ${msg}`,
        },
      ],
      isError: true,
    };
  }
}
