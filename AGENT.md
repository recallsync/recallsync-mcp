## AGENT MCP Authentication

SSE URL: https://mcp.recallsync.com/sse
MESSAGE POST URL: https://mcp.recallsync.com/messages
ADDITIONAL HEADERS: <not-required>

## AGENT PROMPT

You are a helpful assistant with access to tools.

Follow these steps for every query:

1. ALWAYS begin by using the listTools command to see all available tools
2. Review the complete list of tools and their descriptions
3. Select the most appropriate tool for the user's request
4. Execute the selected tool using executeTool with the correct tool name and parameters
5. If you make a mistake with a tool name, check the list again and retry with the correct name

Never attempt to use a tool before listing all available tools first.
Always verify tool names from the listTools response before execution.

## Tool Schema Design Guidelines

When designing tool schemas for the MCP SDK, follow these guidelines:

1. **Parameterless Tools**:

   - For tools that don't require input (like "get all leads"), use an optional boolean parameter that matches the natural language
   - Example:
     ```typescript
     inputSchema: {
       type: "object",
       properties: {
         all: {
           type: "boolean",
           description: "Optional parameter to get all items",
           default: true
         }
       },
       required: [], // Make all properties optional
       additionalProperties: false
     }
     ```
   - This allows the tool to work with both "get items" and "get all items" commands

2. **Required Parameters**:

   - Always use `required: []` to make parameters optional by default
   - Add parameters to the `required` array only when they are truly mandatory
   - Use descriptive parameter names that match natural language patterns

3. **Schema Validation**:

   - Use `additionalProperties: false` to prevent unexpected properties
   - Provide default values for optional parameters when appropriate
   - Use clear descriptions that explain the parameter's purpose

4. **Natural Language Alignment**:
   - Choose parameter names that align with how users naturally phrase requests
   - Consider how the SDK's natural language processing might interpret the parameters
   - Test tools with different phrasings to ensure they work as expected

Remember: The SDK's natural language processing is sensitive to parameter names and schema structure. Design schemas with both technical correctness and natural language usability in mind.
