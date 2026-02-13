-- Migration: Create order_supplier table for supplier cart integration
CREATE TABLE IF NOT EXISTS order_supplier (
  id SERIAL PRIMARY KEY,
  store VARCHAR(16) NOT NULL,
  supplier VARCHAR(64) NOT NULL,
  part_number VARCHAR(64) NOT NULL,
  name VARCHAR(128),
  qty INTEGER NOT NULL,
  price INTEGER DEFAULT 0,
  status VARCHAR(16) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_order_supplier_store ON order_supplier(store);
CREATE INDEX IF NOT EXISTS idx_order_supplier_supplier ON order_supplier(supplier);
CREATE INDEX IF NOT EXISTS idx_order_supplier_part_number ON order_supplier(part_number);
