import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { Card, CardContent } from '@/components/ui/card';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';
import type { FocusQueueReview } from '@/lib/services/reviews';
import {
  acknowledgeNoReplyAction,
  approveDraftAction,
  escalateReviewAction,
  markPostedAction,
  rejectDraftAction
} from '@/app/dashboard/actions';
import { FocusQueueDraftEditor } from '@/app/dashboard/inbox/focus-queue-draft-editor';
import { FocusQueueDraftTriggerButton } from '@/app/dashboard/inbox/focus-queue-draft-trigger-button';

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
        <FormSubmitButton className="w-full justify-center rounded-full" pendingText="Acknowledging...">
          Acknowledge no-reply
        </FormSubmitButton>
      </form>
    );
  }

  if (item.nextAction === 'generate_draft') {
    return (
      <FocusQueueDraftTriggerButton
        reviewId={reviewId}
        mode="generate"
        label="Generate draft"
        pendingText="Generating..."
        className="w-full justify-center rounded-full"
      />
    );
  }

  if (item.nextAction === 'regenerate_draft') {
    return (
      <FocusQueueDraftTriggerButton
        reviewId={reviewId}
        draftId={draftId}
        currentDraftText={draftText}
        mode="regenerate"
        label="Regenerate draft"
        pendingText="Regenerating..."
        className="w-full justify-center rounded-full"
      />
    );
  }

  if (item.nextAction === 'approve_draft' && draftId) {
    return (
      <form action={approveDraftAction}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="draftId" value={draftId} />
        <input type="hidden" name="approvedText" value={draftText} />
        <FormSubmitButton className="w-full justify-center rounded-full" pendingText="Approving...">
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
        <FormSubmitButton className="w-full justify-center rounded-full" pendingText="Marking posted...">
          Mark posted
        </FormSubmitButton>
      </form>
    );
  }

  return null;
}

function buildSkipHref(reviewId: number, skippedReviewIds: number[]) {
  const nextSkipped = new Set<number>(skippedReviewIds);
  nextSkipped.add(reviewId);
  return `/dashboard/inbox?view=focus&skip=${[...nextSkipped].join(',')}`;
}

function ActionHub({
  item,
  skippedReviewIds
}: {
  item: FocusQueueReview;
  skippedReviewIds: number[];
}) {
  const review = item.review;
  const draft = review.latestDraft;
  const isSkipReply = review.latestAnalysis?.actionRecommendation === 'skip_reply';
  const skipHref = buildSkipHref(review.id, skippedReviewIds);

  return (
    <aside className="h-fit space-y-3 rounded-[1rem] border border-border/70 bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Actions</p>
      <div className="grid gap-2">
        <PrimaryAction item={item} />
        <Button asChild variant="ghost" className="w-full justify-center rounded-full">
          <Link href={skipHref}>Skip</Link>
        </Button>
        {draft && !isSkipReply ? (
          <FocusQueueDraftTriggerButton
            reviewId={review.id}
            draftId={draft.id}
            currentDraftText={draft.draftText}
            mode="regenerate"
            label="Regenerate"
            pendingText="Regenerating..."
            variant="outline"
            className="w-full justify-center rounded-full"
          />
        ) : null}
        {draft && !isSkipReply ? (
          <form action={rejectDraftAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="draftId" value={draft.id} />
            <input type="hidden" name="reason" value="Rejected from Focus Queue" />
            <FormSubmitButton
              variant="outline"
              className="w-full justify-center rounded-full"
              pendingText="Rejecting..."
            >
              Reject
            </FormSubmitButton>
          </form>
        ) : null}
        <form action={escalateReviewAction}>
          <input type="hidden" name="reviewId" value={review.id} />
          <FormSubmitButton
            variant="outline"
            className="w-full justify-center rounded-full"
            pendingText="Escalating..."
          >
            Escalate / Assign owner
          </FormSubmitButton>
        </form>
        <Button asChild variant="secondary" className="w-full justify-center rounded-full">
          <Link href={`/dashboard/reviews/${review.id}`}>Open full review</Link>
        </Button>
      </div>
    </aside>
  );
}

export function FocusQueuePanel({
  item,
  skippedReviewIds
}: {
  item: FocusQueueReview | null;
  skippedReviewIds: number[];
}) {
  if (!item) {
    const showReset = skippedReviewIds.length > 0;
    return (
      <Card className="h-full bg-card shadow-none">
        <CardContent className="space-y-4 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">You are all caught up</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No actionable reviews are currently waiting in Focus Queue.
          </p>
          {showReset ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/inbox?view=focus">Show skipped reviews</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const review = item.review;
  const analysis = review.latestAnalysis;
  const draft = review.latestDraft;
  const isSkipReply = analysis?.actionRecommendation === 'skip_reply';

  return (
    <Card className="h-full bg-card shadow-none">
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <RatingBadge rating={review.starRating} />
              <ReviewStatusBadge status={review.workflowStatus} />
              <UrgencyBadge urgency={analysis?.urgency ?? review.priority} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {review.reviewerName || 'Reviewer'} at {review.location.name}
              </h2>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
                {review.reviewText || 'Rating-only review'}
              </p>
            </div>

            <div className="rounded-[1rem] border border-border/70 bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Recommendation
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {humanizeToken(analysis?.actionRecommendation)}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Summary
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">
                {analysis?.summary || 'No analysis summary.'}
              </p>
            </div>

            {isSkipReply ? (
              <div className="rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                No public reply recommended for this review.
              </div>
            ) : null}

            {draft && !isSkipReply ? (
              <FocusQueueDraftEditor
                key={`${review.id}:${draft.id}`}
                reviewId={review.id}
                draftId={draft.id}
                draftText={draft.draftText}
              />
            ) : null}
          </div>
          <ActionHub item={item} skippedReviewIds={skippedReviewIds} />
        </div>
      </CardContent>
    </Card>
  );
}
