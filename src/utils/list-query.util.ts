import type { ListQueryInput } from "../schema/list-query.js";

type QueryArgValue = string | number | boolean | undefined | null;

/**
 * Build URLSearchParams from shared list-query args plus optional entity filters.
 * Mirrors recallsync-app `getPaginationParams` + `getFilterParams`.
 */
export function buildListQueryParams(
  args: Partial<ListQueryInput> & Record<string, QueryArgValue | unknown>,
  extra?: Record<string, QueryArgValue | unknown>
): URLSearchParams {
  const params = new URLSearchParams();

  const append = (key: string, value: QueryArgValue | unknown) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, String(value));
  };

  append("page", args.page);
  append("pageSize", args.pageSize);
  append("select", args.select);
  append("gte", args.gte);
  append("lte", args.lte);
  append("gt", args.gt);
  append("lt", args.lt);
  append("eq", args.eq);

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      append(key, value);
    }
  }

  return params;
}

export function appendListQueryToUrl(
  baseUrl: string,
  args: Partial<ListQueryInput> & Record<string, QueryArgValue | unknown>,
  extra?: Record<string, QueryArgValue | unknown>
): string {
  const params = buildListQueryParams(args, extra);
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export function formatPaginatedListText(
  label: string,
  itemsKey: string,
  data: Record<string, unknown>
): string {
  const items = data[itemsKey];
  const total = data.total;
  const totalPages = data.totalPages;
  const hasNextPage = data.hasNextPage;

  const count = Array.isArray(items) ? items.length : 0;
  const meta =
    total !== undefined
      ? `\nPagination: total=${total}, totalPages=${totalPages}, hasNextPage=${hasNextPage}, returned=${count}`
      : "";

  return `${label}:${meta}\n${JSON.stringify(data, null, 2)}`;
}
