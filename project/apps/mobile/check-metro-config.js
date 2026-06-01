process.chdir('/mnt/d/trae_projects/linkchest/project/apps/mobile');
const { getDefaultConfig } = require('expo/metro-config');
const c = getDefaultConfig('.');
console.log('sourceExts:', c.resolver.sourceExts);
console.log('assetExts sample:', [...c.resolver.assetExts].slice(0, 20));
console.log('json in sourceExts:', c.resolver.sourceExts.includes('json'));
console.log('json in assetExts:', c.resolver.assetExts.has('json'));
