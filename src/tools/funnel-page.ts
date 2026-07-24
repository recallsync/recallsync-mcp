import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import { getApiKey, getBaseUrl } from "../utils/auth.util.js";
import {
  CreateFunnelPageSchema,
  DeleteFunnelPageSchema,
  GetFunnelPageByIdSchema,
  GetFunnelPagesSchema,
  ListBusinessAssetsSchema,
  PublishFunnelPageSchema,
  UnpublishFunnelPageSchema,
  UpdateFunnelPageSchema,
} from "../schema/tool.js";
import { listQueryJsonSchemaProperties } from "../schema/list-query.js";
import {
  appendListQueryToUrl,
  formatPaginatedListText,
} from "../utils/list-query.util.js";

const PAGE_DOCUMENT_HINT = `PageDocumentV2 shape: { version: 2, sections: SectionNode[] }.
SectionNode: { id, type: "section", className?, containerClassName?, bgImageUrl?, rows: RowNode[] }.
RowNode: { id, type: "row", className?, layoutMode?: "grid" | "flex", columns: ColumnNode[] }.
ColumnNode: { id, type: "column", className?, elements: ElementNode[], rows?: RowNode[] }.
ElementNode types: heading { tag, text }, paragraph { text }, button { label, href }, image { src, alt?, assetId? }, spacer, form { formId }.
Navbar pattern (flex row, 3 columns): section className "sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]", containerClassName "relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", row layoutMode "flex" className "items-center justify-between gap-4 py-3 md:py-4", columns: (1) logo col "flex shrink-0 items-center" with image h-8 w-auto, (2) nav col "flex min-w-0 flex-1 flex-row flex-wrap items-center justify-center gap-x-5" with button links className "text-sm font-medium text-white/80 hover:text-white", (3) CTA col "flex shrink-0" with gradient button "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg".`;

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

export const funnelPageTools = [
  {
    name: "list-funnel-pages",
    description:
      "List funnel landing pages for the business. Returns id, title, slug, status, editorPath, previewPath, and livePath. Optional status filter (DRAFT | PUBLISHED). Default pageSize=10.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "PUBLISHED"],
          description: "Optional status filter",
        },
        ...listQueryJsonSchemaProperties,
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get-funnel-page",
    description:
      "Get a single funnel landing page by id. Returns parsed `document` (PageDocumentV2), meta fields, publish state, and editor/preview/live paths. Always call this before update-funnel-page to read current document.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Funnel page id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create-funnel-page",
    description:
      "Create a new funnel landing page in DRAFT with a default hero + form layout. Returns page id and editorPath. Use update-funnel-page to replace document with custom layout (e.g. navbar).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Page title" },
        slug: {
          type: "string",
          description: "Optional URL slug (lowercase, hyphens)",
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "update-funnel-page",
    description:
      "Update a funnel page draft. Pass the full PageDocumentV2 as `document` (preferred) or `blocks`. Merge strategy: read with get-funnel-page first, modify document, then send the complete document here. " +
      PAGE_DOCUMENT_HINT,
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Funnel page id" },
        title: { type: "string", description: "Page title" },
        slug: { type: "string", description: "URL slug" },
        document: {
          type: "object",
          description: "Full PageDocumentV2 JSON (version: 2, sections: [...])",
        },
        blocks: {
          type: "object",
          description: "Alias for document",
        },
        metaTitle: { type: "string", description: "SEO meta title" },
        metaDescription: { type: "string", description: "SEO meta description" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "publish-funnel-page",
    description:
      "Publish the current draft to live. The public page will be available at livePath. Fails if there are no unpublished changes.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Funnel page id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "unpublish-funnel-page",
    description: "Take a published funnel page offline (status → DRAFT).",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Funnel page id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-funnel-page",
    description: "Permanently delete a funnel landing page.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Funnel page id" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "list-business-assets",
    description:
      "List assets in the business media library (UploadThing-backed). Use type=IMAGE to find logo URLs for funnel page image elements. Returns id, name, fileUrl, fileKey, mimeType, type.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["IMAGE", "AUDIO", "VIDEO", "FILE"],
          description: "Filter by asset type",
        },
        search: { type: "string", description: "Search by name or filename" },
        limit: { type: "number", description: "Max items (default 48, max 100)" },
        cursor: { type: "string", description: "Pagination cursor from prior response" },
      },
      required: [],
      additionalProperties: false,
    },
  },
];

