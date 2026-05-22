'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Server,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Cpu,
  HardDrive,
  Zap,
  Gauge,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { getDashboard } from '@/lib/adminApi';

interface DashboardData {
  overview: {
    requests1h: number;
    requests24h: number;
    errorRate1h: number;
    errorRate24h: number;
    avgDuration1h: number;
    avgDuration24h: number;
  };
  timeline: Array<{
    time: string;
    requests: number;
    errors: number;
    avgDuration: number;
  }>;
  recentErrors: Array<{
    id: string;
    errorCode: string | null;
    message: string;
    count: number;
    status: string;
    firstAt: string;
    lastAt: string;
  }>;
  recentAlerts: Array<{
    id: string;
    ruleName: string;
    priority: string;
    message: string;
    createdAt: string;
  }>;
  errorDistribution: Array<{
    errorCode: string;
    count: number;
  }>;
  shareStats: {
    cacheHitRate1h: number;
    cacheHitRate24h: number;
    shareRequests1h: number;
    shareRequests24h: number;
    shareAvgDuration1h: number;
    shareAvgDuration24h: number;
  };
  system: {
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
  };
}

function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'flat';
  color: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-300';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-300">{subValue}</p>}
        </div>
        <div className={`p-2 rounded-md ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>{trend === 'up' ? '上升' : trend === 'down' ? '下降' : '持平'}</span>
        </div>
      )}
    </div>
  );
}

function SimpleLineChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round(max - (i / ticks) * range)
  );

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((v - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative h-32 flex">
      <div className="flex flex-col justify-between text-[10px] text-gray-400 pr-2 py-2 select-none text-right w-10 shrink-0">
        {tickValues.map((v, i) => (
          <span key={i} className="leading-none">{v}</span>
        ))}
      </div>
      <div className="flex-1 relative">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const y = 10 + (i / ticks) * 80;
            return (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            );
          })}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            fill={color}
            fillOpacity="0.08"
            points={`0,100 ${points} 100,100`}
          />
        </svg>
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  unit,
  threshold,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  threshold?: number;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isWarning = threshold !== undefined && percent >= threshold;
  const isCritical = threshold !== undefined && percent >= threshold + 10;
  const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className={`font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-700'}`}>
          {value}{unit} / {max}{unit} ({percent.toFixed(0)}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function UpgradeSuggestion({ system, shareStats, overview }: {
  system: DashboardData['system'];
  shareStats: DashboardData['shareStats'];
  overview: DashboardData['overview'];
}) {
  const suggestions: Array<{ level: 'critical' | 'warning' | 'info'; text: string }> = [];

  // 内存
  if (system.memoryUsagePercent > 0.85) {
    suggestions.push({ level: 'critical', text: `内存使用率 ${(system.memoryUsagePercent * 100).toFixed(0)}% > 85%，建议立即升级到 4G 内存，否则可能出现 OOM 导致服务崩溃。` });
  } else if (system.memoryUsagePercent > 0.7) {
    suggestions.push({ level: 'warning', text: `内存使用率 ${(system.memoryUsagePercent * 100).toFixed(0)}% > 70%，建议密切关注，高峰期可能触发告警。` });
  }

  // Node.js 堆内存
  if (system.nodeHeapUsedMB / system.totalMemoryMB > 0.5) {
    suggestions.push({ level: 'warning', text: `Node.js 堆内存占用 ${system.nodeHeapUsedMB}MB，接近物理内存 50%，建议检查是否存在内存泄漏或升级配置。` });
  }

  // CPU 负载
  const loadPerCore = system.loadAvg1m / system.cpuCores;
  if (loadPerCore > 1.2) {
    suggestions.push({ level: 'critical', text: `CPU 负载 ${system.loadAvg1m.toFixed(2)}（${system.cpuCores}核）> 1.2/核，建议升级到 4 核或启用 PM2 Cluster 模式。` });
  } else if (loadPerCore > 0.8) {
    suggestions.push({ level: 'warning', text: `CPU 负载 ${system.loadAvg1m.toFixed(2)}（${system.cpuCores}核）> 0.8/核，高峰期可能成为瓶颈。` });
  }

  // 响应时间
  if (shareStats.shareAvgDuration1h > 500) {
    suggestions.push({ level: 'warning', text: `分享页平均响应 ${shareStats.shareAvgDuration1h}ms > 500ms，建议检查数据库慢查询或启用 CDN。` });
  }

  // 错误率
  if (overview.errorRate1h > 0.05) {
    suggestions.push({ level: 'critical', text: `1小时错误率 ${(overview.errorRate1h * 100).toFixed(1)}% > 5%，建议立即排查最近告警和错误日志。` });
  } else if (overview.errorRate1h > 0.02) {
    suggestions.push({ level: 'warning', text: `1小时错误率 ${(overview.errorRate1h * 100).toFixed(1)}% > 2%，建议关注错误分布。` });
  }

  // 缓存命中率
  if (shareStats.cacheHitRate1h < 0.5 && shareStats.shareRequests1h > 100) {
    suggestions.push({ level: 'info', text: `分享页缓存命中率 ${(shareStats.cacheHitRate1h * 100).toFixed(0)}% 较低，建议检查 Redis 是否正常运行或缓存 TTL 配置。` });
  }

  // QPS 预估
  const shareQps = Math.round(shareStats.shareRequests1h / 3600);
  if (shareQps > 300) {
    suggestions.push({ level: 'warning', text: `分享页 QPS 约 ${shareQps}，单台 2核2G 可能接近极限，建议评估 CDN 或多机部署。` });
  }

  if (suggestions.length === 0) {
    suggestions.push({ level: 'info', text: '当前系统运行平稳，暂无升级建议。继续监控即可。' });
  }

  const levelColors = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const levelIcons = {
    critical: AlertTriangle,
    warning: AlertTriangle,
    info: Gauge,
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <ArrowUpRight className="w-4 h-4" />
        升级建议与容量规划
      </h3>
      <div className="space-y-2">
        {suggestions.map((s, i) => {
          const Icon = levelIcons[s.level];
          return (
            <div key={i} className={`flex items-start gap-2 p-2.5 rounded-md border text-xs ${levelColors[s.level]}`}>
              <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{s.text}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
        <p>当前配置：新加坡 {system.cpuCores}核 / {system.totalMemoryMB}MB 内存 / 50G 硬盘</p>
        <p>关键阈值：内存 &gt; 75% | CPU 负载/核 &gt; 1.0 | 错误率 &gt; 5% | 分享页响应 &gt; 500ms</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    confirmed: 'bg-blue-50 text-blue-600',
    fixed: 'bg-green-50 text-green-600',
    ignored: 'bg-gray-100 text-gray-400',
  };
  const labelMap: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    fixed: '已修复',
    ignored: '已忽略',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-sm text-[11px] font-medium ${map[status] || map.pending}`}>
      {labelMap[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    P0: 'bg-red-50 text-red-600',
    P1: 'bg-amber-50 text-amber-600',
    P2: 'bg-blue-50 text-blue-600',
    P3: 'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[11px] font-medium ${map[priority] || map.P3}`}>
      {priority}
    </span>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await getDashboard();
      setData(res.data);
    } catch (e) {
      setError('加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 h-28 animate-pulse bg-gray-50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5 h-64 animate-pulse bg-gray-50" />
          <div className="bg-white border border-gray-200 rounded-lg p-5 h-64 animate-pulse bg-gray-50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertTriangle className="w-8 h-8 mb-3" />
        <p className="text-sm">{error}</p>
        <button onClick={loadDashboard} className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
          重试
        </button>
      </div>
    );
  }

  const o = data?.overview;
  const timeline = data?.timeline || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="1小时请求量"
          value={String(o?.requests1h ?? 0)}
          subValue={`24小时: ${o?.requests24h ?? 0}`}
          icon={Activity}
          color="bg-amber-500"
        />
        <MetricCard
          title="1小时错误率"
          value={`${((o?.errorRate1h ?? 0) * 100).toFixed(1)}%`}
          subValue={`24小时: ${((o?.errorRate24h ?? 0) * 100).toFixed(1)}%`}
          icon={AlertTriangle}
          color="bg-red-500"
          trend={(o?.errorRate1h ?? 0) > (o?.errorRate24h ?? 0) / 24 ? 'up' : 'down'}
        />
        <MetricCard
          title="平均响应时间"
          value={`${o?.avgDuration1h ?? 0}ms`}
          subValue={`24小时平均: ${o?.avgDuration24h ?? 0}ms`}
          icon={Clock}
          color="bg-blue-500"
        />
        <MetricCard
          title="活跃错误事件"
          value={String(data?.recentErrors?.length ?? 0)}
          subValue="待处理 / 已确认"
          icon={Server}
          color="bg-green-500"
        />
      </div>

      {/* 趋势图 + 错误分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">最近1小时流量趋势</h3>
          <SimpleLineChart
            data={timeline.map((t) => t.requests)}
            color="#f59e0b"
          />
          <div className="flex items-center justify-between mt-2 text-[11px] text-gray-300">
            <span>{timeline[0]?.time || ''}</span>
            <span>{timeline[timeline.length - 1]?.time || ''}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top 错误分布</h3>
          <div className="space-y-3">
            {data?.errorDistribution?.slice(0, 5).map((item) => (
              <div key={item.errorCode} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 truncate">{item.errorCode}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{
                      width: `${Math.min((item.count / (data.errorDistribution[0]?.count || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{item.count}</span>
              </div>
            ))}
            {(!data?.errorDistribution || data.errorDistribution.length === 0) && (
              <p className="text-xs text-gray-400 py-4 text-center">暂无错误数据</p>
            )}
          </div>
        </div>
      </div>

      {/* 最近错误 + 最近告警 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">最近错误事件</h3>
          <div className="space-y-2">
            {data?.recentErrors?.slice(0, 5).map((err) => (
              <div key={err.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <StatusBadge status={err.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{err.message}</p>
                  <p className="text-[11px] text-gray-400">
                    {err.errorCode || 'UNKNOWN'} · {err.count} 次
                  </p>
                </div>
              </div>
            ))}
            {(!data?.recentErrors || data.recentErrors.length === 0) && (
              <p className="text-xs text-gray-400 py-4 text-center">暂无错误事件</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">最近告警</h3>
          <div className="space-y-2">
            {data?.recentAlerts?.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <PriorityBadge priority={alert.priority} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{alert.ruleName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{alert.message}</p>
                </div>
                <Bell className="w-3 h-3 text-gray-200 shrink-0" />
              </div>
            ))}
            {(!data?.recentAlerts || data.recentAlerts.length === 0) && (
              <p className="text-xs text-gray-400 py-4 text-center">暂无告警记录</p>
            )}
          </div>
        </div>
      </div>

      {/* 系统资源 + 分享性能 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 系统资源 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            系统资源
          </h3>
          <div className="space-y-4">
            <ProgressBar
              label="物理内存"
              value={data?.system?.usedMemoryMB ?? 0}
              max={data?.system?.totalMemoryMB ?? 1}
              unit="MB"
              threshold={75}
            />
            <ProgressBar
              label="Node.js 堆内存"
              value={data?.system?.nodeHeapUsedMB ?? 0}
              max={data?.system?.nodeHeapTotalMB ?? 1}
              unit="MB"
              threshold={80}
            />
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                CPU 负载 ({data?.system?.cpuCores ?? 0}核)
              </span>
              <span className="text-gray-700 font-medium">
                {data?.system?.loadAvg1m?.toFixed(2) ?? '0.00'} / {data?.system?.loadAvg5m?.toFixed(2) ?? '0.00'} / {data?.system?.loadAvg15m?.toFixed(2) ?? '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                Node.js RSS
              </span>
              <span className="text-gray-700 font-medium">{data?.system?.nodeRssMB ?? 0} MB</span>
            </div>
          </div>
        </div>

        {/* 分享性能 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            分享页性能
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">缓存命中率 (1h)</span>
              <span className={`font-medium ${(data?.shareStats?.cacheHitRate1h ?? 0) > 0.7 ? 'text-emerald-600' : (data?.shareStats?.cacheHitRate1h ?? 0) > 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                {((data?.shareStats?.cacheHitRate1h ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${(data?.shareStats?.cacheHitRate1h ?? 0) > 0.7 ? 'bg-emerald-500' : (data?.shareStats?.cacheHitRate1h ?? 0) > 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((data?.shareStats?.cacheHitRate1h ?? 0) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500">分享页请求 (1h)</span>
              <span className="text-gray-700 font-medium">{data?.shareStats?.shareRequests1h ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500">分享页 QPS (预估)</span>
              <span className="text-gray-700 font-medium">
                {Math.round((data?.shareStats?.shareRequests1h ?? 0) / 3600)} req/s
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500">平均响应 (1h)</span>
              <span className={`font-medium ${(data?.shareStats?.shareAvgDuration1h ?? 0) < 200 ? 'text-emerald-600' : (data?.shareStats?.shareAvgDuration1h ?? 0) < 500 ? 'text-amber-600' : 'text-red-600'}`}>
                {data?.shareStats?.shareAvgDuration1h ?? 0} ms
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500">平均响应 (24h)</span>
              <span className="text-gray-700 font-medium">{data?.shareStats?.shareAvgDuration24h ?? 0} ms</span>
            </div>
          </div>
        </div>

        {/* 升级建议 */}
        {data?.system && data?.shareStats && data?.overview && (
          <UpgradeSuggestion system={data.system} shareStats={data.shareStats} overview={data.overview} />
        )}
      </div>
    </div>
  );
}
