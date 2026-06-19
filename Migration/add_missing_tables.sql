-- Migration: Membuat tabel yang belum tersedia di Supabase
-- Tabel: stock_opnames, stock_opname_items, sales_targets, product_categories, visit_reminders

-- 1. PRODUCT CATEGORIES (many-to-many: produk bisa punya banyak kategori)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, category_id)
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_categories_select_policy ON product_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY product_categories_insert_policy ON product_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY product_categories_update_policy ON product_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY product_categories_delete_policy ON product_categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2. SALES TARGETS (menggantikan sheet 27_TARGET_SALES)
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  target_omzet NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_kunjungan INTEGER NOT NULL DEFAULT 0,
  target_customer_baru INTEGER NOT NULL DEFAULT 0,
  komisi_target NUMERIC(15,2) NOT NULL DEFAULT 0,
  pencapaian_omzet NUMERIC(15,2) NOT NULL DEFAULT 0,
  pencapaian_kunjungan INTEGER NOT NULL DEFAULT 0,
  persentase_pencapaian NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_targets_select_policy ON sales_targets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY sales_targets_insert_policy ON sales_targets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY sales_targets_update_policy ON sales_targets
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY sales_targets_delete_policy ON sales_targets
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. STOCK OPNAMES
CREATE TABLE IF NOT EXISTS stock_opnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_opnames_select_policy ON stock_opnames
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY stock_opnames_insert_policy ON stock_opnames
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY stock_opnames_update_policy ON stock_opnames
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY stock_opnames_delete_policy ON stock_opnames
  FOR DELETE USING (auth.role() = 'authenticated');

-- 4. STOCK OPNAME ITEMS
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_sistem INTEGER NOT NULL DEFAULT 0,
  qty_fisik INTEGER NOT NULL DEFAULT 0,
  selisih INTEGER NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_opname_items_select_policy ON stock_opname_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY stock_opname_items_insert_policy ON stock_opname_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY stock_opname_items_update_policy ON stock_opname_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY stock_opname_items_delete_policy ON stock_opname_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- 5. VISIT REMINDERS (pengingat kunjungan berdasarkan jadwal)
CREATE TABLE IF NOT EXISTS visit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (reminder_type IN ('SCHEDULED','OVERDUE','FOLLOW_UP')),
  notes TEXT,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE visit_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_reminders_select_policy ON visit_reminders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY visit_reminders_insert_policy ON visit_reminders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY visit_reminders_update_policy ON visit_reminders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY visit_reminders_delete_policy ON visit_reminders
  FOR DELETE USING (auth.role() = 'authenticated');
