import Link from 'next/link';
import { Building2, CheckCircle2, Link2, Sparkles } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { OnboardingStep } from '@/lib/services/businesses';
import { cn } from '@/lib/utils';

const stepIcons = {
  building: Building2,
  link: Link2,
  sparkles: Sparkles
} as const;

export function OnboardingStepCard({
  step,
  onStepActivate,
  isActive = false
}: {
  step: OnboardingStep;
  onStepActivate?: () => void;
  isActive?: boolean;
}) {
  const triggerSectionFlash = () => {
    const [, hash] = step.href.split('#');
    if (!hash) {
      return;
    }

    const target = document.getElementById(hash);
    if (!target) {
      return;
    }

    target.classList.remove('setup-target-flash-active');
    void target.offsetWidth;
    target.classList.add('setup-target-flash-active');
  };

  const StepIcon = step.isComplete ? CheckCircle2 : stepIcons[step.iconKey];

  const handleStepClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onStepActivate?.();
    triggerSectionFlash();

    const [, hash] = step.href.split('#');
    if (!hash) {
      return;
    }

    const target = document.getElementById(hash);
    if (!target) {
      return;
    }

    event.preventDefault();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });

    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    }
  };

  return (
    <Link
      href={step.href}
      aria-current={isActive ? 'step' : undefined}
      onClick={handleStepClick}
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-2xl p-4 transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        step.isComplete
          ? 'bg-primary/10'
          : 'bg-muted hover:bg-accent',
        isActive && 'ring-2 ring-ring/40 bg-accent'
      )}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
          step.isComplete
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary group-hover:bg-primary/15'
        )}
      >
        <StepIcon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-semibold',
            step.isComplete
              ? 'text-foreground line-through decoration-primary/50'
              : 'text-foreground'
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {step.description}
        </p>
      </div>

      {!step.isComplete && (
        <span className="shrink-0 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Set up →
        </span>
      )}
    </Link>
  );
}
