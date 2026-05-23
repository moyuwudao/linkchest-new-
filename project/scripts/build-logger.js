const fs = require('fs');
const path = require('path');

class BuildLogger {
  constructor(options = {}) {
    this.buildId = options.buildId || `build-${Date.now()}`;
    this.flavor = options.flavor || 'N/A';
    this.app = options.app || 'unknown';
    this.wslInstance = options.wslInstance || 'N/A';
    this.logDir = options.logDir || '.build-logs';
    this.jsonLogPath = path.join(this.logDir, `${this.buildId}.jsonl`);
    this.textLogPath = path.join(this.logDir, `${this.buildId}.log`);

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _write(entry) {
    const line = JSON.stringify(entry);
    fs.appendFileSync(this.jsonLogPath, line + '\n');

    const ts = entry.timestamp.replace('T', ' ').split('.')[0];
    const textLine = `[${ts}] [${entry.level}] [${entry.stage}:${entry.step}] [${this.flavor}] ${entry.message}\n`;
    fs.appendFileSync(this.textLogPath, textLine);

    if (entry.level === 'ERROR' || entry.level === 'WARN') {
      process.stderr.write(textLine);
    } else {
      process.stdout.write(textLine);
    }
  }

  log(level, stage, step, message, extra = {}) {
    this._write({
      timestamp: new Date().toISOString(),
      level,
      stage,
      step,
      flavor: this.flavor,
      app: this.app,
      wsl_instance: this.wslInstance,
      build_id: this.buildId,
      message,
      ...extra
    });
  }

  debug(stage, step, message, extra) { this.log('DEBUG', stage, step, message, extra); }
  info(stage, step, message, extra) { this.log('INFO', stage, step, message, extra); }
  warn(stage, step, message, extra) { this.log('WARN', stage, step, message, extra); }
  error(stage, step, message, extra) { this.log('ERROR', stage, step, message, extra); }

  envSnapshot(envVars = []) {
    const env = {};
    for (const key of envVars) {
      const val = process.env[key];
      if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY') || key.includes('TOKEN')) {
        env[key] = val ? 'SET' : 'UNSET';
      } else {
        env[key] = val || null;
      }
    }
    this.info('env-prep', 'env-snapshot', 'Environment variables snapshot', { env });
  }

  taskStart(taskName) {
    this._taskTimers = this._taskTimers || {};
    this._taskTimers[taskName] = Date.now();
    this.info('build', 'task-start', `Task ${taskName} started`, { task: { name: taskName } });
  }

  taskEnd(taskName, result = 'SUCCESS', extra = {}) {
    const start = (this._taskTimers || {})[taskName];
    const durationMs = start ? Date.now() - start : null;
    this.info('build', 'task-end', `Task ${taskName} completed`, {
      task: { name: taskName, duration_ms: durationMs, result, ...extra }
    });
  }

  artifact(type, filePath, extra = {}) {
    const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    this.info('verify', 'artifact-check', `${type} artifact verified`, {
      artifact: {
        type,
        path: filePath,
        size_bytes: stats ? stats.size : null,
        timestamp: stats ? stats.mtime.toISOString() : null,
        exists: !!stats,
        ...extra
      }
    });
  }

  buildError(errorCode, message, suggestion, autoFixable = false, extra = {}) {
    this.error('build', 'build-failed', message, {
      error: {
        code: errorCode,
        message,
        suggestion,
        auto_fixable: autoFixable,
        ...extra
      }
    });
  }
}

module.exports = { BuildLogger };
