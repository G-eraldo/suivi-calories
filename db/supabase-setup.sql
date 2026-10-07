BEGIN;

CREATE SCHEMA IF NOT EXISTS miametrie;
REVOKE ALL ON SCHEMA miametrie FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS miametrie.settings (
  owner_id text PRIMARY KEY,
  goal_kcal integer NOT NULL DEFAULT 2000
);

CREATE TABLE IF NOT EXISTS miametrie.products (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  kcal double precision NOT NULL,
  protein double precision NOT NULL,
  carbs double precision NOT NULL,
  fat double precision NOT NULL,
  fiber double precision,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_owner_name ON miametrie.products (owner_id, name);

CREATE TABLE IF NOT EXISTS miametrie.recipes (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL,
  portions integer NOT NULL,
  ingredients_json text NOT NULL,
  kcal double precision NOT NULL,
  protein double precision NOT NULL,
  carbs double precision NOT NULL,
  fat double precision NOT NULL,
  fiber double precision,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recipes_owner_name ON miametrie.recipes (owner_id, name);

CREATE TABLE IF NOT EXISTS miametrie.meals (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  eaten_on text NOT NULL,
  meal_type text NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  item_name text NOT NULL,
  quantity double precision NOT NULL,
  kcal double precision NOT NULL,
  protein double precision NOT NULL,
  carbs double precision NOT NULL,
  fat double precision NOT NULL,
  fiber double precision,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meals_owner_day ON miametrie.meals (owner_id, eaten_on);

ALTER TABLE miametrie.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE miametrie.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE miametrie.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE miametrie.meals ENABLE ROW LEVEL SECURITY;

COMMIT;
