# Tool Development Guide

## Steps to Add a New Tool

1. **Define Schema**

   - Create a new schema in `src/schema/tool.ts`
   - Use Zod for validation
   - Export both the schema and its TypeScript type

2. **Add API Endpoint**

   - Add the endpoint constant in `src/constants/tool.ts`
   - Follow the existing structure

3. **Implement Tool Handler**

   - Add tool definition to the appropriate tools array (e.g., `leadTools`)
   - Implement the handler function
   - Follow error handling patterns
   - Use proper typing

4. **Add Request Handler**
   - Add case in `server.ts` requestHandlers
   - Map the tool name to its handler function

## Available Tools

### Lead Tools

#### Create Lead

- **Name**: `create-lead`
- **Description**: Create a new lead in the system
- **Parameters**:
  - `name` (string, required): Name of the lead
  - `phone` (string, required): Phone number of the lead
- **Example Usage**:

```json
{
  "name": "John Doe",
  "phone": "1234567890"
}
```

#### Find Lead

- **Name**: `find-lead`
- **Description**: Find a lead by email or phone number
- **Parameters**:
  - `email` (string, optional): Email address of the lead
  - `phone` (string, optional): Phone number of the lead
  - Note: At least one of email or phone must be provided
- **Example Usage**:

```json
{
  "email": "john@example.com"
}
```

or

```json
{
  "phone": "1234567890"
}
```

or

```json
{
  "email": "john@example.com",
  "phone": "1234567890"
}
```

#### Get All Leads

- **Name**: `get-leads`
- **Description**: Get all leads in the system
- **Parameters**:
  - `all` (boolean, optional): Optional parameter to get all leads
- **Example Usage**:

```json
{
  "all": true
}
```

or simply use the command without parameters

#### Get Lead by ID

- **Name**: `get-lead`
- **Description**: Get a specific lead by ID
- **Parameters**:
  - `id` (string, required): ID of the lead to retrieve
- **Example Usage**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Update Lead

- **Name**: `update-lead`
- **Description**: Update a lead's status by ID
- **Parameters**:
  - `id` (string, required): ID of the lead to update
  - `status` (string, required): New status for the lead
- **Example Usage**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "BOOKED"
}
```

#### Delete Lead

- **Name**: `delete-lead`
- **Description**: Delete a lead by ID
- **Parameters**:
  - `id` (string, required): ID of the lead to delete
- **Example Usage**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Tag Tools

#### Create Tag

- **Name**: `create-tag`
- **Description**: Create a new tag for leads
- **Parameters**:
  - `name` (string, required): Name of the tag
- **Example Usage**:

```json
{
  "name": "VIP"
}
```

#### Get All Tags

- **Name**: `get-tags`
- **Description**: Get all available tags
- **Parameters**: None required
- **Example Usage**: Use the command without parameters

#### Get Tag by ID

- **Name**: `get-tag`
- **Description**: Get a specific tag by ID
- **Parameters**:
  - `id` (string, required): ID of the tag to retrieve
- **Example Usage**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Update Tag

- **Name**: `update-tag`
- **Description**: Update a tag by ID
- **Parameters**:
  - `id` (string, required): ID of the tag to update
  - `name` (string, required): New name for the tag
- **Example Usage**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Premium"
}
```

#### Delete Tag

- **Name**: `delete-tag`
- **Description**: Delete a tag by ID
- **Parameters**:
  - `id` (string, required): ID of the tag to delete
- **Example Usage**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Schema Design Patterns

### Parameterless Tools

For tools that don't require input (like "get all leads" or "get all tags"), use this pattern:

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

### Required Parameters

For tools that require specific parameters:

```typescript
inputSchema: {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "ID of the item",
    },
    name: {
      type: "string",
      description: "Name of the item",
    }
  },
  required: ["id", "name"], // Specify required parameters
  additionalProperties: false
}
```

Remember to:

1. Use descriptive parameter names
2. Provide clear descriptions
3. Make parameters optional when possible
4. Use appropriate validation rules
5. Consider natural language processing when naming parameters
