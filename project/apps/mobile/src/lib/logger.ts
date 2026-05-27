import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_STORAGE_KEY = 'linkchest_app_logs';
const MAX_LOGS = 500; // 最多保留500条日志

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Logger init failed:', e);
    }
    this.initialized = true;
  }

  private async save() {
    try {
      // 只保留最近的 MAX_LOGS 条
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Logger save failed:', e);
    }
  }

  private addLog(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined,
    };
    this.logs.push(entry);
    this.save();

    // 同时输出到控制台
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         level === 'info' ? console.info : console.log;
    consoleMethod(`[${level.toUpperCase()}]`, message, data || '');
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  async clear() {
    this.logs = [];
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
  }

  async export(): Promise<string> {
    const logText = this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString();
      const data = log.data ? `\n${log.data}` : '';
      return `[${time}] [${log.level.toUpperCase()}] ${log.message}${data}`;
    }).join('\n\n');
    return logText;
  }
}

export const appLogger = new Logger();

// 拦截全局 console 方法
export function interceptConsole() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // 安全序列化：处理循环引用
  const safeStringify = (obj: any): string => {
    try {
      return JSON.stringify(obj);
    } catch {
      return '[Circular/Non-serializable]';
    }
  };

  console.log = (...args: any[]) => {
    try {
      const message = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
      appLogger.info(message);
    } catch {
      // 静默失败，不影响原始 console
    }
    originalLog.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    try {
      const message = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
      appLogger.warn(message);
    } catch {
      // 静默失败
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    try {
      const message = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
      appLogger.error(message);
    } catch {
      // 静默失败
    }
    originalError.apply(console, args);
  };
}
