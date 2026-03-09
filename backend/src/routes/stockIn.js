const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/stock-in?from=&to=&supplier_id=&item_id=
router.get('/', authenticate, async (req, res) => {
  const { from, to, supplier_id, item_id } = req.query;
  try {
    let query = `
      SELECT si.*, i.name AS item_name, i.unit, s.name AS supplier_name,
             u.name AS received_by_name
      FROM stock_in si
      JOIN items i ON i.id = si.item_id
      LEFT JOIN suppliers s ON s.id = si.supplier_id
      LEFT JOIN users u ON u.id = si.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (from) { query += ` AND si.received_date >= $${idx++}`; params.push(from); }
    if (to) { query += ` AND si.received_date <= $${idx++}`; params.push(to); }
    if (supplier_id) { query += ` AND si.supplier_id = $${idx++}`; params.push(supplier_id); }
    if (item_id) { query += ` AND si.item_id = $${idx++}`; params.push(item_id); }
    query += ' ORDER BY si.received_date DESC, si.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stock-in
router.post('/', authenticate, async (req, res) => {
  const { item_id, supplier_id, quantity, unit_price, received_date, notes } = req.body;
  if (!item_id || !quantity || !received_date) {
    return res.status(400).json({ error: 'Item, quantity, and received date are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO stock_in (item_id, supplier_id, quantity, unit_price, received_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [item_id, supplier_id || null, quantity, unit_price || 0, received_date, notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stock-in/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { item_id, supplier_id, quantity, unit_price, received_date, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE stock_in SET item_id=$1, supplier_id=$2, quantity=$3, unit_price=$4,
       received_date=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [item_id, supplier_id || null, quantity, unit_price || 0, received_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stock-in/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM stock_in WHERE id=$1', [req.params.id]);
    res.json({ message: 'Record deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
