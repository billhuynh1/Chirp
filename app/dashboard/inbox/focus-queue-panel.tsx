import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';
import type { FocusQueueReview } from '@/lib/services/reviews';
import {
  acknowledgeNoReplyAction,
  approveDraftAction,
  escalateReviewAction,
  markPostedAction,
  regenerateDraftAction,
  rejectDraftAction
} from '@/app/dashboard/actions';

function humanizeToken(value?: string | null, fallback = 'Pending') {
  if (!value) {
    return fallback;
  }

  const normalized = value.replaceAll('_', ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function PrimaryAction({ item }: { item: FocusQueueReview }) {
  const reviewId = item.review.id;
  const draftId = item.review.latestDraft?.id ?? null;
  const draftText = item.review.latestDraft?.draftText ?? '';

  if (item.nextAction === 'acknowledge_no_reply') {
    return (
      <form action={acknowledgeNoReplyAction}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <FormSubmitButton className="rounded-full" pendingText="Acknowledging...">
          Acknowledge no-reply
        </FormSubmitButton>
      </form>
    );
  }

  if (item.nextAction === 'generate_draft') {
    return (
      <form action={regenerateDraftAction}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="generationReason" value="manual" />
        <FormSubmitButton className="rounded-full" pendingText="Generating...">
          Generate draft
        </FormSubmitButton>
      </form>
    );
  }

  if (item.nextAction === 'regenerate_draft') {
    return (
      <form action={regenerateDraftAction}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="generationReason" value="regenerate" />
        <FormSubmitButton className="rounded-full" pendingText="Generating...">
          Regenerate draft
        </FormSubmitButton>
      </form>
    );
  }

  if (item.nextAction === 'approve_draft' && draftId) {
    return (
      <form action={approveDraftAction}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="draftId" value={draftId} />
        <input type="hidden" name="approvedText" value={draftText} />
        <FormSubmitButton className="rounded-full" pendingText="Approving...">
          Approve draft
        </FormSubmitButton>
      </form>
    );
  }

  if (item.nextAction === 'mark_posted') {
    return (
      <form action={markPostedAction}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="draftId" value={draftId ?? ''} />
        <input type="hidden" name="postedText" value={draftText} />
        <FormSubmitButton className="rounded-full" pendingText="Marking posted...">
          Mark posted
        </FormSubmitButton>
      </form>
    );
  }

  return null;
}

export function FocusQueuePanel({ item }: { item: FocusQueueReview | null }) {
  if (!item) {
    return (
      <Card className="bg-card shadow-none">
        <CardContent className="px-6 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">You are all caught up</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No actionable reviews are currently waiting in Focus Queue.
          </p>
        </CardContent>
      </Card>
    );
  }

  const review = item.review;
  const analysis = review.latestAnalysis;
  const draft = review.latestDraft;
  const isSkipReply = analysis?.actionRecommendation === 'skip_reply';

  return (
    <Card className="bg-card shadow-none">
      <CardHeader className="space-y-3">
        <p className="text-sm text-muted-foreground">{item.reason}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <RatingBadge rating={review.starRating} />
          <ReviewStatusBadge status={review.workflowStatus} />
          <UrgencyBadge urgency={analysis?.urgency ?? review.priority} />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {review.reviewerName || 'Reviewer'} at {review.location.name}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {review.reviewText || 'Rating-only review'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1rem] border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recommendation</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {humanizeToken(analysis?.actionRecommendation)}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Summary</p>
            <p className="mt-2 text-sm text-foreground">{analysis?.summary || 'No analysis summary.'}</p>
          </div>
        </div>

        {isSkipReply ? (
          <div className="rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            No public reply recommended for this review.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <PrimaryAction item={item} />
          <form action={escalateReviewAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <FormSubmitButton
              variant="outline"
              className="rounded-full"
              pendingText="Escalating..."
            >
              Escalate / Assign owner
            </FormSubmitButton>
          </form>
          <Button asChild variant="secondary" className="rounded-full">
            <Link href={`/dashboard/reviews/${review.id}`}>Open full review</Link>
          </Button>
        </div>

        {draft && !isSkipReply ? (
          <div className="space-y-3 rounded-[1rem] border border-border/70 bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">Draft controls</p>
            <div className="flex flex-wrap gap-3">
              <form action={regenerateDraftAction}>
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="generationReason" value="regenerate" />
                <FormSubmitButton
                  variant="outline"
                  className="rounded-full"
                  pendingText="Generating..."
                >
                  Regenerate
                </FormSubmitButton>
              </form>
              <form action={rejectDraftAction}>
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="draftId" value={draft.id} />
                <input type="hidden" name="reason" value="Rejected from Focus Queue" />
                <FormSubmitButton
                  variant="outline"
                  className="rounded-full"
                  pendingText="Rejecting..."
                >
                  Reject
                </FormSubmitButton>
              </form>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
