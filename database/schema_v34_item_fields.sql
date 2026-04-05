-- Add New Fields to Item Master (User Request)
ALTER TABLE items ADD COLUMN production_line TEXT;
ALTER TABLE items ADD COLUMN default_supplier_id TEXT;
ALTER TABLE items ADD COLUMN warranty_info TEXT;
ALTER TABLE items ADD COLUMN grade TEXT;
