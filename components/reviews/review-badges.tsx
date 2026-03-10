import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

export function RatingBadge({ rating }: { rating: number }) {
  return (
    <Badge variant="neutral" className="gap-1.5">
      <Star className="size-3.5 fill-current text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
      <span aria-hidden="true" className="text-foreground tabular-nums">{rating}</span>
      <span className="sr-only">{rating} stars</span>
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'posted_manual'
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
