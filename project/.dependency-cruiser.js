/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'This dependency is part of a circular relationship. Please refactor.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'This module is not imported by any other module. Consider removing or exporting it.',
      from: { orphan: true, pathNot: '\\.d\\.ts$' },
      to: {},
    },
    {
      name: 'no-cross-app-imports',
      severity: 'warn',
      comment: 'One app should not directly import from another app. Use shared packages instead.',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/(?!\\1)', pathNot: '^apps/api/src/__tests__' },
    },
    {
      name: 'no-api-imports-web',
      severity: 'warn',
      comment: 'Web should not directly import API internals. Use API client or shared types.',
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/src/(?!types|client)' },
    },
    {
      name: 'no-mobile-imports-api-internals',
      severity: 'warn',
      comment: 'Mobile should not directly import API internals. Use API client.',
      from: { path: '^apps/mobile/' },
      to: { path: '^apps/api/src/(?!types|client)' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg'],
    },
    includeOnly: '^apps/|^packages/',
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern: '^(packages|apps)/[^/]+/',
      },
    },
  },
};
