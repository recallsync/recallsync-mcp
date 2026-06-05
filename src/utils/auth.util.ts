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
