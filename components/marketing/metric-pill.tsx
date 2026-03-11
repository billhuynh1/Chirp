import { cn } from '@/lib/utils';

type MetricPillProps = {
  label: string;
  className?: string;
};

export function MetricPill({ label, className }: MetricPillProps) {
  return (
    <div
      className={cn(
        'text-foreground/80 inline-flex items-center rounded-full border border-border/70 bg-card/85 px-4 py-2 text-sm font-medium backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
        className
      )}
    >
      {label}
    </div>
  );
}
