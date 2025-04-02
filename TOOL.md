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
