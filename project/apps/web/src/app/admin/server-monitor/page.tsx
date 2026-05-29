'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Server, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

interface SystemInfo {
  cpuCores: number;
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
  freeMemoryMB: number;
  memoryUsagePercent: number;
  nodeHeapUsedMB: number;
  nodeHeapTotalMB: number;
  nodeRssMB: number;
}

interface ServerMetrics {
  server: string;
  totalRequests: number;
  totalErrors: number;
  avgDuration: number;
  errorRate: number;
  statusDistribution: Record<string, number>;
  system?: SystemInfo;
  pm2?: Array<{ name: string; status: string; cpu: number; mem: number; uptime: number; restarts: number }>;
  timestamp: number;
}

interface Pm2Process {
  name: string;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  pid: number;
}

interface ServerConfig {
  id: string;
  name: string;
  region: string;
  url: string;
}

export default function ServerMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [remoteServers, setRemoteServers] = useState<ServerConfig[]>([]);

  const [localMetrics, setLocalMetrics] = useState<ServerMetrics | null>(null);
  const [remoteMetricsMap, setRemoteMetricsMap] = useState<Map<string, ServerMetrics | null>>(new Map());
  const [globalPm2, setGlobalPm2] = useState<Pm2Process[]>([]);

  const fetchServerData = useCallback(async () => {
    try {
      setError(null);
      const [metricsRes, serversRes, pm2Res] = await Promise.all([
        api.get('/admin/server-monitor'),
        api.get('/admin/server-monitor/servers'),
        api.get('/admin/server-monitor/pm2-global').catch(() => ({ data: { processes: [] } })),
      ]);

      const data = metricsRes.data;
      setLocalMetrics(data.local);
      setRemoteMetricsMap(new Map(Object.entries(data.remote || {})));
      setRemoteServers(serversRes.data.remote || []);
      setGlobalPm2(pm2Res.data.processes || []);
      setLastSync(new Date());
      setLoading(false);
    } catch (err: unknown) {
      const msg = (err as Error).message || '加载服务器数据失败';
      setError(msg);
      setLoading(false);
    }
  }, []);

  const syncRemote = async () => {
    setSyncing(true);
    try {
      await api.post('/admin/server-monitor/sync');
      await fetchServerData();
    } catch {
      setError('同步远程指标失败');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchServerData();
    const interval = setInterval(fetchServerData, 60000); // 每 1 分钟刷新
    return () => clearInterval(interval);
  }, [fetchServerData]);

  return (
    <div>
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl font-bold text-gray-900">服务器监控</h1>
          {lastSync && (
            <span className="text-xs text-gray-400">最后同步: {lastSync.toLocaleTimeString('zh-CN')}</span>
          )}
        </div>
        <button
          onClick={syncRemote}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '同步中...' : '同步远程数据'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* 服务器状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 国内服务器 */}
        {localMetrics && (
          <ServerCard
            server={{ id: 'china', name: '国内应用层', region: '深圳' }}
            metrics={localMetrics}
            isLocal
          />
        )}

        {/* 海外服务器 */}
        {remoteServers.map((srv) => {
          const metrics = remoteMetricsMap.get(srv.id) || null;
          return (
            <ServerCard
              key={srv.id}
              server={srv}
              metrics={metrics}
              isLocal={false}
            />
          );
        })}
      </div>

      {/* 海外服务器 PM2 状态 */}
      {globalPm2.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">海外服务器 PM2 进程状态</h2>
            <span className="text-xs text-gray-400">{globalPm2.length} 个进程</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 px-4 font-medium">进程名</th>
                  <th className="pb-3 px-4 font-medium">状态</th>
                  <th className="pb-3 px-4 font-medium">CPU</th>
                  <th className="pb-3 px-4 font-medium">内存</th>
                  <th className="pb-3 px-4 font-medium">运行时间</th>
                  <th className="pb-3 px-4 font-medium">重启次数</th>
                  <th className="pb-3 px-4 font-medium">PID</th>
                </tr>
              </thead>
              <tbody>
                {globalPm2.map((proc) => (
                  <tr key={proc.pid} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{proc.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          proc.status === 'online'
                            ? 'bg-green-100 text-green-800'
                            : proc.status === 'stopped'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {proc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{proc.cpu.toFixed(1)}%</td>
                    <td className="py-3 px-4">{(proc.memory / 1024 / 1024).toFixed(1)} MB</td>
                    <td className="py-3 px-4">{formatUptime(proc.uptime)}</td>
                    <td className="py-3 px-4">{proc.restarts}</td>
                    <td className="py-3 px-4 text-gray-500">{proc.pid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 负载对比 */}
      {localMetrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">服务器负载对比</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoadDetail metrics={localMetrics} serverName="国内应用层" />
            {(() => {
              const globalMetrics = remoteMetricsMap.get('global');
              return globalMetrics ? (
                <LoadDetail metrics={globalMetrics} serverName="海外服务器" />
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-gray-400 text-sm flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  海外数据暂未同步，请点击「同步远程数据」
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full mr-3"></div>
          加载服务器状态...
        </div>
      )}
    </div>
  );
}

function ServerCard({
  server,
  metrics,
  isLocal,
}: {
  server: { id: string; name: string; region: string };
  metrics: ServerMetrics | null;
  isLocal: boolean;
}) {
  const system = metrics?.system;
  const statusColor = metrics ? 'bg-green-500' : isLocal ? 'bg-yellow-500' : 'bg-gray-400';
  const statusText = metrics ? '在线' : '未连接';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <div>
            <h3 className="text-base font-semibold text-gray-900">{server.name}</h3>
            <p className="text-xs text-gray-400">{server.region} {isLocal ? '(本地)' : '(远程)'}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${metrics ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
          {statusText}
        </span>
      </div>

      {!metrics ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <ExternalLink className="w-6 h-6 mx-auto mb-2 opacity-50" />
          数据未同步，点击「同步远程数据」
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="请求数(1h)" value={metrics.totalRequests.toLocaleString()} />
            <StatBox label="错误率" value={`${(metrics.errorRate * 100).toFixed(2)}%`} />
            <StatBox label="平均耗时" value={`${metrics.avgDuration.toFixed(0)}ms`} />
            <StatBox label="错误数" value={metrics.totalErrors.toString()} />
          </div>

          {system && (
            <>
              <div className="pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-2">系统资源</div>
                <ProgressBar label="内存" percent={system.memoryUsagePercent * 100} />
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                  <div>总内存: {(system.totalMemoryMB / 1024).toFixed(1)} GB</div>
                  <div>已用: {(system.usedMemoryMB / 1024).toFixed(1)} GB</div>
                  <div>Node RSS: {system.nodeRssMB.toFixed(0)} MB</div>
                  <div>Node Heap: {system.nodeHeapUsedMB.toFixed(0)} MB</div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-2">系统负载</div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div className="text-center">
                    <div className="font-semibold">{system.loadAvg1m.toFixed(2)}</div>
                    <div className="text-gray-400">1m</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{system.loadAvg5m.toFixed(2)}</div>
                    <div className="text-gray-400">5m</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{system.loadAvg15m.toFixed(2)}</div>
                    <div className="text-gray-400">15m</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-center mt-1">
                  CPU 核心数: {system.cpuCores}
                </div>
              </div>
            </>
          )}

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
            最后更新: {new Date(metrics.timestamp).toLocaleTimeString('zh-CN')}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  const barColor =
    percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function LoadDetail({ metrics, serverName }: { metrics: ServerMetrics; serverName: string }) {
  const system = metrics.system;
  if (!system) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{serverName}</h3>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>CPU 负载 (1m)</span>
          <span className="font-mono">{system.loadAvg1m.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>内存使用</span>
          <span className="font-mono">{(system.usedMemoryMB / 1024).toFixed(1)} / {(system.totalMemoryMB / 1024).toFixed(1)} GB</span>
        </div>
        <div className="flex justify-between">
          <span>内存占比</span>
          <span className="font-mono">{(system.memoryUsagePercent * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Node RSS</span>
          <span className="font-mono">{system.nodeRssMB.toFixed(0)} MB</span>
        </div>
        <div className="flex justify-between">
          <span>API 请求数</span>
          <span className="font-mono">{metrics.totalRequests.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>API 错误率</span>
          <span className="font-mono">{(metrics.errorRate * 100).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span>平均响应时间</span>
          <span className="font-mono">{metrics.avgDuration.toFixed(0)}ms</span>
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}天${h % 24}时`;
  }
  return `${h}时${m}分`;
}
