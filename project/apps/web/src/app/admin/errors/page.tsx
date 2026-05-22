'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  Hash,
  Filter,
  Download,
} from 'lucide-react';
import { getErrors, updateErrorStatus } from '@/lib/adminApi';

interface ErrorEvent {
  id: string;
  errorCode: string | null;
  message: string;
  stack: string | null;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  userId: string | null;
  ip: string | null;
  metadata: unknown;
  status: string;
  count: number;
  firstAt: string;
  lastAt: string;
}

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'confirmed', label: '已确认' },
  { value: 'fixed', label: '已修复' },
  { value: 'ignored', label: '已忽略' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  confirmed: 'bg-blue-50 text-blue-600',
  fixed: 'bg-green-50 text-green-600',
  ignored: 'bg-gray-100 text-gray-400',
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  confirmed: '已确认',
  fixed: '已修复',
  ignored: '已忽略',
};

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

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ErrorEvent | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    errorCode: '',
    sortBy: 'lastAt',
    sortOrder: 'desc',
  });

  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getErrors({
        ...filters,
        page,
        pageSize,
      });
      setErrors(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateErrorStatus(id, status);
      setErrors(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      if (detailData?.id === id) {
        setDetailData({ ...detailData, status });
      }
    } catch {
      alert('更新状态失败');
    }
  }

  function openDetail(err: ErrorEvent) {
    setDetailData(err);
    setDetailOpen(err.id);
  }

  const totalPages = Math.ceil(total / pageSize);

  function handleExport() {
    if (errors.length === 0) return;
    const headers = ['ID', '错误码', '消息', '路径', '方法', '状态码', '状态', '次数', '首次出现', '最后出现'];
    const rows = errors.map(err => [
      err.id,
      err.errorCode || '',
      err.message,
      err.path || '',
      err.method || '',
      err.statusCode ?? '',
      statusLabels[err.status] || err.status,
      err.count,
      new Date(err.firstAt).toLocaleString('zh-CN'),
      new Date(err.lastAt).toLocaleString('zh-CN'),
    ]);
    downloadCSV(`errors-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  const inputCls = "px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:border-amber-400";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 筛选栏 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-300" />
            <select
              value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className={`${inputCls} w-28`}
            >
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <input
            type="text"
            placeholder="错误码"
            value={filters.errorCode}
            onChange={(e) => { setFilters(f => ({ ...f, errorCode: e.target.value })); setPage(1); }}
            className={`${inputCls} w-36`}
          />

          <select
            value={filters.sortBy}
            onChange={(e) => { setFilters(f => ({ ...f, sortBy: e.target.value })); setPage(1); }}
            className={`${inputCls} w-32`}
          >
            <option value="lastAt">最后出现</option>
            <option value="count">出现次数</option>
            <option value="firstAt">首次出现</option>
          </select>

          <button
            onClick={() => setFilters(f => ({ ...f, sortOrder: f.sortOrder === 'desc' ? 'asc' : 'desc' }))}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            {filters.sortOrder === 'desc' ? '降序' : '升序'}
          </button>
        </div>
      </div>

      {/* 错误列表 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Bug className="w-4 h-4" />
            <span>错误事件</span>
            <span className="text-gray-400">({total})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              disabled={errors.length === 0}
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

        {loading ? (
          <div className="p-8 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 animate-pulse rounded" />
            ))}
          </div>
        ) : errors.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            暂无错误事件
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {errors.map((err) => (
              <div key={err.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-sm text-[11px] font-medium mt-0.5 ${statusColors[err.status] || statusColors.pending}`}>
                    {statusLabels[err.status] || err.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{err.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                      {err.errorCode && <span>{err.errorCode}</span>}
                      {err.path && <span className="truncate">{err.method} {err.path}</span>}
                      {err.statusCode && <span>HTTP {err.statusCode}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {err.count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(err.lastAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openDetail(err)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="查看详情"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {err.status !== 'fixed' && (
                      <button
                        onClick={() => handleStatusChange(err.id, 'fixed')}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                        title="标记已修复"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {err.status !== 'ignored' && (
                      <button
                        onClick={() => handleStatusChange(err.id, 'ignored')}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="忽略"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailOpen && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDetailOpen(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">错误详情</h3>
              <button onClick={() => setDetailOpen(null)} className="p-1 rounded hover:bg-gray-100">
                <XCircle className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium ${statusColors[detailData.status]}`}>
                  {statusLabels[detailData.status]}
                </span>
                <span className="text-xs text-gray-400">ID: {detailData.id.slice(0, 8)}</span>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-medium">错误消息</label>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-md p-3 mt-1">{detailData.message}</p>
              </div>

              {detailData.errorCode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium">错误码</label>
                    <p className="text-sm text-gray-700 mt-1">{detailData.errorCode}</p>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium">状态码</label>
                    <p className="text-sm text-gray-700 mt-1">{detailData.statusCode || '-'}</p>
                  </div>
                </div>
              )}

              {detailData.path && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium">请求路径</label>
                    <p className="text-sm text-gray-700 mt-1">{detailData.method} {detailData.path}</p>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium">用户IP</label>
                    <p className="text-sm text-gray-700 mt-1">{detailData.ip || '-'}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium">首次出现</label>
                  <p className="text-sm text-gray-700 mt-1">{new Date(detailData.firstAt).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium">最后出现</label>
                  <p className="text-sm text-gray-700 mt-1">{new Date(detailData.lastAt).toLocaleString('zh-CN')}</p>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-medium">出现次数</label>
                <p className="text-sm text-gray-700 mt-1">{detailData.count} 次</p>
              </div>

              {detailData.stack && (
                <div>
                  <label className="text-[11px] text-gray-400 font-medium">堆栈信息</label>
                  <pre className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-md p-3 overflow-auto max-h-60 mt-1">
                    {detailData.stack}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {detailData.status !== 'fixed' && (
                  <button
                    onClick={() => { handleStatusChange(detailData.id, 'fixed'); setDetailOpen(null); }}
                    className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    标记已修复
                  </button>
                )}
                {detailData.status !== 'confirmed' && detailData.status !== 'fixed' && (
                  <button
                    onClick={() => { handleStatusChange(detailData.id, 'confirmed'); setDetailOpen(null); }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    标记已确认
                  </button>
                )}
                {detailData.status !== 'ignored' && detailData.status !== 'fixed' && (
                  <button
                    onClick={() => { handleStatusChange(detailData.id, 'ignored'); setDetailOpen(null); }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5 inline mr-1" />
                    忽略
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
