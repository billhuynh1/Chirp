import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkflowStepProps = {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  theme?: 'light' | 'dark';
  className?: string;
};

export function WorkflowStep({
  number,
  icon: Icon,
  title,
  description,
  theme = 'light',
  className
}: WorkflowStepProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'relative rounded-[1.85rem] p-6',
        isDark
          ? 'border-0 ring-0 bg-[#101925] shadow-none'
          : 'bg-card/85 dark:bg-white/5',
        className
      )}
    >
      <div className="flex items-center">
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-2xl border',
            isDark
              ? 'border-white/10 bg-white/8 text-[#7fd6ff]'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <h3 className={cn('mt-6 text-lg font-semibold', isDark ? 'text-white' : 'text-slate-950 dark:text-white')}>
        {title}
      </h3>
      <p className={cn('mt-3 text-sm leading-7', isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300')}>
        {description}
      </p>
    </div>
  );
}
