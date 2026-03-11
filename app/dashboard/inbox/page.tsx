import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { listBusinessReviews } from '@/lib/services/reviews';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

export default async function InboxPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const compactStatusSet = new Set(['approved', 'draft_ready', 'posted_manual', 'rejected']);

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
    <section className="space-y-8">
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
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
            <Button className="rounded-full">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reviews</CardTitle>
          <p className="text-muted-foreground text-sm">{reviews.length} total</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-muted-foreground rounded-[1.5rem] bg-muted/30 px-5 py-10 text-sm">
              No reviews match the current filters.
            </div>
          ) : (
            reviews.map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.id}`}
                className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-muted/30 p-5 transition hover:-translate-y-px hover:bg-muted/45 lg:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingBadge rating={review.starRating} />
                    {compactStatusSet.has(review.workflowStatus) ? (
                      <ReviewStatusBadge status={review.workflowStatus} />
                    ) : null}
                    <UrgencyBadge urgency={review.latestAnalysis?.urgency ?? review.priority} />
                  </div>
                  <p className="text-foreground/90 mt-3 line-clamp-3 text-sm leading-6">
                    {review.reviewText || 'Rating-only review'}
                  </p>
                  <p className="text-muted-foreground mt-3 text-xs uppercase tracking-[0.18em]">
                    {review.reviewerName || 'Anonymous'} • {review.location.name}
                  </p>
                </div>
                <div className="text-muted-foreground text-sm">
                  <div className="text-foreground font-medium">Summary</div>
                  <p className="mt-2 line-clamp-3">{review.latestAnalysis?.summary || 'Pending analysis'}</p>
                </div>
                <div className="text-muted-foreground text-sm">
                  <div className="text-foreground font-medium">Tags</div>
                  <p className="mt-2 line-clamp-3">
                    {review.latestAnalysis?.issueTags?.length
                      ? review.latestAnalysis.issueTags
                          .map((tag) => tag.replace(/_/g, ' '))
                          .join(', ')
                      : 'No tags yet'}
                  </p>
                </div>
                <div className="text-muted-foreground text-sm">
                  <div className="text-foreground font-medium">Draft</div>
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
