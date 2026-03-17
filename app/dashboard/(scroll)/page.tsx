import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  getDashboardSummary,
  getReviewAnalytics,
  listBusinessReviews,
  listRecentHandledReviews
} from '@/lib/services/reviews';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

function getRelativeTime(date: Date) {
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getRecentActionLabel(workflowStatus: string) {
  if (workflowStatus === 'posted_manual') return 'Marked posted';
  if (workflowStatus === 'closed_no_reply') return 'No-reply acknowledged';
  if (workflowStatus === 'approved') return 'Approved draft';
  return workflowStatus.replaceAll('_', ' ');
}

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  if (!workspace.business.onboardingCompletedAt) {
    redirect('/dashboard/setup');
  }

  const [summary, analytics, reviews, recentHandled] = await Promise.all([
    getDashboardSummary(workspace.business.id),
    getReviewAnalytics(workspace.business.id),
    listBusinessReviews(workspace.business.id),
    listRecentHandledReviews(workspace.business.id)
  ]);

  const urgentReviews = reviews.filter(
    (review) =>
      (review.latestAnalysis?.urgency === 'high' ||
        review.latestAnalysis?.urgency === 'critical') &&
      review.workflowStatus !== 'posted_manual' &&
      review.workflowStatus !== 'closed_no_reply'
  );
  const compactStatusSet = new Set([
    'approved',
    'draft_ready',
    'posted_manual',
    'rejected',
    'closed_no_reply'
  ]);
  const isGoogleSyncConnected = Boolean(workspace.connectedAccount);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium">
            Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Review operations for {workspace.business.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-7">
            Track new reviews, surface urgent negatives, and keep approved
            replies moving through a manual-post workflow.
          </p>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Urgent reviews</CardTitle>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/dashboard/inbox?urgency=urgent">Open inbox</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {urgentReviews.length === 0 ? (
            <div className="text-muted-foreground rounded-[1.5rem] border border-dashed border-border/70 bg-muted/30 px-5 py-8 text-sm">
              No urgent reviews right now.
            </div>
          ) : (
            urgentReviews.slice(0, 5).map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.id}`}
                className="block rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 transition hover:-translate-y-px hover:bg-muted/45"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RatingBadge rating={review.starRating} />
                  <UrgencyBadge urgency={review.latestAnalysis?.urgency} />
                  {compactStatusSet.has(review.workflowStatus) ? (
                    <ReviewStatusBadge status={review.workflowStatus} />
                  ) : null}
                </div>
                <p className="text-foreground/90 mt-3 line-clamp-2 text-sm leading-6">
                  {review.reviewText || 'Rating-only review'}
                </p>
                <p className="text-muted-foreground mt-3 text-xs uppercase tracking-[0.18em]">
                  {review.location.name}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent</CardTitle>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/dashboard/activity#review-workflow">View all activity</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentHandled.length === 0 ? (
            <div className="text-muted-foreground rounded-[1.5rem] border border-dashed border-border/70 bg-muted/30 px-5 py-6 text-sm">
              No recent handled reviews yet.
            </div>
          ) : (
            recentHandled.map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.id}`}
                className="block rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3 transition hover:-translate-y-px hover:bg-muted/45"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ReviewStatusBadge status={review.workflowStatus} />
                    <span className="truncate text-sm font-medium text-foreground">
                      {review.reviewerName || 'Reviewer'} at {review.location.name}
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {getRelativeTime(review.updatedAt)}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {getRecentActionLabel(review.workflowStatus)}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {isGoogleSyncConnected ? 'Google Sync connected' : 'Google Sync not connected'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-6">
            {isGoogleSyncConnected
              ? 'Connection is active. Manage locations and sync settings in setup.'
              : 'Connect Google Business Profile in setup to import and sync reviews.'}
          </p>
        </div>
        {isGoogleSyncConnected ? (
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard/setup">Manage Google Sync</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard/setup">Finish setup</Link>
          </Button>
        )}
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>MVP analytics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 transition hover:bg-muted/45">
            <p className="text-muted-foreground">Imported reviews</p>
            <p className="text-foreground mt-1 text-2xl font-semibold">
              {analytics.importedReviews}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 transition hover:bg-muted/45">
            <p className="text-muted-foreground">Generated drafts</p>
            <p className="text-foreground mt-1 text-2xl font-semibold">
              {analytics.generatedDrafts}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 transition hover:bg-muted/45">
            <p className="text-muted-foreground">Posted manually</p>
            <p className="text-foreground mt-1 text-2xl font-semibold">
              {analytics.postedReviews}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm">Review Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-muted-foreground text-sm">New reviews</p>
                <p className="text-foreground mt-1 text-2xl font-semibold">{summary.newReviews}</p>
              </div>
              <Inbox className="text-muted-foreground size-4" />
            </div>
            <div className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-muted-foreground text-sm">Urgent reviews</p>
                <p className="text-foreground mt-1 text-2xl font-semibold">{summary.urgentReviews}</p>
              </div>
              <AlertTriangle className="text-muted-foreground size-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm">Reply Throughput</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-muted-foreground text-sm">Ready to post</p>
                <p className="text-foreground mt-1 text-2xl font-semibold">{summary.readyToPost}</p>
              </div>
              <CheckCircle2 className="text-muted-foreground size-4" />
            </div>
            <div className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-muted-foreground text-sm">Posted this week</p>
                <p className="text-foreground mt-1 text-2xl font-semibold">{summary.postedThisWeek}</p>
              </div>
              <ArrowRight className="text-muted-foreground size-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
