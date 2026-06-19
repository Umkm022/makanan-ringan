-- Add stock_brought column to visit_details for tracking stock
-- that Sales physically brings from warehouse during a visit

ALTER TABLE visit_details ADD COLUMN IF NOT EXISTS stock_brought integer DEFAULT 0;
