import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { OnboardingStep } from '@/lib/services/businesses';
import { cn } from '@/lib/utils';

export function OnboardingStepCard({ step }: { step: OnboardingStep }) {
  return (
    <Link
      href={step.href}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border p-4 transition-all',
        step.isComplete
          ? 'border-primary/30 bg-primary/10'
          : 'border-border bg-muted hover:border-primary/40 hover:bg-accent'
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
        {step.isComplete ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <step.icon className="size-5" />
        )}
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
