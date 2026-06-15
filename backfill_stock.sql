-- Tambah unique constraint di product_id (dibutuhkan untuk ON CONFLICT)
ALTER TABLE warehouse_stock ADD CONSTRAINT warehouse_stock_product_id_key UNIQUE (product_id);

-- Backfill stok dari produksi yang sudah ada
INSERT INTO warehouse_stock (product_id, qty_in, qty_out, qty_remaining, unit)
SELECT 
  p.product_id,
  SUM(p.qty) as qty_in,
  0 as qty_out,
  SUM(p.qty) as qty_remaining,
  'PCS' as unit
FROM productions p
WHERE NOT EXISTS (
  SELECT 1 FROM warehouse_stock ws WHERE ws.product_id = p.product_id
)
GROUP BY p.product_id
ON CONFLICT (product_id) DO UPDATE
SET qty_in = warehouse_stock.qty_in + EXCLUDED.qty_in,
    qty_remaining = warehouse_stock.qty_remaining + EXCLUDED.qty_remaining;
