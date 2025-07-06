# How to Create a Tool

This guide walks you through the process of creating a new tool in the MCP (Model Context Protocol) system using the Cal appointment tools as examples.

## Overview

Creating a new tool involves 5 main steps:

1. **Define the tool** in the tools array
2. **Create Zod schema** for validation
3. **Create handler function** for processing requests
4. **Create controller function** for API calls
5. **Register the tool** in the server

## Step-by-Step Guide

### Step 1: Define the Tool in Tools Array

First, add your tool definition to the `appointmentTools` array in `src/tools/CAL/appointment.tools.ts`.

**Example:**

```typescript
export const appointmentTools = [
  // ... existing tools
  {
    name: "get_appointments",
    description: "Use this tool to get all the appointments for the user.",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description:
            "Email of the user, MUST be called 'email' in the arguments.",
        },
        primaryAgentId: {
          type: "string",
          description:
            "primaryAgentId from available details. Always include this from 'Available Details'",
          required: true,
        },
      },
      required: ["email", "primaryAgentId"],
      additionalProperties: false,
    },
  },
];
```

**Key components:**

- `name`: Unique identifier for your tool (used in switch statements)
- `description`: Clear description of what the tool does and when to use it
- `inputSchema`: JSON schema defining the required and optional parameters

### Step 2: Create Zod Schema

Create a corresponding Zod schema in `src/schema/CAL/appointment.schema.ts` that matches your inputSchema.

**Example:**

```typescript
import { z } from "zod";

export const getCalBookingsSchema = z.object({
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type GetCalBookingsRequest = z.infer<typeof getCalBookingsSchema>;
```

**Best practices:**

- Schema name should match the tool purpose (e.g., `getCalBookingsSchema`)
- Always export the inferred TypeScript type
- Use descriptive error messages for validation failures
- Ensure the schema matches your inputSchema exactly

### Step 3: Create Handler Function

Create a handler function in `src/tools/CAL/appointment.tools.ts` that processes the tool request.

**Example:**

```typescript
export async function handleGetAppointments(request: CallToolRequest) {
  try {
    const rawArgs = request.params.arguments as any;

    // Extract API key from injected arguments
    const apiKey = rawArgs._apiKey;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Authentication failed: No API key provided",
          },
        ],
      };
    }

    // Remove _apiKey from args before validation
    const { _apiKey, ...cleanArgs } = rawArgs;
    const args = cleanArgs as GetCalBookingsRequest;

    // Validate the input using Zod
    const result = getCalBookingsSchema.safeParse(args);
    const integration = await getIntegration(apiKey);
    if (!integration) {
      return {
        content: [
          {
            type: "text",
            text: "Integration not found",
          },
        ],
      };
    }
    const agent = await getPrimaryAgent(args.primaryAgentId);
    if (!agent?.CalenderIntegration) {
      return {
        content: [
          {
            type: "text",
            text: "Primary agent not found",
          },
        ],
      };
    }

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get appointments: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    // Call the controller function
    const response = await getCalBookings({
      args: result.data,
      calendar: agent.CalenderIntegration,
    });

    return {
      content: [
        {
          type: "text",
          text: `Appointments fetched successfully: \n ${response}`,
        },
      ],
    };
  } catch (error) {
    console.error("Error get appointments:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while getting appointments: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
```

**Handler function pattern:**

1. **Extract API key** from injected arguments
2. **Authenticate** the request
3. **Clean arguments** (remove internal fields like `_apiKey`)
4. **Validate arguments** using Zod schema
5. **Get integration and agent** details
6. **Call controller function** with validated data
7. **Return formatted response** or error

### Step 4: Create Controller Function

Create the actual business logic function in `src/controller/CAL/cal.appointment.ts` that handles the API calls.

**Example structure:**

```typescript
export async function getCalBookings({
  args,
  calendar,
}: {
  args: GetCalBookingsRequest;
  calendar: CalendarIntegration;
}) {
  // Implementation details:
  // - Make API calls to Cal.com
  // - Process the response
  // - Format the data
  // - Return user-friendly response
}
```

**Controller responsibilities:**

- Make external API calls (to Cal.com in this case)
- Handle API responses and errors
- Transform data into user-friendly format
- Implement business logic specific to the tool

### Step 5: Register the Tool in Server

Add your new tool to the switch statement in `src/servers/cal.server.ts`.

**Example:**

```typescript
// Handle tool execution
calServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "check_availability":
      return handleCheckAvailability(request);
    case "book_appointment":
      return handleBookAppointment(request);
    case "reschedule_appointment":
      return handleRescheduleAppointment(request);
    case "cancel_appointment":
      return handleCancelAppointment(request);
    case "get_appointments": // Add your new case here
      return handleGetAppointments(request);
    default:
      throw new Error("Unknown tool");
  }
});
```

**Important:**

- The case name must match exactly the `name` field from your tool definition
- Import your handler function at the top of the file
- Always include a `default` case that throws an error

## Complete Example

Here's a simplified example of creating a new tool called `check_calendar_sync`:

1. **Tool definition:**

