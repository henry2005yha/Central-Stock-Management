const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    // Total items and stock balance
    const stockResult = await pool.query(`
      SELECT COUNT(*) AS total_items,
        COUNT(*) FILTER (WHERE is_low_stock = true) AS low_stock_count,
        SUM(current_stock) AS total_units
      FROM stock_balance
    `);

    // Today's movements
    const today = new Date().toISOString().split('T')[0];
    const todayIn = await pool.query(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM stock_in WHERE received_date=$1', [today]
    );
    const todayOut = await pool.query(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM stock_out WHERE dispatch_date=$1', [today]
    );

    // Low stock items (with details)
    const lowStockItems = await pool.query(`
      SELECT item_id, item_name, unit, current_stock, min_stock_level, supplier_name
      FROM stock_balance WHERE is_low_stock = true ORDER BY current_stock ASC
    `);

    // Recent stock in (last 10)
    const recentIn = await pool.query(`
      SELECT si.*, i.name AS item_name, i.unit, s.name AS supplier_name
      FROM stock_in si JOIN items i ON i.id=si.item_id
      LEFT JOIN suppliers s ON s.id=si.supplier_id
      ORDER BY si.received_date DESC, si.created_at DESC LIMIT 10
    `);

    // Recent stock out (last 10)
    const recentOut = await pool.query(`
      SELECT so.*, i.name AS item_name, i.unit, k.name AS kitchen_name
      FROM stock_out so JOIN items i ON i.id=so.item_id JOIN kitchens k ON k.id=so.kitchen_id
      ORDER BY so.dispatch_date DESC, so.created_at DESC LIMIT 10
    `);

    // Daily movement for last 30 days
    const dailyMovement = await pool.query(`
      SELECT date_series, 
             COALESCE(si.total_in, 0) AS total_in,
             COALESCE(so.total_out, 0) AS total_out
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '29 days')::date,
        CURRENT_DATE,
        '1 day'::interval
      ) AS date_series
      LEFT JOIN (
        SELECT received_date, SUM(quantity) AS total_in FROM stock_in GROUP BY received_date
      ) si ON si.received_date = date_series
      LEFT JOIN (
        SELECT dispatch_date, SUM(quantity) AS total_out FROM stock_out GROUP BY dispatch_date
      ) so ON so.dispatch_date = date_series
      ORDER BY date_series
    `);

    // Per-kitchen dispatch totals (current month)
    const kitchenTotals = await pool.query(`
      SELECT k.name AS kitchen_name, COALESCE(SUM(so.quantity), 0) AS total_dispatched
      FROM kitchens k
      LEFT JOIN stock_out so ON so.kitchen_id = k.id
        AND EXTRACT(MONTH FROM so.dispatch_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM so.dispatch_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY k.id, k.name
      ORDER BY total_dispatched DESC
    `);

    res.json({
      summary: {
        total_items: parseInt(stockResult.rows[0].total_items),
        low_stock_count: parseInt(stockResult.rows[0].low_stock_count),
        total_units: parseFloat(stockResult.rows[0].total_units || 0),
        today_in: parseFloat(todayIn.rows[0].total),
        today_out: parseFloat(todayOut.rows[0].total),
      },
      low_stock_items: lowStockItems.rows,
      recent_in: recentIn.rows,
      recent_out: recentOut.rows,
      daily_movement: dailyMovement.rows,
      kitchen_totals: kitchenTotals.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
