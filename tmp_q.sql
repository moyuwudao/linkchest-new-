SELECT id, "userId", substr(url,1,60) AS url_short, title, platform, "pageType", "deletedAt", "createdAt"
FROM collections
ORDER BY "createdAt" DESC
LIMIT 20;
