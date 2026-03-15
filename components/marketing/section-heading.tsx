import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
  theme?: 'light' | 'dark';
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  theme = 'light',
  className
}: SectionHeadingProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      <p
        className={cn(
          'text-xs font-semibold uppercase tracking-[0.28em]',
          isDark ? 'text-[#ffc2ad]' : 'text-primary'
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          'mt-4 text-3xl font-semibold tracking-tight sm:text-4xl',
          isDark ? 'text-white' : 'text-slate-950 dark:text-white'
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          'mt-4 text-base leading-8',
          isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'
        )}
      >
        {description}
      </p>
    </div>
  );
}
