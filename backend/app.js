require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Serve static files
app.use(express.static('../frontend/dist'));

// API routes
app.use('/api/orders', require('./routes/orders-new.js'));

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