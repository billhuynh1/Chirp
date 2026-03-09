import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default:
          'border-slate-200 bg-slate-100 text-slate-800 dark:border-[#2a4643] dark:bg-[#14302f] dark:text-[#d7ece6]',
        success:
          'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200',
        warning:
          'border-secondary/30 bg-secondary/15 text-secondary',
        danger:
          'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/15 dark:text-rose-200',
        neutral:
          'border-stone-200 bg-stone-100 text-stone-700 dark:border-[#34504d] dark:bg-[#192d2c] dark:text-[#c7d6d2]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
