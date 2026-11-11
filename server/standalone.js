import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './apiRouter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5352;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`[5.55 Licensing Server] Running on http://localhost:${PORT}`);
  console.log(`[5.55 Licensing Server] Connected to Supabase Project: thmpaozerfhoykqxwrlz`);
});
