-- SameSalt agent: D1 schema.
-- Reference data (read-only at runtime): medicines, ja_products, kendras, meta.
-- Impact log (write-only from the app, aggregate-only on /impact): lookups.

CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT,
  salt TEXT,              -- composition as printed in the source dataset
  ckey TEXT,              -- canonical key: sorted salts:strength | form | release
  price REAL,             -- printed MRP (INR) for the pack, source dataset (Nov 2022)
  pack REAL,              -- units per pack
  unit_price REAL,        -- price / pack
  form TEXT,
  rel TEXT,
  nti INTEGER DEFAULT 0,  -- narrow-therapeutic-index: never suggest a switch
  incomplete INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_med_ckey ON medicines(ckey, unit_price);
CREATE INDEX IF NOT EXISTS idx_med_name ON medicines(name COLLATE NOCASE);

-- Official PMBJP (Jan Aushadhi) product basket with MRPs, loaded by data/build_ja.py
CREATE TABLE IF NOT EXISTS ja_products (
  drug_code TEXT PRIMARY KEY,
  generic_name TEXT NOT NULL,
  unit_size TEXT,
  mrp REAL,
  group_name TEXT,
  ckey TEXT,
  units REAL,
  unit_price REAL
);
CREATE INDEX IF NOT EXISTS idx_ja_ckey ON ja_products(ckey);

-- Official Jan Aushadhi Kendra list, loaded by data/build_kendras.py
CREATE TABLE IF NOT EXISTS kendras (
  code TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  district TEXT,
  state TEXT,
  pin TEXT,
  lat REAL,
  lng REAL,
  phone TEXT
);
CREATE INDEX IF NOT EXISTS idx_kendra_pin ON kendras(pin);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

-- One row per completed lookup. No names, phone numbers, IPs, user agents or images.
CREATE TABLE IF NOT EXISTS lookups (
  id TEXT PRIMARY KEY,          -- random UUID, lets the "did you switch?" tap update this row
  ts TEXT NOT NULL,             -- ISO timestamp (UTC)
  day TEXT NOT NULL,            -- YYYY-MM-DD (IST) for the daily chart
  status TEXT,                  -- 'ok' | 'not_found' | 'vision_unavailable'
  input TEXT,                   -- 'photo' | 'photo-ocr' | 'text'
  medicine TEXT,                -- matched brand, e.g. "Dolo 650 Tablet"
  ckey TEXT,                    -- matched composition key
  pack REAL,                    -- units in the scanned brand's pack
  scanned_unit REAL,            -- scanned brand price per unit (INR)
  cheapest_unit REAL,           -- cheapest same-composition brand per unit
  ja_unit REAL,                 -- Jan Aushadhi price per unit, if in the PMBJP basket
  saving_pack REAL,             -- best saving for one pack (INR): scanned - min(cheapest, ja)
  equivalents INTEGER,          -- number of same-composition brands found
  lang TEXT,                    -- en | hi | kn
  pin3 TEXT,                    -- first 3 digits of the PIN code, only if the user typed one
  mode TEXT,                    -- 'self' | 'volunteer'
  device TEXT,                  -- random per-browser token (not derived from the device), for unique-user counts
  is_test INTEGER NOT NULL DEFAULT 0,
  switched TEXT                 -- NULL | 'yes' | 'no' | 'ask' (asked the pharmacist / will ask doctor)
);
CREATE INDEX IF NOT EXISTS idx_lookups_day ON lookups(is_test, day);
