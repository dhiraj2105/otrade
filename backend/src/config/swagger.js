import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Opinion Trading Platform API',
      version: '1.0.0',
      description: 'API documentation for the Opinion Trading Platform',
      contact: {
        name: 'API Support',
        email: 'support@otrade.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Events',
        description: 'Event management endpoints'
      },
      {
        name: 'Trading',
        description: 'Trading and order management endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin panel endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js'
  ]
};

export const specs = swaggerJsdoc(options);
