const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const serverUrl = (process.env.FRONTEND_URL || '').includes('localhost')
  ? 'http://localhost:5000'
  : 'https://imboni-eyelink-backend.onrender.com';

const serverDesc = (process.env.FRONTEND_URL || '').includes('localhost')
  ? 'Local server'
  : 'Production server';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IMBONI EyeLink API',
      version: '1.0.0',
      description: 'API for IMBONI EyeLink eye care platform',
    },
    servers: [
      { url: serverUrl, description: serverDesc },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server.js'],
};

const specs = swaggerJsDoc(options);

function setupSwagger(app) {
  app.get('/api-docs.json', (req, res) => res.json(specs));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
  return specs;
}

module.exports = { setupSwagger, specs };