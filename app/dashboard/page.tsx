import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  getDashboardSummary,
  getReviewAnalytics,
  listBusinessReviews
} from '@/lib/services/reviews';
import { syncNowAction } from './actions';
import { ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-black/10 bg-[linear-gradient(135deg,#1f2a2a_0%,#314245_100%)] p-6 text-white shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,#123325_0%,#1e4734_100%)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#efb49f]">
            Overview
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Review operations for {workspace.business.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Track new reviews, surface urgent negatives, and keep approved
            replies moving through a manual-post workflow.
          </p>
        </div>
        {workspace.connectedAccount ? (
          <form action={syncNowAction}>
            <input
              type="hidden"
              name="connectedAccountId"
              value={workspace.connectedAccount.id}
            />
            <Button className="rounded-full bg-[#c85c36] text-white hover:bg-[#b64a25]">
              <RefreshCcw className="size-4" />
              Sync now
            </Button>
          </form>
        ) : (
          <Button asChild className="rounded-full bg-[#c85c36] text-white hover:bg-[#b64a25]">
            <Link href="/dashboard/setup">Finish setup</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'New reviews', value: summary.newReviews, icon: Inbox },
          { label: 'Urgent reviews', value: summary.urgentReviews, icon: AlertTriangle },
          { label: 'Ready to post', value: summary.readyToPost, icon: CheckCircle2 },
          { label: 'Posted this week', value: summary.postedThisWeek, icon: ArrowRight }
        ].map((item) => (
          <Card
            key={item.label}
            className="bg-white/85 dark:bg-[#111b1d]/90"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {item.label}
                </CardTitle>
                <item.icon className="size-4 text-[#c85c36]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-950 dark:text-white">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="bg-white/85 dark:bg-[#111b1d]/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Urgent reviews</CardTitle>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/dashboard/inbox?urgency=high">Open inbox</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {urgentReviews.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[#fbf8f2] px-5 py-8 text-sm text-slate-600 dark:border-white/10 dark:bg-[#182527] dark:text-slate-300">
                No urgent reviews right now.
              </div>
            ) : (
              urgentReviews.slice(0, 5).map((review) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="block rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 transition hover:border-[#c85c36]/40 hover:bg-white dark:border-white/10 dark:bg-[#182527] dark:hover:border-[#77d970]/35 dark:hover:bg-[#152123]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="danger">{review.starRating} stars</Badge>
                    <UrgencyBadge urgency={review.latestAnalysis?.urgency} />
                    <ReviewStatusBadge status={review.workflowStatus} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {review.reviewText || 'Rating-only review'}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {review.location.name}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/85 dark:bg-[#111b1d]/90">
          <CardHeader>
            <CardTitle>MVP analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
              <p className="text-slate-500 dark:text-slate-400">Imported reviews</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {analytics.importedReviews}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
              <p className="text-slate-500 dark:text-slate-400">Generated drafts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {analytics.generatedDrafts}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
              <p className="text-slate-500 dark:text-slate-400">Posted manually</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {analytics.postedReviews}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
