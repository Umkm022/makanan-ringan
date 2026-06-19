CREATE TABLE IF NOT EXISTS stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  sales_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_status CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED'))
);

CREATE TABLE IF NOT EXISTS stock_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty_requested INTEGER NOT NULL DEFAULT 0,
  qty_approved INTEGER
);
