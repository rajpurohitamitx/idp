-- Creates your first admin login. Edit the 3 values, then run once in your database SQL editor.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO "User" ("id","email","name","passwordHash","role","updatedAt")
VALUES (
  gen_random_uuid()::text,
  'YOUR_EMAIL@example.com',
  'YOUR NAME',
  crypt('YOUR_STRONG_PASSWORD', gen_salt('bf', 12)),
  'ADMIN',
  CURRENT_TIMESTAMP
);
