SELECT id, title, "coverImage", "coverStrategy", platform, "updatedAt"
FROM collections
WHERE "deletedAt" IS NULL
ORDER BY "updatedAt" DESC
LIMIT 10;
