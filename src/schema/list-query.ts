import { z } from "zod";

/** Shared list-query args mirrored from recallsync-app REST query params. */
export const ListQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  /** Comma-separated scalar field names (e.g. "id,content,sender,status"). */
  select: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  lt: z.string().optional(),
  eq: z.string().optional(),
});

export type ListQueryInput = z.infer<typeof ListQuerySchema>;

/** Pagination + select only — for entities with no date field (e.g. CampaignLead). */
export const PaginationSelectSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  select: z.string().optional(),
});

export type PaginationSelectInput = z.infer<typeof PaginationSelectSchema>;

/** JSON Schema properties to spread into MCP tool `inputSchema.properties`. */
export const paginationSelectJsonSchemaProperties = {
  page: {
    type: "number",
    description: "Page number (1-based). Default 1.",
  },
  pageSize: {
    type: "number",
    description:
      "Items per page. Default 10. Use 50 or 100 when the user asks for more rows.",
  },
  select: {
    type: "string",
    description:
      'Comma-separated scalar fields to return. Omit for server defaults.',
  },
} as const;

/** JSON Schema properties to spread into MCP tool `inputSchema.properties`. */
export const listQueryJsonSchemaProperties = {
  page: {
    type: "number",
    description: "Page number (1-based). Default 1.",
  },
  pageSize: {
    type: "number",
    description:
      "Items per page. Default 10. Use 50 or 100 when the user asks for more rows.",
  },
  select: {
    type: "string",
    description:
      'Comma-separated scalar fields to return (e.g. "id,content,sender,status"). Omit for server defaults.',
  },
  gte: {
    type: "string",
    description: "Date filter: createdAt (or entity date field) >= ISO value.",
  },
  lte: {
    type: "string",
    description: "Date filter: createdAt (or entity date field) <= ISO value.",
  },
  gt: {
    type: "string",
    description: "Date filter: createdAt (or entity date field) > ISO value.",
  },
  lt: {
    type: "string",
    description: "Date filter: createdAt (or entity date field) < ISO value.",
  },
  eq: {
    type: "string",
    description: "Date filter: createdAt (or entity date field) equals ISO value.",
  },
} as const;
