const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/stock-out?from=&to=&kitchen_id=&item_id=
router.get('/', authenticate, async (req, res) => {
  const { from, to, kitchen_id, item_id } = req.query;
  try {
    let query = `
      SELECT so.*, i.name AS item_name, i.unit, k.name AS kitchen_name,
             u.name AS dispatched_by_name
      FROM stock_out so
      JOIN items i ON i.id = so.item_id
      JOIN kitchens k ON k.id = so.kitchen_id
      LEFT JOIN users u ON u.id = so.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (from) { query += ` AND so.dispatch_date >= $${idx++}`; params.push(from); }
    if (to) { query += ` AND so.dispatch_date <= $${idx++}`; params.push(to); }
    if (kitchen_id) { query += ` AND so.kitchen_id = $${idx++}`; params.push(kitchen_id); }
    if (item_id) { query += ` AND so.item_id = $${idx++}`; params.push(item_id); }
    query += ' ORDER BY so.dispatch_date DESC, so.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stock-out
router.post('/', authenticate, async (req, res) => {
  const { item_id, kitchen_id, quantity, dispatch_date, notes } = req.body;
  if (!item_id || !kitchen_id || !quantity || !dispatch_date) {
    return res.status(400).json({ error: 'Item, kitchen, quantity, and dispatch date are required.' });
  }
  try {
    // Check sufficient stock
    const balance = await pool.query('SELECT current_stock FROM stock_balance WHERE item_id=$1', [item_id]);
    if (balance.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    if (parseFloat(balance.rows[0].current_stock) < parseFloat(quantity)) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${balance.rows[0].current_stock}` });
    }

    const result = await pool.query(
      `INSERT INTO stock_out (item_id, kitchen_id, quantity, dispatch_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [item_id, kitchen_id, quantity, dispatch_date, notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stock-out/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { item_id, kitchen_id, quantity, dispatch_date, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE stock_out SET item_id=$1, kitchen_id=$2, quantity=$3, dispatch_date=$4, notes=$5
       WHERE id=$6 RETURNING *`,
      [item_id, kitchen_id, quantity, dispatch_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stock-out/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM stock_out WHERE id=$1', [req.params.id]);
    res.json({ message: 'Record deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
