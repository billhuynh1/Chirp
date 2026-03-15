import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: string;
  theme?: 'light' | 'dark';
  className?: string;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  theme = 'light',
  className
}: FeatureCardProps) {
  const isDark = theme === 'dark';

  return (
    <Card
      className={cn(
        'h-full rounded-[1.85rem] py-0 shadow-none',
        isDark
          ? 'marketing-panel border-white/10 bg-white/[0.05]'
          : 'bg-card/85 dark:bg-white/5',
        className
      )}
    >
      <CardHeader className="space-y-4 px-7 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-2xl border',
              isDark
                ? 'border-white/10 bg-white/8 text-[#ffb095]'
                : 'text-primary border-primary/20 bg-primary/10 dark:border-[#f0b7a0]/20 dark:bg-[#f0b7a0]/10 dark:text-[#f7c8b6]'
            )}
          >
            <Icon className="size-5" />
          </div>
          {accent ? (
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
                isDark ? 'bg-white/8 text-slate-300' : 'bg-muted text-muted-foreground'
              )}
            >
              {accent}
            </span>
          ) : null}
        </div>
        <CardTitle className={cn('text-xl', isDark ? 'text-white' : 'text-slate-950 dark:text-white')}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('px-7 pb-7 text-sm leading-7', isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300')}>
        {description}
      </CardContent>
    </Card>
  );
}
