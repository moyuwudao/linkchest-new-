'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Info,
  XCircle,
  Download,
} from 'lucide-react';
import { getLogs, getLogFiles } from '@/lib/adminApi';

interface LogEntry {
  level: string;
  time: string | null;
  reqId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  errorCode?: string;
  msg: string;
  [key: string]: unknown;
}

const levelOptions = [
  { value: '', label: '全部级别' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
  { value: 'debug', label: 'Debug' },
  { value: 'fatal', label: 'Fatal' },
];

function LevelIcon({ level }: { level: string }) {
  switch (level) {
    case 'error':
    case 'fatal':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    default:
      return <Info className="w-3.5 h-3.5 text-blue-500" />;
  }
}

function LevelBg(level: string) {
  switch (level) {
    case 'error':
    case 'fatal':
      return 'bg-red-50/50 border-red-200';
    case 'warn':
      return 'bg-amber-50/50 border-amber-200';
    default:
      return 'bg-white border-gray-100';
  }
}

function downloadCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const escape = (val: unknown) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    level: '',
    keyword: '',
    errorCode: '',
    path: '',
    startTime: '',
    endTime: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLogs({
        ...filters,
        page,
        pageSize,
      });
      setLogs(res.data.entries || []);
      setTotal(res.data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / pageSize);

  function handleExport() {
    if (logs.length === 0) return;
    const headers = ['时间', '级别', '方法', '路径', '状态码', '耗时(ms)', '错误码', '消息'];
    const rows = logs.map(log => [
      log.time ? new Date(log.time).toLocaleString('zh-CN') : '-',
      log.level,
      log.method || '',
      log.path || '',
      log.statusCode ?? '',
      log.duration ?? '',
      log.errorCode || '',
      log.msg,
    ]);
    downloadCSV(`logs-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  const inputCls = "px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:border-amber-400";

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-128px)]">
      {/* 筛选栏 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-300" />
            <select
              value={filters.level}
              onChange={(e) => { setFilters(f => ({ ...f, level: e.target.value })); setPage(1); }}
              className={`${inputCls} w-28`}
            >
              {levelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-300" />
            <input
              type="text"
              placeholder="关键词搜索..."
              value={filters.keyword}
              onChange={(e) => { setFilters(f => ({ ...f, keyword: e.target.value })); setPage(1); }}
              className={`${inputCls} w-full`}
            />
          </div>

          <input
            type="text"
            placeholder="错误码"
            value={filters.errorCode}
            onChange={(e) => { setFilters(f => ({ ...f, errorCode: e.target.value })); setPage(1); }}
            className={`${inputCls} w-32`}
          />

          <input
            type="text"
            placeholder="路径"
            value={filters.path}
            onChange={(e) => { setFilters(f => ({ ...f, path: e.target.value })); setPage(1); }}
            className={`${inputCls} w-40`}
          />

          <button onClick={loadLogs} className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors">
            查询
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>日志条目</span>
            <span className="text-gray-400">({total})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400 hover:text-gray-600"
              title="导出CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 px-2">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-8 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 animate-pulse rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              暂无日志数据
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log, idx) => {
                const id = `${log.time ?? 'unknown'}-${idx}`;
                const isExpanded = expandedId === id;
                return (
                  <div key={id} className={`${LevelBg(log.level)} border-l-2 transition-colors`}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <LevelIcon level={log.level} />
                      <span className="text-[11px] text-gray-400 w-16 shrink-0">
                        {log.time ? new Date(log.time).toLocaleTimeString('zh-CN') : '-'}
                      </span>
                      <span className={`text-[11px] w-12 shrink-0 font-medium ${
                        log.level === 'error' || log.level === 'fatal'
                          ? 'text-red-500'
                          : log.level === 'warn'
                          ? 'text-amber-500'
                          : 'text-gray-400'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      {log.method && (
                        <span className="text-[11px] text-gray-400 w-10 shrink-0">{log.method}</span>
                      )}
                      {log.path && (
                        <span className="text-xs text-gray-600 truncate flex-1 min-w-0">{log.path}</span>
                      )}
                      {log.statusCode && (
                        <span className={`text-[11px] w-8 shrink-0 text-right ${
                          log.statusCode >= 500
                            ? 'text-red-500'
                            : log.statusCode >= 400
                            ? 'text-amber-500'
                            : 'text-green-500'
                        }`}>
                          {log.statusCode}
                        </span>
                      )}
                      {log.duration && (
                        <span className="text-[11px] text-gray-400 w-12 shrink-0 text-right">
                          {log.duration}ms
                        </span>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 pl-14">
                        <pre className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-md p-3 overflow-y-auto max-h-60 whitespace-pre-wrap break-all">
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
