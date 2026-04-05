-- Fix missing tables causing Item Editing to crash
-- These tables are referenced in InventoryService.getItemDetails

CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS item_prices (
    id TEXT PRIMARY KEY,
    price_list_id TEXT,
    item_id TEXT,
    unit_id TEXT,
    price DECIMAL(18,4),
    FOREIGN KEY(price_list_id) REFERENCES price_lists(id),
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS item_kits (
    parent_item_id TEXT,
    child_item_id TEXT,
    quantity DECIMAL(18,4),
    FOREIGN KEY(parent_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(child_item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS item_alternatives (
    item_id TEXT,
    alternative_item_id TEXT,
    note TEXT,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(alternative_item_id) REFERENCES items(id)
);
