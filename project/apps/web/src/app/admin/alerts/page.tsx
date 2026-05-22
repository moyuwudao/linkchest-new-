'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Trash2, Edit3, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Clock, Send, AlertTriangle } from 'lucide-react';
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, testAlertRule, getAlertHistory } from '@/lib/adminApi';

interface AlertRule { id: string; name: string; type: string; conditionConfig: Record<string, number>; channels: Record<string, string[]>; enabled: boolean; cooldownMinutes: number; priority: 'P0' | 'P1' | 'P2' | 'P3'; silentStart: string | null; silentEnd: string | null; }

const typeLabels: Record<string, string> = { error_rate: '错误率', error_count: '错误数', response_time: '响应时间', service_down: '服务宕机' };
const pConfig: Record<string, { label: string; color: string }> = {
  P0: { label: '紧急', color: 'bg-red-50 text-red-600' },
  P1: { label: '严重', color: 'bg-amber-50 text-amber-600' },
  P2: { label: '一般', color: 'bg-blue-50 text-blue-600' },
  P3: { label: '提示', color: 'bg-gray-100 text-gray-500' },
};

function PB({ p }: { p: string }) { const c = pConfig[p] || pConfig.P3; return <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[11px] font-medium ${c.color}`}>{p} {c.label}</span>; }

export default function AdminAlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [hTotal, setHTotal] = useState(0);
  const [hPage, setHPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'error_rate', conditionConfig: { window: 300, threshold: 0.1 }, channels: { email: [] as string[], feishu: [] as string[], wecom: [] as string[] }, enabled: true, cooldownMinutes: 30, priority: 'P1' as 'P0'|'P1'|'P2'|'P3', silentStart: '', silentEnd: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([getAlertRules(), getAlertHistory({ page: hPage, pageSize: 10 })]);
      setRules(r.data.rules || []); setHistory(h.data.items || []); setHTotal(h.data.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [hPage]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditId(null); setForm({ name: '', type: 'error_rate', conditionConfig: { window: 300, threshold: 0.1 }, channels: { email: [], feishu: [], wecom: [] }, enabled: true, cooldownMinutes: 30, priority: 'P1', silentStart: '', silentEnd: '' }); setModal(true); }
  function openEdit(rule: AlertRule) { setEditId(rule.id); setForm({ name: rule.name, type: rule.type as 'error_rate', conditionConfig: rule.conditionConfig as { window: number; threshold: number }, channels: (rule.channels || { email: [], feishu: [], wecom: [] }) as { email: string[]; feishu: string[]; wecom: string[] }, enabled: rule.enabled, cooldownMinutes: rule.cooldownMinutes, priority: rule.priority, silentStart: rule.silentStart || '', silentEnd: rule.silentEnd || '' }); setModal(true); }

  async function submit() {
    try { const d = { ...form, silentStart: form.silentStart || null, silentEnd: form.silentEnd || null } as import('@/lib/types').AlertRuleInput; if (editId) await updateAlertRule(editId, d); else await createAlertRule(d); setModal(false); load(); } catch { alert('保存失败'); }
  }

  async function del(id: string) { if (!confirm('确定删除？')) return; try { await deleteAlertRule(id); load(); } catch { alert('删除失败'); } }
  async function toggle(id: string, en: boolean) { try { await updateAlertRule(id, { enabled: en }); setRules(p => p.map(r => r.id === id ? { ...r, enabled: en } : r)); } catch { alert('更新失败'); } }
  async function test(id: string) { try { await testAlertRule(id); alert('测试消息已发送'); } catch { alert('测试失败'); } }

  async function addRecommendedRules() {
    const recommendations = [
      { name: '5xx错误率监控', type: 'error_rate' as const, conditionConfig: { window: 300, threshold: 0.05 }, priority: 'P0' as const, cooldownMinutes: 10 },
      { name: 'API响应时间异常', type: 'response_time' as const, conditionConfig: { window: 300, threshold: 2000 }, priority: 'P1' as const, cooldownMinutes: 15 },
      { name: '服务宕机检测', type: 'service_down' as const, conditionConfig: { window: 60, threshold: 1 }, priority: 'P0' as const, cooldownMinutes: 5 },
    ];
    try {
      for (const r of recommendations) {
        await createAlertRule({ ...r, channels: { email: [], feishu: [], wecom: [] }, enabled: true });
      }
      load();
    } catch {
      alert('添加推荐规则失败');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600"><Bell className="w-4 h-4" /><span>告警规则</span><span className="text-gray-400">({rules.length})</span></div>
          <div className="flex items-center gap-2">
            <button onClick={addRecommendedRules} className="btn-secondary btn-sm">添加推荐规则</button>
            <button onClick={openCreate} className="btn-primary btn-sm"><Plus className="w-3.5 h-3.5" />新建规则</button>
          </div>
        </div>
        {loading && rules.length === 0 ? (
          <div className="p-8 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 skeleton rounded" />)}</div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">暂无告警规则，点击「新建规则」创建</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rules.map(rule => (
              <div key={rule.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggle(rule.id, !rule.enabled)} className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${rule.enabled ? 'bg-amber-400' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} /></button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-800 font-medium">{rule.name}</span>
                      <PB p={rule.priority} />
                      <span className="text-[11px] text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded-sm">{typeLabels[rule.type] || rule.type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                      <span>窗口: {rule.conditionConfig.window}s</span>
                      <span>阈值: {rule.conditionConfig.threshold}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />冷却 {rule.cooldownMinutes}min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => test(rule.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" title="测试"><Send className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(rule)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" title="编辑"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(rule.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600"><AlertTriangle className="w-4 h-4" /><span>告警历史</span><span className="text-gray-400">({hTotal})</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => setHPage(p => Math.max(1, p - 1))} disabled={hPage <= 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-gray-500 px-2">{hPage} / {Math.ceil(hTotal / 10) || 1}</span>
            <button onClick={() => setHPage(p => Math.min(Math.ceil(hTotal / 10) || 1, p + 1))} disabled={hPage >= Math.ceil(hTotal / 10)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {history.map((item: Record<string, unknown>) => (
            <div key={item.id as string} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <PB p={item.priority as string} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700">{item.ruleName as string}</p>
                  <p className="text-[11px] text-gray-500 truncate">{item.message as string}</p>
                </div>
                <div className="text-[11px] text-gray-400 shrink-0">{new Date(item.createdAt as string).toLocaleString('zh-CN')}</div>
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">暂无告警记录</div>}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">{editId ? '编辑告警规则' : '新建告警规则'}</h3>
              <button onClick={() => setModal(false)} className="p-1 rounded hover:bg-gray-100"><XCircle className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
              <div><label className="label text-xs text-gray-500">规则名称</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-sm" placeholder="如：5xx错误率监控" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-xs text-gray-500">类型</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'error_rate' }))} className="input text-sm"><option value="error_rate">错误率</option><option value="error_count">错误数</option><option value="response_time">响应时间</option><option value="service_down">服务宕机</option></select></div>
                <div><label className="label text-xs text-gray-500">优先级</label><select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'P0'|'P1'|'P2'|'P3' }))} className="input text-sm"><option value="P0">P0 紧急</option><option value="P1">P1 严重</option><option value="P2">P2 一般</option><option value="P3">P3 提示</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-xs text-gray-500">时间窗口（秒）</label><input type="number" value={form.conditionConfig.window} onChange={e => setForm(f => ({ ...f, conditionConfig: { ...f.conditionConfig, window: parseInt(e.target.value) || 300 } }))} className="input text-sm" /></div>
                <div><label className="label text-xs text-gray-500">阈值</label><input type="number" step={0.01} value={form.conditionConfig.threshold} onChange={e => setForm(f => ({ ...f, conditionConfig: { ...f.conditionConfig, threshold: parseFloat(e.target.value) || 0 } }))} className="input text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-xs text-gray-500">冷却时间（分钟）</label><input type="number" value={form.cooldownMinutes} onChange={e => setForm(f => ({ ...f, cooldownMinutes: parseInt(e.target.value) || 30 }))} className="input text-sm" /></div>
                <div className="flex items-center gap-2 pt-6"><input id="en" type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="w-4 h-4 rounded accent-amber-400" /><label htmlFor="en" className="text-sm text-gray-600">启用规则</label></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-xs text-gray-500">静默开始 HH:MM（可选）</label><input type="text" value={form.silentStart} onChange={e => setForm(f => ({ ...f, silentStart: e.target.value }))} className="input text-sm" placeholder="23:00" /></div>
                <div><label className="label text-xs text-gray-500">静默结束 HH:MM（可选）</label><input type="text" value={form.silentEnd} onChange={e => setForm(f => ({ ...f, silentEnd: e.target.value }))} className="input text-sm" placeholder="07:00" /></div>
              </div>
              <div><label className="label text-xs text-gray-500">邮件地址（逗号分隔）</label><input type="text" value={form.channels.email?.join(',') || ''} onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, email: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} className="input text-sm" placeholder="admin@linkchest.net" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-xs text-gray-500">飞书 Webhook</label><input type="text" value={form.channels.feishu?.[0] || ''} onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, feishu: e.target.value ? [e.target.value] : [] } }))} className="input text-sm" placeholder="https://open.feishu.cn/..." /></div>
                <div><label className="label text-xs text-gray-500">企微 Webhook</label><input type="text" value={form.channels.wecom?.[0] || ''} onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, wecom: e.target.value ? [e.target.value] : [] } }))} className="input text-sm" placeholder="https://qyapi.weixin.qq.com/..." /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={submit} className="btn-primary btn-sm"><CheckCircle2 className="w-3.5 h-3.5" />保存</button>
                <button onClick={() => setModal(false)} className="btn-secondary btn-sm">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
