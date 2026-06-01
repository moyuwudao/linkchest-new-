const path = require('path');
process.chdir('/mnt/d/trae_projects/linkchest/project/apps/mobile');
const entry = require('expo/scripts/resolveAppEntry')('.', 'android', 'absolute');
console.log('Entry file:', entry);
