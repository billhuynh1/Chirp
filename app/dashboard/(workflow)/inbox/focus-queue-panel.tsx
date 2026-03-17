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
import { FocusQueueDraftEditor } from './focus-queue-draft-editor';
import { FocusQueueDraftTriggerButton } from './focus-queue-draft-trigger-button';
import { cn } from '@/lib/utils';

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
        riskLevel={item.review.latestAnalysis?.riskLevel}
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
        riskLevel={item.review.latestAnalysis?.riskLevel}
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

function getRecommendationAccentClasses(recommendation?: string | null) {
  if (
    recommendation === 'owner_review_required' ||
    recommendation === 'owner_review_and_offline_resolution'
  ) {
    return {
      panel: 'border-danger/25 bg-danger/8',
      text: 'text-danger'
    };
  }

  if (recommendation === 'skip_reply') {
    return {
      panel: 'border-warning/25 bg-warning/10',
      text: 'text-warning'
    };
  }

  if (recommendation === 'publish_safe_reply') {
    return {
      panel: 'border-success/25 bg-success/10',
      text: 'text-success'
    };
  }

  return {
    panel: 'border-border/70 bg-muted/30',
    text: 'text-foreground'
  };
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
  const canSkip = item.nextAction !== 'mark_posted';

  return (
    <aside className="h-fit space-y-3 rounded-[1rem] border border-border/70 bg-muted/30 p-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Actions</p>
        <p className="text-sm font-medium text-foreground">
          {humanizeToken(item.nextAction, 'Review next step')}
        </p>
      </div>
      <div className="grid gap-2">
        <PrimaryAction item={item} />
        {canSkip ? (
          <Button
            asChild
            variant="ghost"
            className="w-full justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <Link href={skipHref}>Skip</Link>
          </Button>
        ) : null}
        {draft && !isSkipReply ? (
          <FocusQueueDraftTriggerButton
            reviewId={review.id}
            draftId={draft.id}
            currentDraftText={draft.draftText}
            mode="regenerate"
            label="Regenerate"
            pendingText="Regenerating..."
            riskLevel={review.latestAnalysis?.riskLevel}
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
              variant="destructive"
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
            variant="secondary"
            className="w-full justify-center rounded-full"
            pendingText="Escalating..."
          >
            Escalate / Assign owner
          </FormSubmitButton>
        </form>
        <Button
          asChild
          variant="outline"
          className="w-full justify-center rounded-full border-border/80 bg-background/80"
        >
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
  const recommendationAccent = getRecommendationAccentClasses(
    analysis?.actionRecommendation
  );

  return (
    <Card className="h-full bg-card shadow-none">
      <CardContent className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
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

            <div className={cn('rounded-[1rem] border p-4', recommendationAccent.panel)}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Recommendation
              </p>
              <p className={cn('mt-2 text-sm font-medium', recommendationAccent.text)}>
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
              <div className="rounded-[1rem] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
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
