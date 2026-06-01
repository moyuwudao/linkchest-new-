const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Support monorepo: search node_modules in both mobile dir and root dir
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

// Ensure .cjs and .json files are treated as source code for Metro bundling
// Default Expo config puts json in assetExts, which makes require() return an asset URI
// instead of the parsed JSON object. We move json to sourceExts to inline it into the bundle.
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'cjs', 'json'])];
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'json');

// Fix: Force ALL @tanstack/react-query and @tanstack/query-core imports
// (both top-level and sub-module) to resolve to their CJS (.cjs) versions.
//
// Problem: @tanstack/react-query v5's ESM .js files use
// "import * as React from 'react'" which causes React to be null
// in Metro + Hermes, crashing with "Cannot read property 'useRef' of null".
// The CJS .cjs files use "var React = __toESM(require('react'), 1)"
// with proper interop that works correctly.
//
// We intercept BOTH:
// 1. Bare package imports: '@tanstack/react-query' → build/legacy/index.cjs
// 2. Sub-module imports: '@tanstack/react-query/useQuery' → build/legacy/useQuery.cjs
//    (Metro resolves these via the "exports" field, but we override here)

const TANSTACK_PACKAGES = ['@tanstack/react-query', '@tanstack/query-core'];

// Pre-find the package directories
const tanstackDirs = {};
for (const pkg of TANSTACK_PACKAGES) {
  try {
    const pkgJsonPath = require.resolve(`${pkg}/package.json`, {
      paths: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, '../../node_modules')]
    });
    tanstackDirs[pkg] = path.dirname(pkgJsonPath);
  } catch (e) {
    console.warn(`[metro-fix] Could not find ${pkg}`);
  }
}

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if this is a @tanstack import (top-level or sub-module)
  for (const pkg of TANSTACK_PACKAGES) {
    const pkgDir = tanstackDirs[pkg];
    if (!pkgDir) continue;

    if (moduleName === pkg) {
      // Top-level import: @tanstack/react-query → index.cjs
      return {
        filePath: path.join(pkgDir, 'build', 'legacy', 'index.cjs'),
        type: 'sourceFile',
      };
    }

    if (moduleName.startsWith(pkg + '/')) {
      // Sub-module import: @tanstack/react-query/useQuery → useQuery.cjs
      const subPath = moduleName.slice(pkg.length + 1); // e.g., "useQuery"
      const cjsPath = path.join(pkgDir, 'build', 'legacy', `${subPath}.cjs`);
      if (fs.existsSync(cjsPath)) {
        return {
          filePath: cjsPath,
          type: 'sourceFile',
        };
      }
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
