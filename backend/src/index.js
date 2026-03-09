const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/kitchens', require('./routes/kitchens'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/items', require('./routes/items'));
app.use('/api/stock-in', require('./routes/stockIn'));
app.use('/api/stock-out', require('./routes/stockOut'));
app.use('/api/audits', require('./routes/audits'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/export', require('./routes/export'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Warehouse Stock API running on http://localhost:${PORT}`);
});
