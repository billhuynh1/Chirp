import { PartyPopper, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingStatus } from '@/lib/services/businesses';
import { OnboardingStepCard } from './OnboardingStepCard';
import { dismissOnboardingAction } from '@/app/dashboard/actions';

export function GettingStartedChecklist({
  status
}: {
  status: OnboardingStatus;
}) {
  if (status.allComplete) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PartyPopper className="size-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                🎉 Chirp is fully set up
              </p>
              <p className="text-sm text-muted-foreground">
                New reviews will now appear automatically. You&apos;re all set!
              </p>
            </div>
          </div>
          <form action={dismissOnboardingAction}>
            <Button
              variant="outline"
              className="rounded-full border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Dismiss
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const progressPercent = (status.completedCount / status.totalCount) * 100;

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
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
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {status.completedCount}/{status.totalCount}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {status.steps.map((step) => (
          <OnboardingStepCard key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
