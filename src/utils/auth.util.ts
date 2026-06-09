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
  const baseUrl =
    typeof hostDomain === "string" && hostDomain.trim()
      ? `https://${hostDomain.trim().replace(/^https?:\/\//, "")}`
      : process.env.BASE_URL ?? "";
  console.log("[MCP] REST base URL in use:", baseUrl);
  return baseUrl;
};