```typescript
{
  name: "check_calendar_sync",
  description: "Check if calendar is properly synced",
  inputSchema: {
    type: "object",
    properties: {
      primaryAgentId: {
        type: "string",
        description: "primaryAgentId from available details",
      },
    },
    required: ["primaryAgentId"],
  },
}
```

2. **Zod schema:**

```typescript
export const checkCalendarSyncSchema = z.object({
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type CheckCalendarSyncRequest = z.infer<typeof checkCalendarSyncSchema>;
```

3. **Handler function:**

```typescript
export async function handleCheckCalendarSync(request: CallToolRequest) {
  // Follow the same pattern as other handlers
}
```

4. **Controller function:**

```typescript
export async function checkCalendarSync({
  args,
  calendar,
}: {
  args: CheckCalendarSyncRequest;
  calendar: CalendarIntegration;
}) {
  // Implementation
}
```

5. **Server registration:**

```typescript
case "check_calendar_sync":
  return handleCheckCalendarSync(request);
```

## Best Practices

1. **Naming conventions:**

   - Tool names: `snake_case` (e.g., `get_appointments`)
   - Schema names: `camelCase` with "Schema" suffix (e.g., `getAppointmentsSchema`)
   - Handler names: `camelCase` with "handle" prefix (e.g., `handleGetAppointments`)

2. **Error handling:**

   - Always wrap handler functions in try-catch blocks
   - Provide clear, user-friendly error messages
   - Log errors for debugging

3. **Validation:**

   - Use Zod schemas for all input validation
   - Validate API keys and authentication
   - Check for required dependencies (integration, agent)

4. **Documentation:**

   - Write clear tool descriptions
   - Include examples in parameter descriptions
   - Specify required vs optional parameters clearly

5. **Response formatting:**
   - Return consistent response structure
   - Include success/failure indicators
   - Format data in user-readable way

## Testing Your Tool

After implementing your tool:

1. **Test the schema validation** with various inputs
2. **Test error cases** (missing API key, invalid arguments)
3. **Test the happy path** with valid data
4. **Verify the tool appears** in the tools list
5. **Test integration** with the MCP client

## Common Patterns

- **Authentication:** All tools extract and validate `_apiKey`
- **Validation:** All tools use Zod schemas for input validation
- **Error handling:** Consistent error response format
- **Integration lookup:** Most tools require integration and agent validation
- **Response format:** All tools return `{ content: [{ type: "text", text: "..." }] }`

## Reference: Information Needed to Create a Tool

When requesting a new tool to be created, provide the following information:

### **1. Tool Identity & Purpose**

- **Tool name:** What should the tool be called? (use snake_case format)
  - Examples: `send_email`, `create_task`, `update_status`
- **Description:** What does this tool do and when should the AI use it?
- **Usage context:** When should the AI trigger this tool?

### **2. Input Schema Properties**

- **Parameters needed:** List all required inputs
  - Parameter names (use camelCase or snake_case consistently)
  - Parameter types (string, number, boolean, array, object)
  - Parameter descriptions (be specific and clear)
- **Required vs Optional:** Which parameters are mandatory?
- **Validation rules:** Any special requirements?
  - Min/max length constraints
  - Format requirements (email, date, etc.)
  - Enum values for restricted choices

### **3. Implementation Details**

- **Demo vs Real:** Should this start with dummy data? (recommended: yes)
- **Future integration:** What will the real implementation call?
  - External API endpoints
  - Database operations
  - File system operations
- **Response format:** What should success responses include?
- **Error handling:** What error scenarios should be covered?

### **4. System Integration**

- **Server placement:** Which server should host this tool?
  - CAL server (calendar-related)
  - GHL server (GoHighLevel-related)
  - New server (if creating new functionality)
- **Dependencies:** What system components are needed?
  - `primaryAgentId` validation (most tools need this)
  - Integration/agent lookup (usually required)
  - Special authentication requirements

### **Example Tool Request Format**

```
Tool Request: Create a notification tool

1. Name: send_notification
2. Purpose: Send notifications to users via email or SMS
3. When to use: When user requests to notify someone about an event
4. Parameters:
   - message (string, required): The notification message
   - recipient (string, required): Email or phone number
   - type (enum, required): "email" | "sms"
   - priority (enum, optional): "high" | "normal" | "low"
   - primaryAgentId (string, required): From available details
5. Implementation: Start with dummy data, will integrate with SendGrid/Twilio later
6. Server: Create new notifications server
```

### **What Gets Created Automatically**

When you provide the above information, the following will be generated:

✅ **Tool definition** in the tools array with proper inputSchema  
✅ **Zod schema** with validation matching the inputSchema  
✅ **Handler function** following the standard authentication and validation pattern  
✅ **Controller function** with demo data (or real implementation if specified)  
✅ **Server registration** in the appropriate switch statement  
✅ **TypeScript types** and proper imports/exports

### **Smart Defaults Applied**

Unless specified otherwise:

- `primaryAgentId` parameter is included
- API key authentication is added
- Integration and agent validation is included
- Standard error handling pattern is used
- Consistent response format is applied
- Proper logging is included
