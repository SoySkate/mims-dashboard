-- Extensions required by the mims_app schema.
-- pgcrypto: gen_random_uuid() default on most tables (also core in PG13+, kept for parity).
-- pg_trgm:  fuzzy text search helpers used in mims_app.
-- unaccent: accent-insensitive text matching used in mims_app.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
