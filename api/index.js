import express from 'express';
import cors from 'cors';
import apiRouter from '../server/apiRouter.js';

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
  console.error('[Vercel Function] Failed to resolve router function from apiRouter module');
}

export default app;
