-- Backfill stok dari produksi yang sudah ada
-- Only insert for products not yet in warehouse_stock
-- Removed UNIQUE constraint addition: add it manually if needed after checking for duplicates:
--   ALTER TABLE warehouse_stock ADD CONSTRAINT warehouse_stock_product_id_key UNIQUE (product_id);

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
GROUP BY p.product_id;
