import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import apiRouter from '../../server/apiRouter.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount the API router at both root (when rewritten) and /api
app.use('/api', apiRouter);
app.use('/', apiRouter);

export const handler = serverless(app);
