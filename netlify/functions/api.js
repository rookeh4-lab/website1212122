import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import apiRouter from '../../server/apiRouter.js';

function unwrap(mod) {
  let target = mod;
  while (target && typeof target !== 'function' && target.default) {
    target = target.default;
  }
  return target;
}

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const router = unwrap(apiRouter);
if (typeof router === 'function') {
  app.use('/api', router);
  app.use('/', router);
} else {
  console.error('[Netlify Function] Failed to resolve router function from apiRouter module');
}

const serverlessWrapper = unwrap(serverless);
export const handler = typeof serverlessWrapper === 'function' ? serverlessWrapper(app) : (event, context, cb) => cb(new Error('serverless is not a function'));
