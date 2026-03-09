const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/items (with current stock balance)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stock_balance ORDER BY item_name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/items/catalog (for dropdowns - no balance computation)
router.get('/catalog', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, s.name AS supplier_name FROM items i
       LEFT JOIN suppliers s ON s.id = i.supplier_id ORDER BY i.name`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/items/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stock_balance WHERE item_id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/items
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, category, unit, min_stock_level, supplier_id } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'Name and unit are required.' });
  try {
    const result = await pool.query(
      'INSERT INTO items (name, category, unit, min_stock_level, supplier_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, category, unit, min_stock_level || 0, supplier_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/items/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, category, unit, min_stock_level, supplier_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE items SET name=$1, category=$2, unit=$3, min_stock_level=$4, supplier_id=$5 WHERE id=$6 RETURNING *',
      [name, category, unit, min_stock_level, supplier_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/items/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id=$1', [req.params.id]);
    res.json({ message: 'Item deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
