const fs = require('fs');
const files = [
  'apps/api/src/routes/upload.ts',
  'apps/api/src/routes/tags.ts',
  'apps/api/src/routes/subscriptions.ts',
  'apps/api/src/routes/stats.ts',
  'apps/api/src/routes/public.ts',
  'apps/api/src/routes/shares.ts',
  'apps/api/src/routes/quota.ts',
  'apps/api/src/routes/lists.ts',
];
for (const p of files) {
  let f = fs.readFileSync(p, 'utf8');
  f = f.replace("import { authenticate } from '../middleware/auth'", "import { authenticate, AuthenticatedRequest } from '../middleware/auth'");
  f = f.replace(/req: any, res/g, 'req: AuthenticatedRequest, res');
  fs.writeFileSync(p, f);
  console.log('Updated', p);
}
