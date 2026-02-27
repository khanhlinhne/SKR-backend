const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SKR System API",
      version: "2.0.0",
      description: "SKR System Backend API Documentation",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        description: "Development server",
        variables: {
          port: { default: "5000" },
        },
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      parameters: {
        TimezoneOffset: {
          in: "header",
          name: "X-Timezone-Offset",
          schema: { type: "number", example: 7 },
          required: false,
          description: "UTC offset in hours. Overrides the user's stored timezone. All datetime fields in the response will be converted accordingly.",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: {
              type: "array",
              nullable: true,
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            userId: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            username: { type: "string" },
            fullName: { type: "string", nullable: true },
            displayName: { type: "string", nullable: true },
            avatarUrl: { type: "string", nullable: true },
            timezoneOffset: { type: "integer", example: 7 },
            emailVerified: { type: "boolean" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        TokenResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            tokenType: { type: "string", example: "Bearer" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
