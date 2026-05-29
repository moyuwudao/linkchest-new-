const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../../..');
const loggerPath = path.join(projectRoot, 'scripts', 'build-logger.js');
const monitorPath = path.join(projectRoot, 'scripts', 'build-monitor.js');

const startTime = Date.now();
const buildId = `web-${process.env.BUILD_FLAVOR || 'local'}-${Date.now()}`;

let logger;
try {
  const { BuildLogger } = require(loggerPath);
  logger = new BuildLogger({
    buildId,
    flavor: process.env.BUILD_FLAVOR || 'local',
    app: 'web',
    wslInstance: 'N/A',
  });
} catch (e) {
  console.log('[build-with-log] BuildLogger not available, using console output only');
}

function log(level, stage, step, message) {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
  const line = `[${ts}] [${level}] [${stage}:${step}] ${message}`;
  if (level === 'ERROR' || level === 'WARN') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
  if (logger) {
    logger.log(level, stage, step, message);
  }
}

try {
  log('INFO', 'build', 'start', `Starting WEB build (buildId: ${buildId})`);

  log('INFO', 'deps', 'install', 'Installing dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });

  log('INFO', 'build', 'compile', 'Running next build...');
  execSync('npx next build', { stdio: 'inherit', cwd: __dirname });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log('INFO', 'build', 'success', `WEB build completed successfully in ${durationSec}s`);

  if (require.main === module) {
    try {
      const { recordBuild } = require(monitorPath);
      recordBuild(process.env.BUILD_FLAVOR || 'local', parseFloat(durationSec), true);
    } catch (e) {
      // Monitor not available
    }
  }

  process.exit(0);
} catch (error) {
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log('ERROR', 'build', 'failed', `WEB build failed after ${durationSec}s: ${error.message}`);

  if (require.main === module) {
    try {
      const { recordBuild } = require(monitorPath);
      recordBuild(process.env.BUILD_FLAVOR || 'local', parseFloat(durationSec), false);
    } catch (e) {
      // Monitor not available
    }
  }

  process.exit(1);
}
