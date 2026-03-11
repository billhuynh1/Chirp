import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { listBusinessLocations, listBusinessReviews } from '@/lib/services/reviews';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';
import { InboxFilters } from './inbox-filters';
import { parseInboxFilterState, toUrlSearchParams } from '@/lib/services/reviews/inbox-filters';

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
  const filterState = parseInboxFilterState(params);
  const currentQuery = toUrlSearchParams(params);
  const [reviews, locationOptions] = await Promise.all([
    listBusinessReviews(workspace.business.id, {
      status: filterState.status,
      statusGroup: filterState.statusGroup,
      urgency: filterState.urgency,
      rating: filterState.rating,
      locationId: filterState.locationId,
      search: filterState.search,
      sort: filterState.sort
    }),
    listBusinessLocations(workspace.business.id)
  ]);

  return (
    <section className="space-y-8">
      <InboxFilters currentQuery={currentQuery} state={filterState} locations={locationOptions} />

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
            reviews.map((review) => {
              const customerMessage = (review.reviewText ?? '').trim() || 'Rating-only review';
              const summary =
                review.latestAnalysis?.issueTags?.length
                  ? review.latestAnalysis.issueTags
                      .filter((tag): tag is string => typeof tag === 'string')
                      .map((tag) => tag.replace(/_/g, ' '))
                      .join(', ')
                  : 'No summary yet';

              return (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-muted/30 p-5 transition hover:-translate-y-px hover:bg-muted/45 lg:grid-cols-[1.35fr_1fr_0.8fr]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingBadge rating={review.starRating} />
                      {compactStatusSet.has(review.workflowStatus) ? (
                        <ReviewStatusBadge status={review.workflowStatus} />
                      ) : null}
                      <UrgencyBadge urgency={review.latestAnalysis?.urgency ?? review.priority} />
                    </div>
                    <p className="text-foreground/90 mt-2 line-clamp-2 text-sm leading-6">
                      {customerMessage}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs uppercase tracking-[0.18em]">
                      {review.reviewerName || 'Anonymous'} • {review.location.name}
                    </p>
                  </div>

                  <div className="text-muted-foreground text-sm">
                    <div className="text-foreground font-medium">Summary</div>
                    <p className="mt-2 line-clamp-2">{summary}</p>
                  </div>

                  <div className="text-muted-foreground text-sm">
                    <div className="text-foreground font-medium">Draft</div>
                    <p className="mt-2 line-clamp-2">
                      {review.latestDraft?.draftText || 'No draft yet'}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}
