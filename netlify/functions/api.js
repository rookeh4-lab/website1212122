import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import apiRouter from '../../server/apiRouter.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const resolvedRouter = (apiRouter && apiRouter.default) ? apiRouter.default : apiRouter;

// Mount the API router at both root (when rewritten) and /api
app.use('/api', resolvedRouter);
app.use('/', resolvedRouter);

const serverlessWrapper = (serverless && serverless.default) ? serverless.default : serverless;
export const handler = serverlessWrapper(app);
