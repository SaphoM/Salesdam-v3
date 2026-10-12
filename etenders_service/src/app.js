import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import routes from './routes/index.js';
import swaggerSpec from './docs/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware.js';

const app = express();

app.set('trust proxy', 1); // needed for correct req.ip behind a reverse proxy/load balancer

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Swagger UI - interactive "try it out" view for the API
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'eTenders Service API Docs',
  })
);
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'eTenders service is running. See /api-docs for the API reference.',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
