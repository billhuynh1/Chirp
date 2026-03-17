import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  FileText,
  LogOut,
  Mail,
  MessageSquare,
  Settings,
  ShieldAlert,
  UserCog,
  UserMinus,
  UserPlus,
  Lock,
  type LucideIcon
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema';
import {
  getActivityLogs,
  getRecentBusinessAuditLogs,
  getReviewActivityContext
} from '@/lib/db/queries';

const accountIconMap: Partial<Record<ActivityType, LucideIcon>> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle
};

const auditIconMap: Record<string, LucideIcon> = {
  update_business_settings: Settings,
  regenerate_draft: FileText,
  approve_draft: CheckCircle,
  reject_draft: MessageSquare,
  mark_posted: ArrowUpRight,
  acknowledge_no_reply: MessageSquare,
  escalate_review: ShieldAlert
};

function getAuditTone(action: string) {
  switch (action) {
    case 'approve_draft':
    case 'mark_posted':
      return {
        chipClassName: 'bg-success/15',
        iconClassName: 'text-success'
      };
    case 'reject_draft':
    case 'escalate_review':
      return {
        chipClassName: 'bg-danger/15',
        iconClassName: 'text-danger'
      };
    case 'acknowledge_no_reply':
      return {
        chipClassName: 'bg-warning/15',
        iconClassName: 'text-warning'
      };
    case 'regenerate_draft':
      return {
        chipClassName: 'bg-secondary/15',
        iconClassName: 'text-secondary'
      };
    case 'update_business_settings':
      return {
        chipClassName: 'bg-accent',
        iconClassName: 'text-foreground/70'
      };
    default:
      return {
        chipClassName: 'bg-secondary/15',
        iconClassName: 'text-secondary'
      };
  }
}

function getAccountTone(action: ActivityType) {
  switch (action) {
    case ActivityType.SIGN_IN:
    case ActivityType.SIGN_UP:
    case ActivityType.ACCEPT_INVITATION:
      return {
        chipClassName: 'bg-success/15',
        iconClassName: 'text-success'
      };
    case ActivityType.SIGN_OUT:
    case ActivityType.DELETE_ACCOUNT:
    case ActivityType.REMOVE_TEAM_MEMBER:
      return {
        chipClassName: 'bg-danger/15',
        iconClassName: 'text-danger'
      };
    case ActivityType.UPDATE_PASSWORD:
      return {
        chipClassName: 'bg-warning/15',
        iconClassName: 'text-warning'
      };
    case ActivityType.UPDATE_ACCOUNT:
    case ActivityType.CREATE_TEAM:
    case ActivityType.INVITE_TEAM_MEMBER:
      return {
        chipClassName: 'bg-secondary/15',
        iconClassName: 'text-secondary'
      };
    default:
      return {
        chipClassName: 'bg-accent',
        iconClassName: 'text-foreground/70'
      };
  }
}

