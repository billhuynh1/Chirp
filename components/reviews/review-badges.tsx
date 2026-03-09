import { Badge } from '@/components/ui/badge';

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
