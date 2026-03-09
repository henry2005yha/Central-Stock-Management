const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/suppliers
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, contact, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
  try {
    const result = await pool.query(
      'INSERT INTO suppliers (name, contact, phone, address) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, contact, phone, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/suppliers/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, contact, phone, address } = req.body;
  try {
    const result = await pool.query(
      'UPDATE suppliers SET name=$1, contact=$2, phone=$3, address=$4 WHERE id=$5 RETURNING *',
      [name, contact, phone, address, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/suppliers/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM suppliers WHERE id=$1', [req.params.id]);
    res.json({ message: 'Supplier deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
