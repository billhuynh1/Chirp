import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { listBusinessReviews } from '@/lib/services/reviews';
import { ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

export default async function InboxPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const reviews = await listBusinessReviews(workspace.business.id, {
    status: typeof params.status === 'string' ? params.status : undefined,
    urgency: typeof params.urgency === 'string' ? params.urgency : undefined,
    rating: typeof params.rating === 'string' ? Number(params.rating) : undefined,
    locationId: typeof params.location === 'string' ? Number(params.location) : undefined,
    search: typeof params.search === 'string' ? params.search : undefined
  });

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-black/10 bg-white/85 p-6 dark:border-white/10 dark:bg-[#111b1d]/90">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b4629]">
          Review inbox
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
          Triage incoming Google reviews
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Filter by urgency, rating, and workflow status to get from imported
          review to approved reply quickly.
        </p>
      </div>

      <Card className="border-black/10 bg-white/85 dark:border-white/10 dark:bg-[#111b1d]/90">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                name="search"
                defaultValue={typeof params.search === 'string' ? params.search : ''}
                placeholder="Search review text or reviewer"
                className="rounded-2xl pl-9"
              />
            </div>
            <Input
              name="status"
              defaultValue={typeof params.status === 'string' ? params.status : ''}
              placeholder="status"
              className="rounded-2xl"
            />
            <Input
              name="urgency"
              defaultValue={typeof params.urgency === 'string' ? params.urgency : ''}
              placeholder="urgency"
              className="rounded-2xl"
            />
            <Input
              name="rating"
              defaultValue={typeof params.rating === 'string' ? params.rating : ''}
              placeholder="rating"
              className="rounded-2xl"
            />
            <Button className="rounded-full bg-[#c85c36] text-white hover:bg-[#b64a25]">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/85 dark:border-white/10 dark:bg-[#111b1d]/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reviews</CardTitle>
          <Badge variant="neutral">{reviews.length} total</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[#fbf8f2] px-5 py-10 text-sm text-slate-600 dark:border-white/10 dark:bg-[#182527] dark:text-slate-300">
              No reviews match the current filters.
            </div>
          ) : (
            reviews.map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.id}`}
                className="grid gap-4 rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-5 transition hover:border-[#c85c36]/40 hover:bg-white dark:border-white/10 dark:bg-[#182527] dark:hover:border-[#77d970]/35 dark:hover:bg-[#152123] lg:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={review.starRating <= 2 ? 'danger' : review.starRating === 3 ? 'warning' : 'success'}>
                      {review.starRating} stars
                    </Badge>
                    <ReviewStatusBadge status={review.workflowStatus} />
                    <UrgencyBadge urgency={review.latestAnalysis?.urgency ?? review.priority} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {review.reviewText || 'Rating-only review'}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {review.reviewerName || 'Anonymous'} • {review.location.name}
                  </p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <div className="font-medium text-slate-950 dark:text-white">Summary</div>
                  <p className="mt-2 line-clamp-3">{review.latestAnalysis?.summary || 'Pending analysis'}</p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <div className="font-medium text-slate-950 dark:text-white">Tags</div>
                  <p className="mt-2 line-clamp-3">
                    {review.latestAnalysis?.issueTags?.join(', ') || 'No tags yet'}
                  </p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <div className="font-medium text-slate-950 dark:text-white">Draft</div>
                  <p className="mt-2 line-clamp-3">
                    {review.latestDraft?.draftText || 'No draft yet'}
                  </p>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
