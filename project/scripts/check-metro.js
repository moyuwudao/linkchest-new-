const config = require('c:/Users/Mayn/CodeBuddy/20260407184558/apps/mobile/metro.config.js');
console.log('resolveRequest:', typeof config.resolver && config.resolver.resolveRequest);
console.log('sourceExts:', config.resolver && config.resolver.sourceExts);
console.log('Keys:', config.resolver && Object.keys(config.resolver));
