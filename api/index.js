import express from 'express';
import apiRouter from '../server/apiRouter.js';
import { applyAppSecurity } from '../server/httpSecurity.js';

function unwrap(mod) {
  let target = mod;
  while (target && typeof target !== 'function' && target.default) {
    target = target.default;
  }
  return target;
}

const app = express();
applyAppSecurity(app);

const router = unwrap(apiRouter);
if (typeof router === 'function') {
  app.use('/api', router);
  app.use('/', router);
} else {
  console.error('[Vercel Function] Failed to resolve router function from apiRouter module');
}

export default app;
