'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, ExternalLink, Upload, Code } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';

export default function ImportExportSection() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importFormat, setImportFormat] = useState<'csv' | 'html'>('csv');

  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
        <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.importExport')}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Export buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={async () => {
              try {
                const res = await api.get('/collections/export?format=json');
                const exportData = res.data?.data || res.data;
                const content = JSON.stringify(exportData, null, 2);
                const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'linkchest-export.json'; a.click();
                URL.revokeObjectURL(url);
              } catch { showAlert(t('settings.exportFailed'), 'error'); }
            }}
            className="py-2.5 bg-parchment/20 dark:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80 border-2 border-solid border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/60 flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <Code size={16} /> {t('settings.exportJson')}
          </button>
          <button
            onClick={async () => {
              try {
                const res = await api.get('/collections/export?format=csv', { responseType: 'blob' });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url; a.download = 'linkchest-export.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch { showAlert(t('settings.exportFailed'), 'error'); }
            }}
            className="py-2.5 bg-parchment/20 dark:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80 border-2 border-solid border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/60 flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <BarChart3 size={16} /> {t('settings.exportCsv')}
          </button>
          <button
            onClick={async () => {
              try {
                const res = await api.get('/collections/export?format=html', { responseType: 'text' });
                const blob = new Blob([res.data], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'linkchest-export.html'; a.click();
                URL.revokeObjectURL(url);
              } catch { showAlert(t('settings.exportFailed'), 'error'); }
            }}
            className="py-2.5 bg-parchment/20 dark:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80 border-2 border-solid border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/60 flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <ExternalLink size={16} /> {t('settings.exportHtml')}
          </button>
        </div>

        {/* Import section */}
        <div className="border-t border-chest-100 dark:border-chest-700/50 pt-3">
          {/* Format toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setImportFormat('csv')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${importFormat === 'csv' ? 'bg-chest-500 text-white' : 'bg-parchment/20 dark:bg-chest-700/40 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-chest-700/60'}`}
            >
              {t('settings.importFormatCsv')}
            </button>
            <button
              onClick={() => setImportFormat('html')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${importFormat === 'html' ? 'bg-chest-500 text-white' : 'bg-parchment/20 dark:bg-chest-700/40 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-chest-700/60'}`}
            >
              {t('settings.importFormatHtml')}
            </button>
          </div>

          {importProgress && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-taupe dark:text-parchment/60">{t('settings.importProgress')}</span>
                <span className="text-sm font-medium text-chest-500 dark:text-amber-400">{importProgress.current}/{importProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-parchment/20 dark:bg-chest-700/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-chest-500 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <label className="relative inline-flex items-center justify-center w-full py-2.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400 border-2 border-solid border-chest-200 dark:border-amber-400/20 rounded-lg cursor-pointer hover:bg-chest-500/10 dark:hover:bg-amber-400/20 transition-colors">
            <Upload size={16} className="mr-2" />
            <span>{t('settings.importSelectFile')}</span>
            <input
              type="file"
              accept={importFormat === 'csv' ? '.csv' : '.html,.htm'}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const ext = file.name.split('.').pop()?.toLowerCase();
                const detectedFormat = ext === 'html' || ext === 'htm' ? 'html' : 'csv';
                const effectiveFormat = detectedFormat === 'html' ? 'html' : importFormat;

                try {
                  if (effectiveFormat === 'html') {
                    const htmlContent = await file.text();
                    if (!htmlContent.trim() || !htmlContent.includes('<')) {
                      showToast(t('settings.htmlEmptyOrInvalid'), 'error');
                      e.target.value = '';
                      return;
                    }
                    if (!confirm(t('settings.importConfirm', { count: 'HTML书签' }))) {
                      e.target.value = '';
                      return;
                    }
                    setImportProgress({ current: 0, total: 1 });
                    const res = await api.post('/collections/import', { format: 'html', htmlContent }, { timeout: 120000 });
                    const result = res.data.data;
                    showToast(t('settings.importComplete', { success: result.success, skipped: result.skipped, error: result.error }), 'success');
                    setImportProgress(null);
                    queryClient.invalidateQueries({ queryKey: ['collections'] });
                  } else {
                    const text = await file.text();
                    const cleaned = text.replace(/^\uFEFF/, '');
                    const lines = cleaned.split(/\r?\n/).filter(l => l.trim());
                    if (lines.length < 2) { showToast(t('settings.csvEmptyOrInvalid'), 'error'); e.target.value = ''; return; }

                    const parseRow = (line: string): string[] => {
                      const result: string[] = [];
                      let current = '';
                      let inQuotes = false;
                      for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (ch === '"') {
                          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                          else { inQuotes = !inQuotes; }
                        } else if (ch === ',' && !inQuotes) {
                          result.push(current.trim());
                          current = '';
                        } else {
                          current += ch;
                        }
                      }
                      result.push(current.trim());
                      return result;
                    };

                    const headers = parseRow(lines[0]).map(h => h.trim().replace(/^["']|["']$/g, ''));
                    const findIdx = (...names: string[]) => {
                      for (const name of names) { const idx = headers.indexOf(name); if (idx >= 0) return idx; }
                      return -1;
                    };
                    const titleIdx = findIdx('标题', 'title', 'Title');
                    const urlIdx = findIdx('链接', 'url', 'URL', 'link', 'Link', '网址');
                    const platformIdx = findIdx('平台', 'platform', 'Platform');
                    const noteIdx = findIdx('备注', 'note', 'Note');
                    const tagsIdx = findIdx('标签', 'tags', 'Tags', 'tag');
                    const listsIdx = findIdx('分组', 'lists', 'Lists', 'list');

                    if (urlIdx === -1) { showToast(t('settings.csvMissingUrl'), 'error'); e.target.value = ''; return; }

                    const items = lines.slice(1).map(line => {
                      const cols = parseRow(line);
                      return {
                        title: titleIdx >= 0 ? cols[titleIdx] || '' : '',
                        url: (cols[urlIdx] || '').trim().replace(/\/+$/, ''),
                        platform: platformIdx >= 0 ? cols[platformIdx] || '' : '',
                        note: noteIdx >= 0 ? cols[noteIdx] || '' : '',
                        tags: tagsIdx >= 0 && cols[tagsIdx] ? cols[tagsIdx].split(';').filter(Boolean) : [],
                        lists: listsIdx >= 0 && cols[listsIdx] ? cols[listsIdx].split(';').filter(Boolean) : [],
                      };
                    }).filter(item => item.url);

                    if (items.length === 0) { showToast(t('settings.noValidData'), 'error'); e.target.value = ''; return; }
                    if (!confirm(t('settings.importConfirm', { count: items.length }))) { e.target.value = ''; return; }

                    const BATCH_SIZE = 200;
                    const totalResult = { success: 0, skipped: 0, error: 0 };
                    const batches = Math.ceil(items.length / BATCH_SIZE);

                    setImportProgress({ current: 0, total: items.length });
                    for (let i = 0; i < batches; i++) {
                      const batch = items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                      try {
                        const res = await api.post('/collections/import', { data: batch }, { timeout: 120000 });
                        const batchResult = res.data.data;
                        totalResult.success += batchResult.success;
                        totalResult.skipped += batchResult.skipped;
                        totalResult.error += batchResult.error;
                        const processed = Math.min((i + 1) * BATCH_SIZE, items.length);
                        setImportProgress({ current: processed, total: items.length });
                      } catch (err: unknown) {
                        const apiErr = err as ApiError;
                        const errorMsg = apiErr.response?.data?.message || apiErr.response?.data?.error || apiErr.message || t('common.error');
                        console.error(`Batch ${i + 1} import failed:`, errorMsg);
                        if ((err as { code?: string }).code === 'ERR_NETWORK' || apiErr.message === 'Network Error') {
                          showAlert(t('settings.importNetworkError'), 'error');
                          e.target.value = '';
                          setImportProgress(null);
                          return;
                        }
                        totalResult.error += batch.length;
                      }
                    }

                    showToast(t('settings.importComplete', { success: totalResult.success, skipped: totalResult.skipped, error: totalResult.error }), 'success');
                    setImportProgress(null);
                    queryClient.invalidateQueries({ queryKey: ['collections'] });
                  }
                } catch (err: unknown) {
                  showAlert(t('settings.importFailed') + ': ' + ((err as Error).message || ''), 'error');
                  setImportProgress(null);
                }
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
