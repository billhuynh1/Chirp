import { notFound, redirect } from 'next/navigation';
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
      : null;

  const isSkipReply = detail.latestAnalysis?.actionRecommendation === 'skip_reply';
  const hasDraft = Boolean(detail.latestDraft);
  const canGenerateDraft = Boolean(detail.latestAnalysis) && !isSkipReply;

  const issueTags = (detail.latestAnalysis?.issueTags ?? []).filter(
    (tag): tag is string => typeof tag === 'string'
  );

  return (
    <section className="space-y-6">
      <div className="p-0">
        <div className="flex flex-wrap items-center gap-2">
          <RatingBadge rating={detail.review.starRating} />
          <ReviewStatusBadge status={detail.review.workflowStatus} />
          <UrgencyBadge urgency={detail.latestAnalysis?.urgency ?? detail.review.priority} />
        </div>
        <h1 className="text-foreground mt-4 break-words text-3xl font-semibold">
          {detail.review.reviewerName || 'Reviewer'} at {detail.location.name}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl break-words text-sm leading-7">
          {detail.review.reviewText || 'This review has no written comment.'}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="overflow-hidden rounded-none border-0 bg-transparent py-0 shadow-none">
          <CardHeader className="px-0 pb-0">
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground min-w-0 space-y-4 px-0 text-sm">
            <div className="grid gap-4">
              <div className="min-w-0 p-0">
                <div className="text-muted-foreground">Review</div>
                <p className="text-foreground mt-2 break-words leading-6 whitespace-pre-wrap">
                  {detail.latestAnalysis?.summary || 'No analysis yet.'}
                </p>
              </div>
              <div className="min-w-0 p-0">
                <div className="text-muted-foreground">Recommendation</div>
                <p className="text-foreground mt-2 break-words leading-6 whitespace-pre-wrap">
                  {humanizeToken(detail.latestAnalysis?.actionRecommendation)}
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="min-w-0 p-0">
                <div className="text-muted-foreground">Sentiment</div>
                <p className="text-foreground mt-2 break-words font-medium">
                  {humanizeToken(detail.latestAnalysis?.sentiment)}
                </p>
              </div>
              <div className="min-w-0 p-0">
                <div className="text-muted-foreground">Risk</div>
                <p className="text-foreground mt-2 break-words font-medium">
                  {humanizeToken(detail.latestAnalysis?.riskLevel)}
                </p>
              </div>
              <div className="min-w-0 p-0">
                <div className="text-muted-foreground">Tags</div>
                {issueTags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {issueTags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted text-foreground inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-medium break-all"
                      >
                        {humanizeToken(tag, tag)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground mt-2 font-medium">None</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 bg-transparent py-0 shadow-none">
          <CardHeader className="px-0 pb-0">
            <CardTitle>Draft reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            {draftErrorMessage ? (
              <div
                role="alert"
                className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {draftErrorMessage}
              </div>
            ) : null}

            {!detail.latestAnalysis ? (
              <div className="rounded-[1.25rem] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Analysis is not available yet. Run analysis before generating a draft.
              </div>
            ) : null}

            {isSkipReply ? (
              <div className="space-y-3 rounded-[1.25rem] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <p>No public reply recommended for this review.</p>
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
              <div className="space-y-4">
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
              <>
                <form action={approveDraftAction} className="space-y-4">
                  <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <input type="hidden" name="generationReason" value="regenerate" />
                  <Textarea
                    name="approvedText"
                    defaultValue={detail.latestDraft?.draftText || ''}
                    className="rounded-[1.5rem]"
                  />
                  <FormSubmitButton className="rounded-full" pendingText="Approving...">
                    Approve draft
                  </FormSubmitButton>
                </form>

                <form action={regenerateDraftAction}>
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <input type="hidden" name="generationReason" value="regenerate" />
                  <FormSubmitButton
                    variant="secondary"
                    className="rounded-full"
                    pendingText="Generating..."
                  >
                    Regenerate
                  </FormSubmitButton>
                </form>

                <form action={rejectDraftAction} className="space-y-4">
                  <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <label className="text-foreground text-sm font-medium">
                    Reject reason
                    <Textarea name="reason" className="mt-2 rounded-[1.25rem]" />
                  </label>
                  <FormSubmitButton variant="secondary" className="rounded-full" pendingText="Rejecting...">
                    Reject draft
                  </FormSubmitButton>
                </form>

                <form action={markPostedAction} className="space-y-4">
                  <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
                  <input type="hidden" name="reviewId" value={detail.review.id} />
                  <label className="text-foreground text-sm font-medium">
                    Final posted text
                    <Textarea
                      name="postedText"
                      defaultValue={
                        detail.latestDraft?.draftText || detail.review.ownerReplyText || ''
                      }
                      className="mt-2 rounded-[1.25rem]"
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
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