export async function handleListFunnelPages(request: CallToolRequest) {
  try {
    const result = GetFunnelPagesSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to list funnel pages: ${formatZodErrors(result)}` }],
      };
    }

    const { status, ...listQuery } = result.data;
    const url = appendListQueryToUrl(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.GET_FUNNEL_PAGES}`,
      listQuery,
      { status }
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
        content: [{ type: "text", text: await readErrorText("Failed to list funnel pages", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: formatPaginatedListText("Funnel pages", "pages", data as Record<string, unknown>),
        },
      ],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute list-funnel-pages: ${msg}` }],
    };
  }
}

export async function handleGetFunnelPage(request: CallToolRequest) {
  try {
    const result = GetFunnelPageByIdSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to get funnel page: ${formatZodErrors(result)}` }],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.GET_FUNNEL_PAGE_BY_ID}/${result.data.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey(request)}`,
        },
      }
    );

    if (!response.ok) {
      return {
        content: [{ type: "text", text: await readErrorText("Failed to get funnel page", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute get-funnel-page: ${msg}` }],
    };
  }
}

export async function handleCreateFunnelPage(request: CallToolRequest) {
  try {
    const result = CreateFunnelPageSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to create funnel page: ${formatZodErrors(result)}` }],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.CREATE_FUNNEL_PAGE}`,
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
        content: [{ type: "text", text: await readErrorText("Failed to create funnel page", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute create-funnel-page: ${msg}` }],
    };
  }
}

export async function handleUpdateFunnelPage(request: CallToolRequest) {
  try {
    const result = UpdateFunnelPageSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to update funnel page: ${formatZodErrors(result)}` }],
      };
    }

    const { id, ...body } = result.data;
    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.UPDATE_FUNNEL_PAGE}/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey(request)}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return {
        content: [{ type: "text", text: await readErrorText("Failed to update funnel page", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute update-funnel-page: ${msg}` }],
    };
  }
}

export async function handlePublishFunnelPage(request: CallToolRequest) {
  try {
    const result = PublishFunnelPageSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to publish funnel page: ${formatZodErrors(result)}` }],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.PUBLISH_FUNNEL_PAGE}/${result.data.id}/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey(request)}`,
        },
      }
    );

    if (!response.ok) {
      return {
        content: [{ type: "text", text: await readErrorText("Failed to publish funnel page", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute publish-funnel-page: ${msg}` }],
    };
  }
}

export async function handleUnpublishFunnelPage(request: CallToolRequest) {
  try {
    const result = UnpublishFunnelPageSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to unpublish funnel page: ${formatZodErrors(result)}` }],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.UNPUBLISH_FUNNEL_PAGE}/${result.data.id}/unpublish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey(request)}`,
        },
      }
    );

    if (!response.ok) {
      return {
        content: [{ type: "text", text: await readErrorText("Failed to unpublish funnel page", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute unpublish-funnel-page: ${msg}` }],
    };
  }
}

export async function handleDeleteFunnelPage(request: CallToolRequest) {
  try {
    const result = DeleteFunnelPageSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to delete funnel page: ${formatZodErrors(result)}` }],
      };
    }

    const response = await fetch(
      `${getBaseUrl(request)}${API_ENDPOINTS.FUNNEL_PAGE.DELETE_FUNNEL_PAGE}/${result.data.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getApiKey(request)}`,
        },
      }
    );

    if (!response.ok) {
      return {
        content: [{ type: "text", text: await readErrorText("Failed to delete funnel page", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute delete-funnel-page: ${msg}` }],
    };
  }
}

export async function handleListBusinessAssets(request: CallToolRequest) {
  try {
    const result = ListBusinessAssetsSchema.safeParse(request.params.arguments ?? {});
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to list assets: ${formatZodErrors(result)}` }],
      };
    }

    const params = new URLSearchParams();
    if (result.data.type) params.set("type", result.data.type);
    if (result.data.search) params.set("search", result.data.search);
    if (result.data.limit) params.set("limit", String(result.data.limit));
    if (result.data.cursor) params.set("cursor", result.data.cursor);
    const query = params.toString();
    const url = `${getBaseUrl(request)}${API_ENDPOINTS.ASSET.GET_ASSETS}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey(request)}`,
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: "text", text: await readErrorText("Failed to list assets", response) }],
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Failed to execute list-business-assets: ${msg}` }],
    };
  }
}
