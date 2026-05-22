/**
 * Re-export module for @tanstack/react-query.
 *
 * Metro's resolveRequest (in metro.config.js) automatically resolves
 * @tanstack/react-query to its CJS (.cjs) build, which uses
 * `var React = __toESM(require('react'), 1)` instead of
 * `import * as React from 'react'`. This fixes the Hermes crash
 * "Cannot read property 'useRef' of null".
 *
 * We re-export everything from the package so that:
 * 1. All imports go through this single module
 * 2. Metro resolves @tanstack/react-query → index.cjs (via resolveRequest)
 * 3. No ESM .js files are used
 */
export * from '@tanstack/react-query';
