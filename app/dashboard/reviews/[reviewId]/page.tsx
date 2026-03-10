import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { getReviewDetail } from '@/lib/services/reviews';
import {
  approveDraftAction,
  markPostedAction,
  regenerateDraftAction,
  rejectDraftAction
} from '../../actions';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

export default async function ReviewDetailPage({
  params
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  const { reviewId } = await params;
  const detail = await getReviewDetail(workspace.business.id, Number(reviewId));
  if (!detail) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <RatingBadge rating={detail.review.starRating} />
          <ReviewStatusBadge status={detail.review.workflowStatus} />
          <UrgencyBadge urgency={detail.latestAnalysis?.urgency ?? detail.review.priority} />
        </div>
        <h1 className="text-foreground mt-4 text-3xl font-semibold">
          {detail.review.reviewerName || 'Reviewer'} at {detail.location.name}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-7">
          {detail.review.reviewText || 'This review has no written comment.'}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
                <div className="text-muted-foreground">Summary</div>
                <p className="mt-2">{detail.latestAnalysis?.summary || 'No analysis yet.'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
                <div className="text-muted-foreground">Recommendation</div>
                <p className="mt-2">{detail.latestAnalysis?.actionRecommendation || 'Pending'}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
                <div className="text-muted-foreground">Sentiment</div>
                <p className="text-foreground mt-2 font-medium">
                  {detail.latestAnalysis?.sentiment || 'Pending'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
                <div className="text-muted-foreground">Risk</div>
                <p className="text-foreground mt-2 font-medium">
                  {detail.latestAnalysis?.riskLevel || 'Pending'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
                <div className="text-muted-foreground">Tags</div>
                <p className="text-foreground mt-2 font-medium">
                  {detail.latestAnalysis?.issueTags.join(', ') || 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Draft reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={approveDraftAction} className="space-y-4">
              <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
              <input type="hidden" name="reviewId" value={detail.review.id} />
              <Textarea
                name="approvedText"
                defaultValue={detail.latestDraft?.draftText || ''}
                className="rounded-[1.5rem]"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-full"
                  disabled={!detail.latestDraft}
                >
                  Approve draft
                </Button>
                <button
                  type="submit"
                  formAction={regenerateDraftAction}
                  className="text-foreground inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground"
                >
                  Regenerate
                </button>
              </div>
            </form>

            <form action={rejectDraftAction} className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
              <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
              <input type="hidden" name="reviewId" value={detail.review.id} />
              <label className="text-foreground text-sm font-medium">
                Reject reason
                <Textarea name="reason" className="mt-2 rounded-[1.25rem]" />
              </label>
              <Button variant="outline" className="rounded-full" disabled={!detail.latestDraft}>
                Reject draft
              </Button>
            </form>

            <form action={markPostedAction} className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/60 p-4">
              <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
              <input type="hidden" name="reviewId" value={detail.review.id} />
              <label className="text-foreground text-sm font-medium">
                Final posted text
                <Textarea
                  name="postedText"
                  defaultValue={detail.latestDraft?.draftText || detail.review.ownerReplyText || ''}
                  className="mt-2 rounded-[1.25rem]"
                />
              </label>
              <Button variant="outline" className="rounded-full">
                Mark reply as posted
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
