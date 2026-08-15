const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'TrustLink AI API',
    version: '1.0.0',
    description:
      'REST API for TrustLink AI — Connecting Communities with Trusted Local Services.\n\n' +
      '**Auth:** click Authorize and paste a JWT from `POST /api/auth/login` as `Bearer <token>`.\n\n' +
      '**AI:** `POST /api/ai/recommend` uses heuristic ranking always. If `OPENAI_API_KEY` or `GEMINI_API_KEY` is set, natural-language parsing and review summaries use that model.\n\n' +
      '**Sentry:** `GET /api/debug/sentry` captures a sample error for monitoring verification.',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local API' },
    { url: '/', description: 'Current host (Vite proxy or production)' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Providers' },
    { name: 'Requests' },
    { name: 'Reviews' },
    { name: 'Favorites' },
    { name: 'AI' },
    { name: 'Admin' },
    { name: 'Monitoring' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'customer@trustlink.ai' },
          password: { type: 'string', example: 'Customer123!' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'phone'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          phone: { type: 'string', example: '03001234567' },
          city: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'provider'] },
        },
      },
      RecommendRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            example: 'I need an electrician for home wiring under PKR 5000 near Johar Town',
          },
        },
      },
      ServiceRequest: {
        type: 'object',
        required: ['provider', 'description'],
        properties: {
          provider: { type: 'string' },
          service: { type: 'string' },
          description: { type: 'string' },
          budget: { type: 'number' },
          preferredDate: { type: 'string', format: 'date' },
          preferredTime: { type: 'string' },
          location: { type: 'string' },
          customerPhone: { type: 'string' },
          paymentMethod: {
            type: 'string',
            enum: ['jazzcash', 'easypaisa', 'card', 'cash'],
          },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'API + database health',
        responses: {
          200: { description: 'API is up' },
          503: { description: 'Database disconnected' },
        },
      },
    },
    '/api/stats': {
      get: {
        tags: ['Health'],
        summary: 'Public platform counts (categories, verified providers, reviews)',
        responses: { 200: { description: 'Live database counts' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a customer or provider',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          201: { description: 'Account created + JWT' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive a JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'token + user' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile' },
          401: { description: 'Not authorized' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Send password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description:
              'If the account exists, email was sent or an on-page reset link is returned',
          },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with email token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string' },
                  confirmPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated + JWT' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Providers'],
        summary: 'List service categories',
        responses: { 200: { description: 'Category list' } },
      },
    },
    '/api/providers': {
      get: {
        tags: ['Providers'],
        summary: 'Search and filter providers',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug' },
          { name: 'minRating', in: 'query', schema: { type: 'number' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'available', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', example: 'rating' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 9 } },
        ],
        responses: { 200: { description: 'Paginated providers' } },
      },
      post: {
        tags: ['Providers'],
        summary: 'Create provider business profile',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Profile created (pending approval)' },
          401: { description: 'Not authorized' },
        },
      },
    },
    '/api/providers/{id}': {
      get: {
        tags: ['Providers'],
        summary: 'Provider details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Provider' },
          404: { description: 'Not found or not approved' },
        },
      },
    },
    '/api/reviews/provider/{providerId}': {
      get: {
        tags: ['Reviews'],
        summary: 'List reviews for a provider',
        parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Reviews + rating distribution' } },
      },
    },
    '/api/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Create a review (one per customer per provider)',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Review created' },
          400: { description: 'Invalid rating or duplicate' },
        },
      },
    },
    '/api/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'List current user favorites',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Favorite providers' } },
      },
    },
    '/api/favorites/toggle': {
      post: {
        tags: ['Favorites'],
        summary: 'Toggle favorite for a provider',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['providerId'],
                properties: { providerId: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'favorited true/false' } },
      },
    },
    '/api/requests': {
      post: {
        tags: ['Requests'],
        summary: 'Create a service request',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ServiceRequest' } } },
        },
        responses: {
          201: { description: 'Request created' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/api/requests/my': {
      get: {
        tags: ['Requests'],
        summary: 'Customer: my requests',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Request list' } },
      },
    },
    '/api/requests/provider': {
      get: {
        tags: ['Requests'],
        summary: 'Provider: incoming requests only for this provider',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Request list' } },
      },
    },
    '/api/requests/{id}': {
      get: {
        tags: ['Requests'],
        summary: 'Request details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Request' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/requests/{id}/accept': {
      put: {
        tags: ['Requests'],
        summary: 'Provider accepts a request',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated request' } },
      },
    },
    '/api/requests/{id}/reject': {
      put: {
        tags: ['Requests'],
        summary: 'Provider rejects a request',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated request' } },
      },
    },
    '/api/requests/{id}/complete': {
      put: {
        tags: ['Requests'],
        summary: 'Provider marks request completed',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated request' } },
      },
    },
    '/api/requests/{id}/cancel': {
      put: {
        tags: ['Requests'],
        summary: 'Customer cancels a pending request',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Cancelled' } },
      },
    },
    '/api/ai/recommend': {
      post: {
        tags: ['AI'],
        summary: 'AI / heuristic provider recommendations',
        description:
          'Always ranks with the TrustLink scoring engine. Optional OpenAI or Gemini improves query parsing when API keys are set.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RecommendRequest' } } },
        },
        responses: { 200: { description: 'Ranked providers, explanation, filters, mode' } },
      },
    },
    '/api/ai/parse': {
      post: {
        tags: ['AI'],
        summary: 'Parse a natural-language query into filters',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RecommendRequest' } } },
        },
        responses: { 200: { description: 'Parsed filters' } },
      },
    },
    '/api/ai/reviews/{providerId}/summary': {
      get: {
        tags: ['AI'],
        summary: 'AI or heuristic review summary for a provider',
        parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'summary + source (llm or heuristic)' } },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Admin dashboard counts',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Stats' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/api/admin/providers': {
      get: {
        tags: ['Admin'],
        summary: 'List all providers including pending',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Providers' } },
      },
    },
    '/api/admin/providers/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Approve or reject a provider',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', enum: ['approved', 'rejected', 'pending'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated provider' } },
      },
    },
    '/api/debug/sentry': {
      get: {
        tags: ['Monitoring'],
        summary: 'Capture a sample error for Sentry verification',
        description:
          'Throws/captures a known sample exception. Check Sentry → Issues after calling this.',
        responses: {
          500: { description: 'Sample error captured (check Sentry dashboard)' },
        },
      },
    },
  },
};

module.exports = openapi;
