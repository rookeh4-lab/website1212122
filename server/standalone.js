import express from 'express';
import dotenv from 'dotenv';
import apiRouter from './apiRouter.js';
import { applyAppSecurity } from './httpSecurity.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5352;
applyAppSecurity(app);

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`[5.55 Licensing Server] Running on http://localhost:${PORT}`);
  console.log(`[5.55 Licensing Server] Connected to Supabase Project: thmpaozerfhoykqxwrlz`);
});
