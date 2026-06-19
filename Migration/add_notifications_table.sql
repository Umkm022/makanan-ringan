-- Migration: Membuat tabel notifications untuk menyimpan notifikasi user
-- Digunakan oleh fitur: Request Stok, Setoran, Komisi, Customer Baru, Titip Awal

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipe TEXT NOT NULL DEFAULT 'INFO',
  judul TEXT NOT NULL DEFAULT '',
  pesan TEXT NOT NULL DEFAULT '',
  link TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk mempercepat query notifikasi unread per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- Row Level Security: user hanya bisa melihat notifikasi miliknya sendiri
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT untuk user yang memiliki notifikasi
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT USING (auth.uid() IN (
    SELECT auth_id FROM users WHERE id = user_id
  ));

-- Policy: INSERT untuk semua user yang terautentikasi (dibutuhkan untuk insert dari client)
DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
