import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

/**
 * Per-request RecallSync API key.
 *
 * The `/mcp` route extracts the `api_key` request header and injects it into the
 * tool-call arguments as `_apiKey` (same pattern as the GHL/Cal servers). Tools
 * forward this value to the RecallSync REST API as the `Authorization: Bearer`
 * token, so the business is resolved per request instead of from a static env token.
 */
export const getApiKey = (request: CallToolRequest): string => {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const apiKey = args._apiKey;
  if (typeof apiKey !== "string" || !apiKey) {
    throw new Error("Missing API key: no _apiKey was injected for this request");
  }
  return apiKey;
};

/**
 * Base URL for RecallSync REST calls.
 *
 * The `/mcp` route injects the request's `host_domain` as `_hostDomain`. When
 * present we target the agency's white-labeled domain so recallsync-app resolves
 * the correct tenant DB by host; otherwise we fall back to `process.env.BASE_URL`.
 */
export const getBaseUrl = (request: CallToolRequest): string => {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const hostDomain = args._hostDomain;
  const fallback = process.env.BASE_URL
    ? new URL(process.env.BASE_URL).origin
    : "";

  let origin = fallback;
  if (typeof hostDomain === "string" && hostDomain.trim()) {
    const value = hostDomain.trim();
    if (/^https?:\/\//i.test(value)) {
      origin = new URL(value).origin;
    } else if (/^(localhost|127\.0\.0\.1)(:|$)/.test(value) && fallback) {
      // Preserve local dev scheme/port from BASE_URL.
      origin = fallback;
    } else {
      origin = `https://${value}`;
    }
  }

  const baseUrl = `${origin}/api/rest`;
  console.log("[MCP] REST base URL in use:", baseUrl);
  return baseUrl;
};