function getRelativeTime(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function formatAccountAction(action: ActivityType): string {
  switch (action) {
    case ActivityType.SIGN_UP:
      return 'You signed up';
    case ActivityType.SIGN_IN:
      return 'You signed in';
    case ActivityType.SIGN_OUT:
      return 'You signed out';
    case ActivityType.UPDATE_PASSWORD:
      return 'You changed your password';
    case ActivityType.DELETE_ACCOUNT:
      return 'You deleted your account';
    case ActivityType.UPDATE_ACCOUNT:
      return 'You updated your account';
    case ActivityType.CREATE_TEAM:
      return 'You created a new team';
    case ActivityType.REMOVE_TEAM_MEMBER:
      return 'You removed a team member';
    case ActivityType.INVITE_TEAM_MEMBER:
      return 'You invited a team member';
    case ActivityType.ACCEPT_INVITATION:
      return 'You accepted an invitation';
    default:
      return 'Unknown account action';
  }
}

function getReviewIdFromAuditLog(log: {
  entityType: string;
  entityId: number;
  metadata: Record<string, unknown>;
}) {
  if (log.entityType === 'review') {
    return log.entityId;
  }

  const metadataReviewId = log.metadata.reviewId;
  if (typeof metadataReviewId === 'number' && Number.isInteger(metadataReviewId)) {
    return metadataReviewId;
  }

  return null;
}

function formatAuditAction(action: string, userName?: string | null) {
  const actor = userName?.trim() || 'A teammate';

  switch (action) {
    case 'update_business_settings':
      return `${actor} updated drafting settings`;
    case 'regenerate_draft':
      return `${actor} generated a draft`;
    case 'approve_draft':
      return `${actor} approved a draft`;
    case 'reject_draft':
      return `${actor} rejected a draft`;
    case 'mark_posted':
      return `${actor} marked a reply as posted`;
    case 'acknowledge_no_reply':
      return `${actor} closed a review with no reply`;
    case 'escalate_review':
      return `${actor} escalated a review`;
    default:
      return `${actor} ${action.replaceAll('_', ' ')}`;
  }
}

export default async function ActivityPage() {
  const [auditLogs, accountLogs] = await Promise.all([
    getRecentBusinessAuditLogs(),
    getActivityLogs()
  ]);

  const reviewIds = auditLogs
    .map(getReviewIdFromAuditLog)
    .filter((reviewId): reviewId is number => reviewId !== null);
  const reviewContextRows = await getReviewActivityContext([...new Set(reviewIds)]);
  const reviewContextMap = new Map(
    reviewContextRows.map((row) => [row.reviewId, row])
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground text-xs font-medium">Activity</p>
        <h1 className="mt-2 text-3xl font-semibold">Recent activity</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-7">
          Review workflow activity appears first so the dashboard link opens into the
          operational work your team is moving through. Account and team events are still
          available below.
        </p>
      </div>

      <Card id="review-workflow" className="bg-card/90 scroll-mt-24">
        <CardHeader>
          <CardTitle>Review workflow</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length > 0 ? (
            <ul className="space-y-3">
              {auditLogs.map((log) => {
                const Icon = auditIconMap[log.action] || FileText;
                const tone = getAuditTone(log.action);
                const reviewId = getReviewIdFromAuditLog(log);
                const reviewContext = reviewId ? reviewContextMap.get(reviewId) : null;
                const href = reviewId ? `/dashboard/reviews/${reviewId}` : null;
                const content = (
                  <div className="rounded-[1.25rem] border border-border/70 bg-muted/30 px-4 py-4 transition hover:bg-muted/45">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${tone.chipClassName}`}>
                        <Icon className={`h-4 w-4 ${tone.iconClassName}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {formatAuditAction(log.action, log.userName)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {getRelativeTime(new Date(log.createdAt))}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {reviewContext
                            ? `${reviewContext.reviewerName || 'Reviewer'} at ${reviewContext.locationName}`
                            : 'Business settings and workflow controls'}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <li key={log.id}>
                    {href ? (
                      <Link href={href} className="block">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-secondary" />
              <h3 className="text-foreground mb-2 text-lg font-semibold">
                No review workflow activity yet
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Draft approvals, posted replies, no-reply acknowledgements, and settings
                changes will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/90">
        <CardHeader>
          <CardTitle>Account &amp; team</CardTitle>
        </CardHeader>
        <CardContent>
          {accountLogs.length > 0 ? (
            <ul className="space-y-3">
              {accountLogs.map((log) => {
                const action = log.action as ActivityType;
                const Icon = accountIconMap[action] || Settings;
                const tone = getAccountTone(action);

                return (
                  <li key={log.id} className="rounded-[1.25rem] border border-border/70 bg-muted/30 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${tone.chipClassName}`}>
                        <Icon className={`h-4 w-4 ${tone.iconClassName}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {formatAccountAction(action)}
                            {log.ipAddress && ` from IP ${log.ipAddress}`}
                          </p>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {getRelativeTime(new Date(log.timestamp))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-secondary" />
              <h3 className="text-foreground mb-2 text-lg font-semibold">
                No account activity yet
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Sign-ins, invites, and account changes will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
