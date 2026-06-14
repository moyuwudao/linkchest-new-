'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, FolderTree, Share2, Rocket, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface OnboardingModalProps {
  onComplete: (dismissForever?: boolean) => void;
}

const STEPS = [
  { icon: Sparkles, titleKey: 'step1Title', descKey: 'step1Desc', highlights: ['step1H1', 'step1H2', 'step1H3'], color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { icon: FolderTree, titleKey: 'step2Title', descKey: 'step2Desc', highlights: ['step2H1', 'step2H2', 'step2H3'], color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { icon: Share2, titleKey: 'step3Title', descKey: 'step3Desc', highlights: ['step3H1', 'step3H2', 'step3H3'], color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
];

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [dismissForever, setDismissForever] = useState(false);

  const completeMutation = useMutation({
    mutationFn: async () => api.post('/auth/complete-onboarding'),
    onSuccess: () => {
      onComplete(dismissForever);
    },
    onError: () => {
      onComplete(dismissForever);
    },
  });

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeMutation.mutate();
    }
  };

  const handleSkip = () => {
    completeMutation.mutate();
  };

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLastStep = step === STEPS.length - 1;
  const isSubmitting = completeMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-chest-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                i <= step ? 'bg-amber-400' : 'bg-chest-100 dark:bg-chest-700'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5', currentStep.bg)}>
            <Icon size={28} className={currentStep.color} strokeWidth={1.8} />
          </div>

          <p className="text-xs text-chest-400 dark:text-parchment/40 mb-1.5">
            {t('onboarding.step', { current: step + 1, total: STEPS.length })}
          </p>

          <h2 className="text-lg font-semibold text-chest-800 dark:text-parchment mb-2">
            {t(`onboarding.${currentStep.titleKey}`)}
          </h2>

          <p className="text-sm text-chest-500 dark:text-parchment/60 leading-relaxed mb-5">
            {t(`onboarding.${currentStep.descKey}`)}
          </p>

          {/* Feature highlights */}
          <div className="space-y-2.5 text-left">
            {currentStep.highlights.map((key, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-chest-50/60 dark:bg-chest-700/30">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span className="text-sm text-chest-600 dark:text-parchment/70 leading-snug">
                  {t(`onboarding.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dismiss forever checkbox */}
        <div className="px-8 pt-2 pb-2 flex items-center justify-center">
          <label className="flex items-center gap-2 text-xs text-chest-400 dark:text-parchment/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dismissForever}
              onChange={(e) => setDismissForever(e.target.checked)}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            {t('onboarding.doNotShowAgain')}
          </label>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-chest-400 dark:text-parchment/50 hover:text-chest-600 dark:hover:text-parchment/70 transition-colors disabled:opacity-50"
          >
            {t('onboarding.skip')}
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-amber-400 text-chest-500 hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('onboarding.addingExamples')}
              </>
            ) : isLastStep ? (
              <>
                <Rocket size={16} />
                {t('onboarding.start')}
              </>
            ) : (
              <>
                {t('onboarding.next')}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
