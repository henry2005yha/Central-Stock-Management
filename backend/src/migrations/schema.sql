-- Warehouse Stock Management System Schema
-- Run this script to create all tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Kitchens (5 delivery destinations)
CREATE TABLE IF NOT EXISTS kitchens (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  manager_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(100),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock Items catalog
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50) NOT NULL,
  min_stock_level DECIMAL(10,3) DEFAULT 0,
  supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock In: Goods received from supplier
CREATE TABLE IF NOT EXISTS stock_in (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) DEFAULT 0,
  received_date DATE NOT NULL,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock Out: Goods dispatched to kitchen
CREATE TABLE IF NOT EXISTS stock_out (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kitchen_id INT NOT NULL REFERENCES kitchens(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  dispatch_date DATE NOT NULL,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit: Physical count vs system count
CREATE TABLE IF NOT EXISTS audits (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  expected_qty DECIMAL(10,3) NOT NULL,
  actual_qty DECIMAL(10,3) NOT NULL,
  difference DECIMAL(10,3) GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,
  notes TEXT,
  audit_date DATE NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- View: Real-time stock balance per item
CREATE OR REPLACE VIEW stock_balance AS
SELECT
  i.id AS item_id,
  i.name AS item_name,
  i.category,
  i.unit,
  i.min_stock_level,
  s.name AS supplier_name,
  COALESCE(si.total_in, 0) AS total_in,
  COALESCE(so.total_out, 0) AS total_out,
  COALESCE(adj.total_adjustment, 0) AS total_adjustment,
  COALESCE(si.total_in, 0) - COALESCE(so.total_out, 0) + COALESCE(adj.total_adjustment, 0) AS current_stock,
  CASE
    WHEN (COALESCE(si.total_in, 0) - COALESCE(so.total_out, 0) + COALESCE(adj.total_adjustment, 0)) <= i.min_stock_level
    THEN true ELSE false
  END AS is_low_stock
FROM items i
LEFT JOIN suppliers s ON s.id = i.supplier_id
LEFT JOIN (
  SELECT item_id, SUM(quantity) AS total_in FROM stock_in GROUP BY item_id
) si ON si.item_id = i.id
LEFT JOIN (
  SELECT item_id, SUM(quantity) AS total_out FROM stock_out GROUP BY item_id
) so ON so.item_id = i.id
LEFT JOIN (
  SELECT item_id, SUM(actual_qty - expected_qty) AS total_adjustment
  FROM audits GROUP BY item_id
) adj ON adj.item_id = i.id;
