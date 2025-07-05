NGROK Fusion: npx ngrok http --domain=hot-gar-just.ngrok-free.app 3008
NGROK Nitin: npx ngrok http --domain=quietly-evolved-polecat.ngrok-free.app 3008

## AGENT MCP Authentication

### Modern StreamableHTTP Endpoints (for VAPI, newer clients)

#### Primary MCP Server

STREAMABLE HTTP URL: https://mcp.recallsync.com/mcp
ADDITIONAL HEADERS: mcp-session-id (auto-generated)

#### GHL MCP Server

STREAMABLE HTTP URL: https://mcp.recallsync.com/mcp-ghl
ADDITIONAL HEADERS: api_key=1234, mcp-session-id (auto-generated)

#### Cal MCP Server

STREAMABLE HTTP URL: https://mcp.recallsync.com/mcp-cal
ADDITIONAL HEADERS: api_key=1234, mcp-session-id (auto-generated)

### Legacy SSE Endpoints (for n8n, older clients)

#### Primary MCP Server

SSE URL: https://mcp.recallsync.com/sse
MESSAGES URL: https://mcp.recallsync.com/messages

#### GHL MCP Server

SSE URL: https://mcp.recallsync.com/sse-ghl
MESSAGES URL: https://mcp.recallsync.com/ghl-messages
ADDITIONAL HEADERS: api_key=1234

#### Cal MCP Server

SSE URL: https://mcp.recallsync.com/sse-cal
MESSAGES URL: https://mcp.recallsync.com/cal-messages
ADDITIONAL HEADERS: api_key=1234

## AGENT PROMPT

You are a helpful assistant with access to tools.

Follow these steps for every query:

1. ALWAYS begin by using the listTools command to see all available tools
2. Review the complete list of tools to understand what capabilities you have
3. For appointment-related queries, use the appointment tools
4. For lead-related queries, use the lead tools
5. For meeting-related queries, use the meeting tools
6. For voice campaign queries, use the voice campaign tools
7. For task/follow-up queries, use the follow-up tools
8. For note-taking queries, use the note tools
9. For tagging queries, use the tag tools

After reviewing tools, provide your response and use the appropriate tools to complete the user's request.

Remember to:

- Check available tools first
- Use the most appropriate tool for the task
- Provide helpful, accurate responses
- Follow up with additional tools if needed

Keep your responses concise and focused on the user's request while being thorough in your tool usage.
