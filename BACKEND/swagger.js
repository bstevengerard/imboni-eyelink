const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IMBONI EyeLink API',
      version: '1.0.0',
      description: 'API for IMBONI EyeLink eye care platform',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local server' },
      { url: 'https://imboni-eyelink-backend-9ezl.onrender.com', description: 'Production server' },
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