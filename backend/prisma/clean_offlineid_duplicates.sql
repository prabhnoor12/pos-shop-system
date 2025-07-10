-- clean_offlineid_duplicates.sql
-- Remove duplicate offlineId values from InventoryHistory and Sale tables before applying unique constraints
-- Keeps the row with the lowest id for each duplicate offlineId

-- InventoryHistory: Remove duplicates
DELETE FROM "InventoryHistory"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "InventoryHistory"
  WHERE "offlineId" IS NOT NULL
  GROUP BY "offlineId"
);

-- Sale: Remove duplicates
DELETE FROM "Sale"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "Sale"
  WHERE "offlineId" IS NOT NULL
  GROUP BY "offlineId"
);

-- Optionally, set remaining duplicate offlineId to NULL instead of deleting:
-- UPDATE "InventoryHistory" SET "offlineId" = NULL WHERE id IN (...);
-- UPDATE "Sale" SET "offlineId" = NULL WHERE id IN (...);

-- After running this script, all offlineId values will be unique or null.
