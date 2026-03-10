import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default:
          'border-border bg-muted text-foreground',
        success:
          'border-success/30 bg-success/15 text-success',
        warning:
          'border-warning/30 bg-warning/15 text-warning',
        danger:
          'border-danger/30 bg-danger/15 text-danger',
        neutral:
          'border-border bg-muted/70 text-muted-foreground'
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
