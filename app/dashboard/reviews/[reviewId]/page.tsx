import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { getReviewDetail } from '@/lib/services/reviews';
import {
  acknowledgeNoReplyAction,
  approveDraftAction,
  escalateReviewAction,
  markPostedAction,
  regenerateDraftAction,
  rejectDraftAction
} from '../../actions';
import { RatingBadge, ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

function humanizeToken(value?: string | null, fallback = 'Pending') {
  if (!value) {
    return fallback;
  }

  const normalized = value.replaceAll('_', ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDateTime(value?: Date | null) {
  if (!value) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

const draftTextareaClassName =
  'rounded-[0.875rem] border-border bg-white dark:border-input dark:bg-input/30';

export default async function ReviewDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  const { reviewId } = await params;
  const query = await searchParams;
  const detail = await getReviewDetail(workspace.business.id, Number(reviewId));
  if (!detail) {
    notFound();
  }
  const draftError =
    typeof query.draftError === 'string' ? query.draftError : null;
  const draftErrorMessage =
    draftError === 'skip_reply_locked'
      ? 'Draft generation is blocked because this review is marked as no-reply.'
      : draftError === 'draft_generation_rate_limited'
        ? 'You are generating drafts too quickly. Please wait a moment and try again.'
      : null;

  const isSkipReply = detail.latestAnalysis?.actionRecommendation === 'skip_reply';
  const hasDraft = Boolean(detail.latestDraft);
  const canGenerateDraft = Boolean(detail.latestAnalysis) && !isSkipReply;

  const issueTags = (detail.latestAnalysis?.issueTags ?? []).filter(
    (tag): tag is string => typeof tag === 'string'
  );
  const draftStateLabel = !detail.latestAnalysis
    ? 'Waiting on analysis'
    : isSkipReply
      ? 'No reply recommended'
      : hasDraft
        ? 'Draft ready'
        : 'Ready to generate';

  return (
    <section className="pb-8">
      <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Review Detail
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Review response workflow
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Inspect the latest analysis, refine the draft reply, and finish the
              manual posting flow from one place.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/dashboard/inbox">Back to inbox</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className="bg-muted/70 py-0">
            <CardContent className="space-y-6 p-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <RatingBadge rating={detail.review.starRating} />
                <ReviewStatusBadge status={detail.review.workflowStatus} />
                <UrgencyBadge urgency={detail.latestAnalysis?.urgency ?? detail.review.priority} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Overview
                </p>
                <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {detail.review.reviewerName || 'Reviewer'} at {detail.location.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review text and workflow details for this customer interaction.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Location
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {detail.location.name}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Received
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatDateTime(detail.review.reviewCreatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Last Updated
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatDateTime(detail.review.reviewUpdatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Reply Status
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {detail.review.hasOwnerReply ? 'Owner reply exists' : 'No owner reply yet'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Review
              </p>
              <p className="text-sm leading-7 text-foreground/95">
                {detail.review.reviewText || 'This review has no written comment.'}
              </p>
            </div>
          </CardContent>
          </Card>

          <Card className="bg-muted/70 py-0">
            <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Analysis
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Latest structured guidance for how this review should be handled.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Summary
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {detail.latestAnalysis?.summary || 'No analysis yet.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {humanizeToken(detail.latestAnalysis?.actionRecommendation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Sentiment
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {humanizeToken(detail.latestAnalysis?.sentiment)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Risk
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {humanizeToken(detail.latestAnalysis?.riskLevel)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Issue tags
                  </p>
                  {issueTags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {issueTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex max-w-full items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium break-all text-foreground"
                        >
                          {humanizeToken(tag, tag)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">None</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          </Card>
      </div>

      <Card className="bg-muted/70 py-0">
        <CardHeader className="px-5 pt-5 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Draft reply</CardTitle>
            <div className="inline-flex items-center rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-foreground">
              {draftStateLabel}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-0">
            {draftErrorMessage ? (
              <div
                role="alert"
                className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {draftErrorMessage}
              </div>
            ) : null}

            {!detail.latestAnalysis ? (
              <div className="rounded-[1.25rem] border border-border/50 px-5 py-5 text-sm text-muted-foreground">
                Analysis is not available yet. Run analysis before generating a draft.
              </div>
            ) : null}

            {isSkipReply ? (
              <div className="space-y-4 rounded-[1.25rem] border border-border/50 p-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  No public reply recommended for this review.
                </p>
                <form action={acknowledgeNoReplyAction}>
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <FormSubmitButton
                    variant="secondary"
                    className="rounded-full"
                    pendingText="Acknowledging..."
                  >
                    Acknowledge no-reply
                  </FormSubmitButton>
                </form>
              </div>
            ) : null}

            {!hasDraft && canGenerateDraft ? (
              <div className="flex flex-col gap-4 rounded-[1.25rem] border border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No active draft yet</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Generate a draft reply or escalate the review for manual handling.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <form action={regenerateDraftAction}>
                    <input type="hidden" name="reviewId" value={detail.review.id} />
                    <input type="hidden" name="generationReason" value="manual" />
                    <FormSubmitButton className="rounded-full" pendingText="Generating...">
                      Generate draft
                    </FormSubmitButton>
                  </form>
                  <form action={escalateReviewAction}>
                    <input type="hidden" name="reviewId" value={detail.review.id} />
                    <FormSubmitButton
                      pendingText="Escalating..."
                      variant="outline"
                      className="rounded-full"
                    >
                      Escalate / Assign owner
                    </FormSubmitButton>
                  </form>
                </div>
              </div>
            ) : null}

            {hasDraft && !isSkipReply ? (
              <div className="space-y-4">
                <form
                  action={approveDraftAction}
                  className="space-y-4"
                >
                  <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <Textarea
                    name="approvedText"
                    defaultValue={detail.latestDraft?.draftText || ''}
                    className={`min-h-40 ${draftTextareaClassName}`}
                  />
                  <div className="flex flex-wrap gap-3">
                    <FormSubmitButton className="rounded-full" pendingText="Approving...">
                      Approve draft
                    </FormSubmitButton>
                  </div>
                </form>

                <form action={regenerateDraftAction}>
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <input type="hidden" name="generationReason" value="regenerate" />
                  <FormSubmitButton
                    variant="secondary"
                    className="rounded-full"
                    pendingText="Regenerating..."
                    successToastMessage="Draft regenerated"
                  >
                    Regenerate
                  </FormSubmitButton>
                </form>

                <div className="grid gap-4 lg:grid-cols-2">
                  <form
                    action={rejectDraftAction}
                    className="space-y-4"
                  >
                    <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
                    <input type="hidden" name="reviewId" value={detail.review.id} />
                    <label className="block space-y-2 text-sm font-medium text-foreground">
                      Reject reason
                      <Textarea
                        name="reason"
                        className={`min-h-28 ${draftTextareaClassName}`}
                      />
                    </label>
                    <FormSubmitButton
                      variant="secondary"
                      className="rounded-full"
                      pendingText="Rejecting..."
                    >
                      Reject draft
                    </FormSubmitButton>
                  </form>

                  <form
                    action={markPostedAction}
                    className="space-y-4"
                  >
                    <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
                    <input type="hidden" name="reviewId" value={detail.review.id} />
                    <label className="block space-y-2 text-sm font-medium text-foreground">
                      Final posted text
                      <Textarea
                        name="postedText"
                        defaultValue={
                          detail.latestDraft?.draftText || detail.review.ownerReplyText || ''
                        }
                        className={`min-h-28 ${draftTextareaClassName}`}
                      />
                    </label>
                    <FormSubmitButton
                      variant="secondary"
                      className="rounded-full"
                      pendingText="Marking posted..."
                    >
                      Mark reply as posted
                    </FormSubmitButton>
                  </form>
                </div>
              </div>
            ) : null}
        </CardContent>
      </Card>
      </div>
    </section>
  );
}
