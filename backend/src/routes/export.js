const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { stringify } = require('csv-stringify');

const sendCSV = (res, filename, rows) => {
  if (rows.length === 0) return res.status(404).json({ error: 'No data to export.' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  stringify(rows, { header: true, cast: { date: v => v.toISOString().split('T')[0] } }).pipe(res);
};

// GET /api/export/stock-in
router.get('/stock-in', authenticate, async (req, res) => {
  const { from, to, supplier_id } = req.query;
  let query = `
    SELECT si.received_date, i.name item_name, i.unit, si.quantity, si.unit_price,
           s.name supplier, u.name received_by, si.notes
    FROM stock_in si JOIN items i ON i.id=si.item_id
    LEFT JOIN suppliers s ON s.id=si.supplier_id
    LEFT JOIN users u ON u.id=si.created_by WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (from) { query += ` AND si.received_date >= $${idx++}`; params.push(from); }
  if (to) { query += ` AND si.received_date <= $${idx++}`; params.push(to); }
  if (supplier_id) { query += ` AND si.supplier_id = $${idx++}`; params.push(supplier_id); }
  query += ' ORDER BY si.received_date DESC';
  try {
    const result = await pool.query(query, params);
    sendCSV(res, `stock-in-${new Date().toISOString().split('T')[0]}.csv`, result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/stock-out
router.get('/stock-out', authenticate, async (req, res) => {
  const { from, to, kitchen_id } = req.query;
  let query = `
    SELECT so.dispatch_date, i.name item_name, i.unit, so.quantity,
           k.name kitchen, u.name dispatched_by, so.notes
    FROM stock_out so JOIN items i ON i.id=so.item_id
    JOIN kitchens k ON k.id=so.kitchen_id
    LEFT JOIN users u ON u.id=so.created_by WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (from) { query += ` AND so.dispatch_date >= $${idx++}`; params.push(from); }
  if (to) { query += ` AND so.dispatch_date <= $${idx++}`; params.push(to); }
  if (kitchen_id) { query += ` AND so.kitchen_id = $${idx++}`; params.push(kitchen_id); }
  query += ' ORDER BY so.dispatch_date DESC';
  try {
    const result = await pool.query(query, params);
    sendCSV(res, `stock-out-${new Date().toISOString().split('T')[0]}.csv`, result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/stock-balance
router.get('/stock-balance', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT item_name, category, unit, total_in, total_out, total_adjustment, current_stock, min_stock_level, is_low_stock, supplier_name FROM stock_balance ORDER BY item_name'
    );
    sendCSV(res, `stock-balance-${new Date().toISOString().split('T')[0]}.csv`, result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/audits
router.get('/audits', authenticate, async (req, res) => {
  const { from, to } = req.query;
  let query = `
    SELECT a.audit_date, i.name item_name, i.unit, a.expected_qty, a.actual_qty,
           a.difference, u.name audited_by, a.notes
    FROM audits a JOIN items i ON i.id=a.item_id
    LEFT JOIN users u ON u.id=a.created_by WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (from) { query += ` AND a.audit_date >= $${idx++}`; params.push(from); }
  if (to) { query += ` AND a.audit_date <= $${idx++}`; params.push(to); }
  query += ' ORDER BY a.audit_date DESC';
  try {
    const result = await pool.query(query, params);
    sendCSV(res, `audits-${new Date().toISOString().split('T')[0]}.csv`, result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
