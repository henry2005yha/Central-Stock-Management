const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audits?from=&to=
router.get('/', authenticate, async (req, res) => {
  const { from, to } = req.query;
  try {
    let query = `
      SELECT a.*, i.name AS item_name, i.unit, u.name AS audited_by_name
      FROM audits a
      JOIN items i ON i.id = a.item_id
      LEFT JOIN users u ON u.id = a.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (from) { query += ` AND a.audit_date >= $${idx++}`; params.push(from); }
    if (to) { query += ` AND a.audit_date <= $${idx++}`; params.push(to); }
    query += ' ORDER BY a.audit_date DESC, a.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/audits — capture physical count, auto-compute expected from system
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { item_id, actual_qty, notes, audit_date } = req.body;
  if (!item_id || actual_qty === undefined || !audit_date) {
    return res.status(400).json({ error: 'Item, actual quantity, and date are required.' });
  }
  try {
    // Get system expected stock
    const balance = await pool.query('SELECT current_stock FROM stock_balance WHERE item_id=$1', [item_id]);
    if (balance.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    const expected_qty = parseFloat(balance.rows[0].current_stock);

    const result = await pool.query(
      `INSERT INTO audits (item_id, expected_qty, actual_qty, notes, audit_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [item_id, expected_qty, actual_qty, notes, audit_date, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/audits/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM audits WHERE id=$1', [req.params.id]);
    res.json({ message: 'Audit deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
