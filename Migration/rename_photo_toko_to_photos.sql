-- Rename column from photo_toko to photos in the visits table
-- This aligns the database column name with the frontend code

ALTER TABLE visits RENAME COLUMN photo_toko TO photos;
