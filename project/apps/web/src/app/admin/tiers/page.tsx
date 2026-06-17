'use client';

import { useState, useEffect } from 'react';
import {
  Crown, Loader2, Plus, Pencil, Trash2, X, CheckCircle, BarChart3, RefreshCw,
} from 'lucide-react';
import {
  getTierConfigs, createTierConfig, updateTierConfig, deleteTierConfig, getTierStats, syncTierConfigs,
} from '@/lib/adminApi';
import type { TierConfigInput } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { getMarketConfig } from '@/lib/api/market';

interface TierConfig {
  id: string; key: string; nameZh: string; nameEn: string;
  description?: string; sortOrder: number; isActive: boolean;
  quotaConfig: Record<string, number>; pricingConfig?: Record<string, unknown>;
  benefits?: string[]; createdAt: string; updatedAt: string;
}

interface TierStats {
  totalConfigs: number; activeConfigs: number;
  userDistribution: Record<string, number>;
  activeSubscriptions: number; expiringSoon: number;
}

const emptyForm: TierConfigInput = {
  key: '', nameZh: '', nameEn: '', description: '', sortOrder: 0, isActive: true,
  // v4.2: 保留已实现功能
  quotaConfig: {
    collections: 999999, tags: 999999, lists: 999999, shares: 5, shareItems: 999999, coverImages: 999999,
    coverImagesDaily: 5, maxItemsPerShare: 50, dailyImportLimit: 30, metadataDailyLimit: 30, trashRetentionDays: 7,
    sharePassword: 0, shareExpiry: 0, shareRating: 0, duplicateCheck: 0, autoBackup: 0,
  },
  // v4.2: 恢复月付+年付
  pricingConfig: { monthly: { usd: 0, cny: 0 }, yearly: { usd: 0, cny: 0 } }, benefits: [],
};

