import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  getDashboardSummary,
  getReviewAnalytics,
  listBusinessReviews
} from '@/lib/services/reviews';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  if (!workspace.business.onboardingCompletedAt) {
    redirect('/dashboard/setup');
  }

  const [summary, analytics, reviews] = await Promise.all([
    getDashboardSummary(workspace.business.id),
    getReviewAnalytics(workspace.business.id),
    listBusinessReviews(workspace.business.id)
  ]);

  const urgentReviews = reviews.filter(
    (review) =>
      review.latestAnalysis?.urgency === 'high' ||
      review.latestAnalysis?.urgency === 'critical'
  );
  const compactStatusSet = new Set([
    'approved',
    'draft_ready',
    'posted_manual',
    'rejected',
    'closed_no_reply'
  ]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-card p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium">
            Overview
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Review operations for {workspace.business.name}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-7">
            Track new reviews, surface urgent negatives, and keep approved
            replies moving through a manual-post workflow.
          </p>
        </div>
        {workspace.connectedAccount ? (
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard/setup">Manage Google Sync</Link>
          </Button>
        ) : (
          <Button asChild className="rounded-full">
            <Link href="/dashboard/setup">Finish setup</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="bg-card shadow-sm">
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

        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle>MVP analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card shadow-sm">
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

        <Card className="bg-card shadow-sm">
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
