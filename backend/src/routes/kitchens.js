const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/kitchens
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kitchens ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/kitchens
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, location, manager_name } = req.body;
  if (!name) return res.status(400).json({ error: 'Kitchen name is required.' });
  try {
    const result = await pool.query(
      'INSERT INTO kitchens (name, location, manager_name) VALUES ($1,$2,$3) RETURNING *',
      [name, location, manager_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/kitchens/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, location, manager_name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE kitchens SET name=$1, location=$2, manager_name=$3 WHERE id=$4 RETURNING *',
      [name, location, manager_name, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kitchen not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/kitchens/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM kitchens WHERE id=$1', [req.params.id]);
    res.json({ message: 'Kitchen deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
