import { cn } from '@/lib/utils';

type MetricPillProps = {
  label: string;
  className?: string;
};

export function MetricPill({ label, className }: MetricPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
        className
      )}
    >
      {label}
    </div>
  );
}
