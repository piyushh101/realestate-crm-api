// OpenAPI 3.0 spec, served at /docs by swagger-ui-express.
// ponytail: hand-written spec, generate from Zod (zod-openapi) if routes grow a lot.

const bearer = [{ bearerAuth: [] }];
const idParam = { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } };
const json = (schema: object) => ({ content: { "application/json": { schema } } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const err = (description: string) => ({ description, ...json(ref("Error")) });

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Real Estate Lead CRM API",
    version: "1.0.0",
    description:
      "Lead management backend: visitors submit enquiries, admins assign them to agents, agents move leads through a pipeline. " +
      "Login via /auth/login, copy the token, click Authorize.",
  },
  servers: [{ url: "/" }],
  tags: [{ name: "Auth" }, { name: "Properties" }, { name: "Leads" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: {
        type: "object",
        properties: { success: { type: "boolean", example: false }, message: { type: "string" }, errors: { type: "array", items: {} } },
      },
      User: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" }, email: { type: "string" }, role: { type: "string", enum: ["admin", "agent"] } },
      },
      Property: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          city: { type: "string" },
          price: { type: "integer", example: 4500000 },
          type: { type: "string", enum: ["apartment", "villa", "plot"] },
          status: { type: "string", enum: ["available", "sold"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Lead: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          phone: { type: "string" },
          message: { type: "string", nullable: true },
          status: { type: "string", enum: ["new", "contacted", "site_visit", "closed", "lost"] },
          propertyId: { type: "integer" },
          assignedToId: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PropertyInput: {
        type: "object",
        required: ["title", "city", "price", "type"],
        properties: {
          title: { type: "string", minLength: 3, example: "3BHK Villa in Rau" },
          city: { type: "string", minLength: 2, example: "Indore" },
          price: { type: "integer", minimum: 1, example: 8500000 },
          type: { type: "string", enum: ["apartment", "villa", "plot"] },
          status: { type: "string", enum: ["available", "sold"] },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register (always created as agent)",
        requestBody: json({
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Rahul" },
            email: { type: "string", format: "email", example: "rahul@test.com" },
            password: { type: "string", minLength: 8, example: "secret123" },
          },
        }),
        responses: { 201: { description: "Created", ...json(ref("User")) }, 400: err("Validation failed"), 409: err("Email already registered") },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login, returns JWT (7 days)",
        requestBody: json({
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        }),
        responses: {
          200: { description: "Token", ...json({ type: "object", properties: { success: { type: "boolean" }, data: { type: "object", properties: { token: { type: "string" } } } } }) },
          401: err("Invalid email or password"),
        },
      },
    },
    "/me": {
      get: { tags: ["Auth"], summary: "Current user from token", security: bearer, responses: { 200: { description: "OK" }, 401: err("Unauthorized") } },
    },
    "/properties": {
      get: {
        tags: ["Properties"],
        summary: "List properties with filters and pagination",
        security: bearer,
        parameters: [
          { name: "city", in: "query", schema: { type: "string" }, description: "Case-insensitive" },
          { name: "type", in: "query", schema: { type: "string", enum: ["apartment", "villa", "plot"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["available", "sold"] } },
          { name: "minPrice", in: "query", schema: { type: "integer", minimum: 0 } },
          { name: "maxPrice", in: "query", schema: { type: "integer", minimum: 0 } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 10 } },
        ],
        responses: { 200: { description: "Paginated list" }, 400: err("Invalid query"), 401: err("Unauthorized") },
      },
      post: {
        tags: ["Properties"],
        summary: "Create property (admin)",
        security: bearer,
        requestBody: json(ref("PropertyInput")),
        responses: { 201: { description: "Created", ...json(ref("Property")) }, 400: err("Validation failed"), 403: err("Forbidden") },
      },
    },
    "/properties/{id}": {
      patch: {
        tags: ["Properties"],
        summary: "Update property (admin)",
        security: bearer,
        parameters: [idParam],
        requestBody: json(ref("PropertyInput")),
        responses: { 200: { description: "Updated", ...json(ref("Property")) }, 403: err("Forbidden"), 404: err("Property not found") },
      },
      delete: {
        tags: ["Properties"],
        summary: "Delete property (admin). Blocked if it has leads.",
        security: bearer,
        parameters: [idParam],
        responses: { 200: { description: "Deleted" }, 404: err("Property not found"), 409: err("Property has leads, mark it as sold instead") },
      },
    },
    "/leads": {
      post: {
        tags: ["Leads"],
        summary: "Public enquiry form (no login)",
        requestBody: json({
          type: "object",
          required: ["name", "phone", "propertyId"],
          properties: {
            name: { type: "string", example: "Rahul" },
            phone: { type: "string", pattern: "^[6-9]\\d{9}$", example: "9876543210" },
            message: { type: "string", maxLength: 500 },
            propertyId: { type: "integer", example: 1 },
          },
        }),
        responses: { 201: { description: "Created", ...json(ref("Lead")) }, 400: err("Invalid input or property sold"), 404: err("Property not found") },
      },
      get: {
        tags: ["Leads"],
        summary: "Admin: all leads. Agent: only assigned leads.",
        security: bearer,
        responses: { 200: { description: "List" }, 401: err("Unauthorized") },
      },
    },
    "/leads/{id}/assign": {
      patch: {
        tags: ["Leads"],
        summary: "Assign lead to an agent (admin)",
        security: bearer,
        parameters: [idParam],
        requestBody: json({ type: "object", required: ["agentId"], properties: { agentId: { type: "integer" } } }),
        responses: { 200: { description: "Assigned", ...json(ref("Lead")) }, 400: err("Invalid agent"), 403: err("Forbidden"), 404: err("Lead not found") },
      },
    },
    "/leads/{id}/status": {
      patch: {
        tags: ["Leads"],
        summary: "Move lead to a valid next status (admin or assigned agent)",
        description: "new → contacted | lost, contacted → site_visit | lost, site_visit → closed | lost. closed and lost are final.",
        security: bearer,
        parameters: [idParam],
        requestBody: json({ type: "object", required: ["status"], properties: { status: { type: "string", enum: ["new", "contacted", "site_visit", "closed", "lost"] } } }),
        responses: { 200: { description: "Updated", ...json(ref("Lead")) }, 400: err("Invalid transition"), 404: err("Lead not found (or not yours)") },
      },
    },
  },
};