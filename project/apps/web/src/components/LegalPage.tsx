'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { isLoggedIn } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1 class="text-2xl font-bold mt-8 mb-4 text-charcoal dark:text-parchment">${escapeHtml(trimmed.slice(2))}</h1>`;
    } else if (trimmed.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 class="text-xl font-bold mt-6 mb-3 text-charcoal dark:text-parchment">${escapeHtml(trimmed.slice(3))}</h2>`;
    } else if (trimmed.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 class="text-lg font-bold mt-4 mb-2 text-charcoal dark:text-parchment">${escapeHtml(trimmed.slice(4))}</h3>`;
    } else if (trimmed === '---') {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<hr class="my-6 border-t border-chest-500/10 dark:border-parchment/10" />`;
    } else if (trimmed.startsWith('- ')) {
      if (!inList) { html += '<ul class="list-disc ml-6 mb-4 space-y-1">'; inList = true; }
      html += `<li class="text-charcoal dark:text-parchment/90">${escapeHtml(trimmed.slice(2))}</li>`;
    } else if (trimmed === '') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<div class="h-2"></div>';
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      let processed = escapeHtml(trimmed).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p class="mb-3 leading-relaxed text-charcoal dark:text-parchment/90">${processed}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

interface LegalPageProps {
  title: string;
  mdFileEn: string;
  mdFileZh: string;
}

export default function LegalPage({ title, mdFileEn, mdFileZh }: LegalPageProps) {
  const { locale } = useI18n();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoggedInState, setIsLoggedInState] = useState(false);

  useEffect(() => {
    setIsLoggedInState(isLoggedIn());
    const file = locale === 'zh' ? mdFileZh : mdFileEn;
    fetch(`/terms/${file}`)
      .then((r) => r.text())
      .then((text) => {
        setContent(markdownToHtml(text));
        setLoading(false);
      });
  }, [locale, mdFileEn, mdFileZh]);

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href={isLoggedInState ? '/settings' : '/login'} className="p-2 rounded-md hover:bg-chest-50 dark:hover:bg-chest-800 transition-colors">
            <ArrowLeft size={20} className="text-charcoal dark:text-parchment" />
          </Link>
          <h1 className="text-2xl font-bold text-charcoal dark:text-parchment">{title}</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-chest-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
    </div>
  );
}
