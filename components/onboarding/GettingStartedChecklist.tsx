'use client';

import { useCallback, useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import type { OnboardingStatus } from '@/lib/services/businesses';
import { OnboardingStepCard } from './OnboardingStepCard';
import { cn } from '@/lib/utils';

export function GettingStartedChecklist({
  status
}: {
  status: OnboardingStatus;
}) {
  const [stepFeedbackActive, setStepFeedbackActive] = useState(false);
  const [activeStepHash, setActiveStepHash] = useState('');

  useEffect(() => {
    const syncHash = () => {
      setActiveStepHash(window.location.hash.replace('#', ''));
    };

    window.addEventListener('hashchange', syncHash);

    return () => {
      window.removeEventListener('hashchange', syncHash);
    };
  }, []);

  const triggerStepFeedback = useCallback(() => {
    setStepFeedbackActive(false);
    requestAnimationFrame(() => {
      setStepFeedbackActive(true);
    });
  }, []);

  useEffect(() => {
    if (!stepFeedbackActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStepFeedbackActive(false);
    }, 420);

    return () => {
      window.clearTimeout(timer);
    };
  }, [stepFeedbackActive]);

  if (status.allComplete) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] bg-card p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                🎉 Chirp is fully set up
              </p>
              <p className="text-sm text-muted-foreground">
                All steps are saved. Click &quot;Mark setup complete&quot; below to continue to
                your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = (status.completedCount / status.totalCount) * 100;

  return (
    <div className="rounded-[2rem] bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Rocket className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Getting Started
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Complete these steps to start managing reviews with Chirp.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full bg-primary transition-all duration-500',
              stepFeedbackActive && 'setup-progress-pulse'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span
          className={cn(
            'shrink-0 text-sm font-semibold text-muted-foreground',
            stepFeedbackActive && 'setup-count-pulse'
          )}
        >
          {status.completedCount}/{status.totalCount}
        </span>
      </div>

      <ul className="mt-4 space-y-2" aria-label="Setup steps">
        {status.steps.map((step) => (
          <li key={step.id} className="list-none">
            <OnboardingStepCard
              step={step}
              isActive={activeStepHash.length > 0 && step.href.endsWith(`#${activeStepHash}`)}
              onStepActivate={triggerStepFeedback}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
