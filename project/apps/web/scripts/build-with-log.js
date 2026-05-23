const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { BuildLogger } = require('../../scripts/build-logger');

const FLAVOR = process.env.MARKET || process.env.NEXT_PUBLIC_MARKET || 'N/A';
const BUILD_ID = `build-web-${FLAVOR}-${Date.now()}`;

const logger = new BuildLogger({
  buildId: BUILD_ID,
  flavor: FLAVOR,
  app: 'web',
  logDir: path.join(__dirname, '..', '.build-logs')
});

async function runBuild() {
  logger.info('init', 'build-start', 'WEB build started', {
    build_id: BUILD_ID,
    flavor: FLAVOR,
    node_version: process.version,
    platform: process.platform
  });

  logger.envSnapshot([
    'NODE_ENV',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_MARKET',
    'MARKET'
  ]);

  const buildStart = Date.now();
  const nextBuild = spawn('npx', ['next', 'build'], {
    cwd: path.join(__dirname, '..'),
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  nextBuild.stdout.on('data', (data) => {
    const chunk = data.toString();
    stdoutBuffer += chunk;
    process.stdout.write(chunk);

    const lines = chunk.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes('error') || trimmed.includes('Error')) {
        logger.warn('build', 'nextjs-output', trimmed);
      } else if (trimmed.includes('Compiled successfully') || trimmed.includes('Route')) {
        logger.info('build', 'nextjs-output', trimmed);
      } else {
        logger.debug('build', 'nextjs-output', trimmed);
      }
    }
  });

  nextBuild.stderr.on('data', (data) => {
    const chunk = data.toString();
    stderrBuffer += chunk;
    process.stderr.write(chunk);
    logger.error('build', 'nextjs-stderr', chunk.trim());
  });

  const exitCode = await new Promise((resolve) => {
    nextBuild.on('close', resolve);
  });

  const durationMs = Date.now() - buildStart;

  if (exitCode !== 0) {
    logger.buildError(
      'WEB-BUILD-FAILED',
      `Next.js build failed with exit code ${exitCode}`,
      'Check the build output for TypeScript or compilation errors',
      false,
      { duration_ms: durationMs, stderr_preview: stderrBuffer.slice(0, 500) }
    );
    process.exit(exitCode);
  }

  logger.info('build', 'build-success', 'Next.js build completed', {
    duration_ms: durationMs
  });

  const nextDir = path.join(__dirname, '..', '.next');
  if (fs.existsSync(nextDir)) {
    const stats = fs.statSync(nextDir);
    logger.artifact('next-dir', nextDir, {
      size_bytes: stats.size,
      modified: stats.mtime.toISOString()
    });

    const serverDir = path.join(nextDir, 'server');
    const staticDir = path.join(nextDir, 'static');

    if (fs.existsSync(serverDir)) {
      logger.info('verify', 'next-server-dir', 'Server directory exists');
    }
    if (fs.existsSync(staticDir)) {
      logger.info('verify', 'next-static-dir', 'Static directory exists');
    }
  }

  logger.info('verify', 'build-complete', 'WEB build process completed', {
    total_duration_ms: durationMs,
    flavor: FLAVOR,
    build_id: BUILD_ID
  });
}

runBuild().catch((err) => {
  logger.error('build', 'unexpected-error', err.message, {
    stack: err.stack
  });
  process.exit(1);
});
