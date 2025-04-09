## Tool Development Guidelines

When developing new tools for the MCP SDK, follow these steps:

1. **Review API Documentation**:

   - Check the `ReCallSync App.postman_collection.json` file in the root directory
   - Understand the available API endpoints and their structure
   - Note the required parameters and response formats

2. **Schema Design Guidelines**:

   - **IMPORTANT: The `all` Parameter**

     - For ANY tool that retrieves multiple items (like "get leads", "get meetings", etc.), ALWAYS include an `all` parameter
     - This parameter is CRITICAL for natural language processing to work correctly
     - Without this parameter, the tool will fail validation when users say "get all [items]"
     - Example:
       ```typescript
       inputSchema: {
         type: "object",
         properties: {
           // Other optional parameters...
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
     - Tools that ALWAYS need the `all` parameter:
       - `get-leads`
       - `get-meetings`
       - `get-all-follow-ups`
       - `get-tags`
       - `get-all-voice-campaigns`
     - Tools that DON'T need the `all` parameter:
       - Tools that require a specific ID (like `get-notes` which requires a `leadId`)
       - Tools that create, update, or delete items

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

3. **Required Parameters**:

   - Always use `required: []` to make parameters optional by default
   - Add parameters to the `required` array only when they are truly mandatory
   - Use descriptive parameter names that match natural language patterns

4. **Schema Validation**:

   - Use `additionalProperties: false` to prevent unexpected properties
   - Provide default values for optional parameters when appropriate
   - Use clear descriptions that explain the parameter's purpose

5. **Natural Language Alignment**:

   - Choose parameter names that align with how users naturally phrase requests
   - Consider how the SDK's natural language processing might interpret the parameters
   - Test tools with different phrasings to ensure they work as expected

6. **Tool Registration**:

   - Add the tool to the appropriate file in the `src/tools` directory
   - Register the tool in `server.ts` by:
     - Importing the tool and its handlers
     - Adding the tool to the list of tools in the `ListToolsRequestSchema` handler
     - Adding the tool handlers to the switch statement in the `CallToolRequestSchema` handler

7. **Response Structure**:

   - All tool handlers MUST return responses in the following format:

     ```typescript
     // Success response
     return {
       content: [
         {
           type: "text",
           text: "Success message here",
         },
         {
           type: "data",
           data: data, // The actual data returned from the API
         },
       ],
     };

     // Error response
     return {
       content: [
         {
           type: "text",
           text: "Error message here",
         },
       ],
     };
     ```

   - The `content` array is required and must contain at least one object
   - Each object in the `content` array must have a `type` property
   - For text messages, use `type: "text"` and include a `text` property
   - For data, use `type: "data"` and include a `data` property
   - For validation errors, format them into a readable message:
     ```typescript
     const errorMessages = result.error.errors
       .map((err) => `${err.path.join(".")}: ${err.message}`)
       .join(", ");
     return {
       content: [
         {
           type: "text",
           text: `Failed to process request: ${errorMessages}. Please provide the missing or incorrect information.`,
         },
       ],
     };
     ```

Remember: The SDK's natural language processing is sensitive to parameter names and schema structure. Design schemas with both technical correctness and natural language usability in mind.
