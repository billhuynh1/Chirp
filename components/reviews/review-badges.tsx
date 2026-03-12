import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

export function RatingBadge({ rating }: { rating: number }) {
  const boundedRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <Badge variant="neutral" className="gap-2">
      <span aria-hidden="true" className="text-foreground tabular-nums">{boundedRating}</span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = index < boundedRating;

          return (
            <Star
              key={index}
              className={
                filled
                  ? 'size-3.5 fill-current text-yellow-500 dark:text-yellow-400'
                  : 'size-3.5 text-muted-foreground/50'
              }
            />
          );
        })}
      </span>
      <span className="sr-only">{rating} stars</span>
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'posted_manual' || status === 'closed_no_reply'
      ? 'success'
      : status === 'needs_attention' || status === 'rejected'
      ? 'danger'
      : status === 'draft_ready' || status === 'approved'
      ? 'warning'
      : 'default';

  return (
    <Badge variant={variant}>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}

export function UrgencyBadge({ urgency }: { urgency?: string | null }) {
  const variant =
    urgency === 'critical' || urgency === 'high'
      ? 'danger'
      : urgency === 'medium'
      ? 'warning'
      : urgency
      ? 'neutral'
      : 'default';

  return <Badge variant={variant}>{urgency ?? 'low'}</Badge>;
}
