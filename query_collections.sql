SELECT id, "userId", substr(url,1,50) AS url_short, title, "coverImage", platform, "pageType", "deletedAt", "createdAt"
FROM collections
ORDER BY "createdAt" DESC
LIMIT 10;
