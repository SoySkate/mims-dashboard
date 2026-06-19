-- Demo logins for production/test DBs where the Node seed (tsx) can't run (standalone image).
-- One user per negocio: email <slug>@demo.mims, password "demo1234" (bcrypt-hashed below),
-- role owner. negocio_id resolved from the real negocios.id by slug.
--
-- Requires the `users` table to exist first (db/users.sql).
-- Idempotent: ON CONFLICT on the lower(email) unique index does nothing, so it can be re-run.
-- Each row only inserts if the negocio slug exists (SELECT returns 0 rows otherwise).

INSERT INTO users (negocio_id, email, password_hash, role)
SELECT id, 'peluqueria-canina@demo.mims', '$2b$10$q7TtJF3luuJWQQK7xXCRD.NMMCoba9eu4GggnEpRR4ABbcM8WA3xW', 'owner'
FROM negocios WHERE slug = 'peluqueria-canina'
ON CONFLICT (lower(email)) DO NOTHING;

INSERT INTO users (negocio_id, email, password_hash, role)
SELECT id, 'centre-medic-puigcerda@demo.mims', '$2b$10$b8na3N1OxNq3yHG9CPdb1eMc4F0JqjR627j6.rw0DP7i/9kdWbeMS', 'owner'
FROM negocios WHERE slug = 'centre-medic-puigcerda'
ON CONFLICT (lower(email)) DO NOTHING;

INSERT INTO users (negocio_id, email, password_hash, role)
SELECT id, 'clinica-dentos@demo.mims', '$2b$10$KKhd82eNFTq2kUw/YlgcMeQHlTlXaY.INgTCkpxzMogHUsh7pBFhS', 'owner'
FROM negocios WHERE slug = 'clinica-dentos'
ON CONFLICT (lower(email)) DO NOTHING;

INSERT INTO users (negocio_id, email, password_hash, role)
SELECT id, 'centre-de-psicologia-baobab@demo.mims', '$2b$10$XZPfdXBmUhksyyDF1M8bAuzpvZsgMd1mJa6nblCAcHjrBLLfYKbO.', 'owner'
FROM negocios WHERE slug = 'centre-de-psicologia-baobab'
ON CONFLICT (lower(email)) DO NOTHING;

INSERT INTO users (negocio_id, email, password_hash, role)
SELECT id, 'la-tasqueta-llivia@demo.mims', '$2b$10$v/eYpSFNAlHYoU6C0o/aeeksMVD8Qz8D.8mKd3z5TgaQubh3jg7Cq', 'owner'
FROM negocios WHERE slug = 'la-tasqueta-llivia'
ON CONFLICT (lower(email)) DO NOTHING;
