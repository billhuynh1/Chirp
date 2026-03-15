import { cn } from '@/lib/utils';

type MetricPillProps = {
  label: string;
  theme?: 'light' | 'dark';
  className?: string;
};

export function MetricPill({ label, theme = 'light', className }: MetricPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-4 py-2 text-sm font-medium backdrop-blur-sm',
        theme === 'dark'
          ? 'border border-white/10 bg-white/[0.05] text-slate-200'
          : 'text-foreground/80 border border-border/70 bg-card/85 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
        className
      )}
    >
      {label}
    </div>
  );
}