export default function TierManagementPage() {
  const [configs, setConfigs] = useState<TierConfig[]>([]);
  const [stats, setStats] = useState<TierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TierConfigInput>(emptyForm);
  const [benefitInput, setBenefitInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [market, setMarket] = useState<'china' | 'global'>('global');
  const { showToast, showAlert } = useToast();

  useEffect(() => {
    getMarketConfig().then(config => setMarket(config.market));
  }, []);

  useEffect(() => { loadConfigs(); loadStats(); }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      // 优先从缓存读取
      const cached = localStorage.getItem('linkchest_tier_configs');
      const cachedTime = localStorage.getItem('linkchest_tier_configs_time');
      const now = Date.now();
      if (cached && cachedTime && now - parseInt(cachedTime) < 5 * 60 * 1000) {
        setConfigs(JSON.parse(cached));
      }
      const res = await getTierConfigs();
      const items = res.data?.data;
      if (Array.isArray(items)) {
        setConfigs(items);
        localStorage.setItem('linkchest_tier_configs', JSON.stringify(items));
        localStorage.setItem('linkchest_tier_configs_time', now.toString());
      }
    } catch { showAlert('加载等级配置失败', 'error'); } finally { setLoading(false); }
  }
  async function loadStats() {
    try { const res = await getTierStats(); const d = res.data?.data; setStats(d && typeof d === 'object' ? d : null); } catch {}
  }

  function openCreate() { setEditingId(null); setForm(emptyForm); setBenefitInput(''); setModalOpen(true); }
  function openEdit(c: TierConfig) {
    setEditingId(c.id);
    // v4.1: 仅年付
    const pc = c.pricingConfig || {};
    const normalizedPricing = { yearly: { usd: (pc as any).yearly?.usd ?? 0, cny: (pc as any).yearly?.cny ?? 0 } };
    // 兼容旧 quotaConfig 字段名 (maxCollections -> collections 等)
    const qc = c.quotaConfig || {};
    const oldQuotaMap: Record<string, string> = {
      maxCollections: 'collections', maxTags: 'tags', maxLists: 'lists',
      maxShares: 'shares', maxShareItems: 'shareItems', maxCovers: 'coverImages',
    };
    // 保留完整的 quotaConfig（包括无区分度的字段），UI 仅展示 qf 中的字段
    const normalizedQuota: Record<string, number> = { ...emptyForm.quotaConfig };
    for (const [key, value] of Object.entries(qc)) {
      const mappedKey = oldQuotaMap[key] || key;
      if (value !== undefined) normalizedQuota[mappedKey] = value;
    }
    setForm({ key: c.key, nameZh: c.nameZh, nameEn: c.nameEn, description: c.description || '',
      sortOrder: c.sortOrder, isActive: c.isActive, quotaConfig: normalizedQuota,
      pricingConfig: normalizedPricing, benefits: c.benefits || [] });
    setBenefitInput(''); setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key || !form.nameZh || !form.nameEn) { showAlert('请填写必填字段', 'error'); return; }
    try {
      setSubmitting(true);
      if (editingId) { await updateTierConfig(editingId, form); showToast('等级配置已更新', 'success'); }
      else { await createTierConfig(form); showToast('等级配置已创建', 'success'); }
      setModalOpen(false); loadConfigs(); loadStats();
    } catch (err: any) { showAlert(err.response?.data?.message || '操作失败', 'error'); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除等级配置「${name}」？`)) return;
    try { await deleteTierConfig(id); showToast('已删除', 'success'); loadConfigs(); loadStats(); }
    catch { showAlert('删除失败', 'error'); }
  }
  async function handleSync() {
    if (!confirm('确定初始化缺失的等级配置？\n仅当数据库中不存在对应 key 时才会创建，不会覆盖管理后台已有配置。')) return;
    try {
      setSyncing(true);
      const res = await syncTierConfigs();
      const { updated, created } = res.data?.data || {};
      showToast(`初始化完成：新建 ${created || 0} 条，已有配置 ${updated || 0} 条未被覆盖`, 'success');
      loadConfigs(); loadStats();
    } catch {
      showAlert('初始化失败', 'error');
    } finally {
      setSyncing(false);
    }
  }

  function addBenefit() {
    if (!benefitInput.trim()) return;
    setForm(p => ({ ...p, benefits: [...(p.benefits || []), benefitInput.trim()] }));
    setBenefitInput('');
  }
  function removeBenefit(i: number) { setForm(p => ({ ...p, benefits: (p.benefits || []).filter((_, idx) => idx !== i) })); }
  function uq(k: string, v: string) { const n = v === '' ? 0 : parseInt(v, 10); setForm(p => ({ ...p, quotaConfig: { ...p.quotaConfig, [k]: isNaN(n) ? 0 : n } })); }
  // v4.2: 分享增强同时控制 sharePassword/shareExpiry/shareRating 三个字段
  function toggleFeature(k: string) {
    if (k === 'sharePassword') {
      const newValue = (form.quotaConfig.sharePassword ?? 0) ? 0 : 1;
      setForm(p => ({
        ...p,
        quotaConfig: {
          ...p.quotaConfig,
          sharePassword: newValue,
          shareExpiry: newValue,
          shareRating: newValue,
        },
      }));
    } else {
      setForm(p => ({ ...p, quotaConfig: { ...p.quotaConfig, [k]: (p.quotaConfig[k] ?? 0) ? 0 : 1 } }));
    }
  }
  // v4.2: 恢复月付+年付价格处理
  function up(cycle: 'monthly' | 'yearly', v: string) {
    const n = v === '' ? 0 : parseInt(v, 10);
    const field = market === 'china' ? 'cny' : 'usd';
    setForm(p => {
      const pc: any = JSON.parse(JSON.stringify(p.pricingConfig || { monthly: { usd: 0, cny: 0 }, yearly: { usd: 0, cny: 0 } }));
      if (!pc[cycle]) pc[cycle] = { usd: 0, cny: 0 };
      pc[cycle][field] = isNaN(n) ? 0 : n;
      return { ...p, pricingConfig: pc };
    });
  }

  function tierColor(key: string) {
    const m: Record<string, string> = { medium: 'bg-gray-100 text-gray-600', heavy: 'bg-amber-50 text-amber-600', super: 'bg-purple-50 text-purple-600' };
    return m[key] || 'bg-gray-100 text-gray-600';
  }

  // 有区分度的数值型配额项（不同 tier 值不同），在管理后台展示和编辑
  const qf = [
    { k: 'shares', l: '分享数量上限（终身）' },
    { k: 'maxItemsPerShare', l: '单次分享容量上限' },
    { k: 'dailyImportLimit', l: '每日导入上限' },
    { k: 'coverImagesDaily', l: '日上传封面数' },
    { k: 'metadataDailyLimit', l: '元数据日抓取上限' },
    { k: 'trashRetentionDays', l: '回收站保留天数' },
  ];

  // 功能开关型配置（v4.2: 分享增强统一展示，新增重复检测/自动备份）
  const featureFlags = [
    { k: 'sharePassword', l: '分享增强' },
    { k: 'duplicateCheck', l: '重复检测' },
    { k: 'autoBackup', l: '自动备份' },
  ];

  // 无区分度的功能性无限项（所有 tier 均为 999999），不在管理后台展示
  // 包括：collections, tags, lists, shareItems, coverImages

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-medium text-gray-900">等级管理</h2>
          <span className="text-xs text-gray-400 ml-2">共 {configs.length} 个配置</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            同步默认配置
          </button>
          <button onClick={openCreate} className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" />新建等级
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '配置总数', value: stats.totalConfigs, icon: Crown, color: 'text-amber-600 bg-amber-50' },
            { label: '启用配置', value: stats.activeConfigs, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
            { label: '活跃订阅', value: stats.activeSubscriptions, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
            { label: '即将到期', value: stats.expiringSoon, icon: BarChart3, color: 'text-red-600 bg-red-50' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 用户分布 */}
      {stats?.userDistribution && Object.keys(stats.userDistribution).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">用户等级分布</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.userDistribution).map(([tier, count]) => (
              <span key={tier} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tierColor(tier)}`}>
                {configs.find(c => c.key === tier)?.nameZh || tier}: {count} 人
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 套餐对比结果 */}
      {configs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">套餐对比结果</h3>
            <p className="text-xs text-gray-400 mt-0.5">WEB端和手机端均从此处获取套餐信息</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                  <th className="px-4 py-2.5 text-xs text-gray-500 font-medium">对比项</th>
                  {configs.sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                    <th key={c.id} className="px-4 py-2.5 text-xs text-gray-500 font-medium text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${tierColor(c.key)}`}>
                        <Crown className="w-3 h-3" />{c.nameZh}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* v4.2: 恢复月付+年付价格展示 */}
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-600 font-medium">月付价格</td>
                  {configs.sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                    <td key={c.id} className="px-4 py-2.5 text-xs text-center text-gray-500">
                      {market === 'china'
                        ? `¥${(((c.pricingConfig as any)?.monthly?.cny ?? 0) / 100).toFixed(2)}`
                        : `$${(((c.pricingConfig as any)?.monthly?.usd ?? 0) / 100).toFixed(2)}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-600 font-medium">年付价格</td>
                  {configs.sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                    <td key={c.id} className="px-4 py-2.5 text-xs text-center text-gray-500">
                      {market === 'china'
                        ? `¥${(((c.pricingConfig as any)?.yearly?.cny ?? 0) / 100).toFixed(2)}`
                        : `$${(((c.pricingConfig as any)?.yearly?.usd ?? 0) / 100).toFixed(2)}`}
                    </td>
                  ))}
                </tr>
                {/* 配额 */}
                {qf.map(q => (
                  <tr key={q.k} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600">{q.l}</td>
                    {configs.sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                      <td key={c.id} className="px-4 py-2.5 text-xs text-center text-gray-500">
                        {c.quotaConfig?.[q.k] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* 功能开关 */}
                {featureFlags.map(f => (
                  <tr key={f.k} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600">{f.l}</td>
                    {configs.sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                      <td key={c.id} className="px-4 py-2.5 text-xs text-center">
                        {c.quotaConfig?.[f.k] ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 配置列表 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            <span className="ml-2 text-sm text-gray-400">加载中...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50">
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">标识</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">名称</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">状态</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">配额</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">排序</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${tierColor(c.key)}`}>
                        <Crown className="w-3 h-3" />{c.key}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-medium">{c.nameZh}</p>
                      <p className="text-[11px] text-gray-400">{c.nameEn}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${c.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                        {c.isActive ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      <div>分享 {c.quotaConfig?.shares ?? '-'} / 单次分享 {c.quotaConfig?.maxItemsPerShare ?? '-'} / 导入 {c.quotaConfig?.dailyImportLimit ?? '-'} / 封面日 {c.quotaConfig?.coverImagesDaily ?? '-'} / 元数据 {c.quotaConfig?.metadataDailyLimit ?? '-'} / 回收站 {c.quotaConfig?.trashRetentionDays ?? '-'}天</div>
                      <div className="mt-0.5 text-[10px] text-gray-400">
                        {featureFlags.filter(f => !!c.quotaConfig?.[f.k]).map(f => f.l).join(' · ') || '无特权'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.nameZh)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {configs.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">暂无等级配置</div>
            )}
          </div>
        )}
      </div>

      {/* 编辑/创建弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-medium text-gray-900">{editingId ? '编辑等级' : '新建等级'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">标识 key *</label>
                  <input value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value }))}
                    disabled={!!editingId} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" placeholder="如: heavy" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">排序</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">中文名称 *</label>
                  <input value={form.nameZh} onChange={e => setForm(p => ({ ...p, nameZh: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" placeholder="高级版" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">英文名称 *</label>
                  <input value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" placeholder="Pro" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" placeholder="简短描述..." />
              </div>
              <div className="flex items-center gap-2">
                <input id="isActive" type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-400" />
                <label htmlFor="isActive" className="text-sm text-gray-700">启用</label>
              </div>

              {/* 配额 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">配额配置（有区分度的项）</label>
                <div className="grid grid-cols-2 gap-2">
                  {qf.map(f => (
                    <div key={f.k}>
                      <label className="block text-[10px] text-gray-400 mb-0.5">{f.l}</label>
                      <input type="number" value={form.quotaConfig[f.k] ?? 0} onChange={e => uq(f.k, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 功能开关 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">功能开关（有区分度的权限）</label>
                <div className="grid grid-cols-2 gap-2">
                  {featureFlags.map(f => (
                    <label key={f.k} className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={!!form.quotaConfig[f.k]} onChange={() => toggleFeature(f.k)}
                        className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-400" />
                      <span className="text-sm text-gray-700">{f.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 价格 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  价格配置 ({market === 'china' ? '¥ / 元' : '$ / 美分'})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">月付 {market === 'china' ? 'CNY' : 'USD'}</label>
                    <input type="number" value={
                      market === 'china'
                        ? (form.pricingConfig as any)?.monthly?.cny ?? 0
                        : (form.pricingConfig as any)?.monthly?.usd ?? 0
                    } onChange={e => up('monthly', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">年付 {market === 'china' ? 'CNY' : 'USD'}</label>
                    <input type="number" value={
                      market === 'china'
                        ? (form.pricingConfig as any)?.yearly?.cny ?? 0
                        : (form.pricingConfig as any)?.yearly?.usd ?? 0
                    } onChange={e => up('yearly', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                </div>
                {market === 'china' && (
                  <p className="text-[10px] text-gray-400 mt-1">注：国内版价格单位为「元」，输入 100 表示 100 元</p>
                )}
                {market === 'global' && (
                  <p className="text-[10px] text-gray-400 mt-1">注：海外版价格单位为「美分」，输入 100 表示 $1.00</p>
                )}
              </div>

              {/* 权益 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">权益说明</label>
                <div className="flex gap-2 mb-2">
                  <input value={benefitInput} onChange={e => setBenefitInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-amber-400" placeholder="输入权益说明，按回车添加" />
                  <button type="button" onClick={addBenefit} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 transition-colors">添加</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form.benefits || []).map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                      {b}
                      <button type="button" onClick={() => removeBenefit(i)} className="hover:text-amber-900"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </form>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">取消</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
