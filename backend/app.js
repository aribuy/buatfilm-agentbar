import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './database.js';
import ordersRouter from './routes/orders-new.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Serve static files
app.use(express.static('../frontend/dist'));

// API routes
app.use('/api/orders', ordersRouter);

// Serve React app
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});