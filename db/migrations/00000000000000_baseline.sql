-- Baseline migration for the existing production database.
--
-- This file intentionally creates no business tables and changes no business
-- schema. It exists so the migration runner can establish a known starting
-- point for future migrations without altering current production data.

SELECT 1;
