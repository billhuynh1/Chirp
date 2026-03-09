import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
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
import { ReviewStatusBadge, UrgencyBadge } from '@/components/reviews/review-badges';

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
      <div className="rounded-[2rem] border border-black/10 bg-white/85 p-6 dark:border-white/10 dark:bg-[#111b1d]/90">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={detail.review.starRating <= 2 ? 'danger' : detail.review.starRating === 3 ? 'warning' : 'success'}>
            {detail.review.starRating} stars
          </Badge>
          <ReviewStatusBadge status={detail.review.workflowStatus} />
          <UrgencyBadge urgency={detail.latestAnalysis?.urgency ?? detail.review.priority} />
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">
          {detail.review.reviewerName || 'Reviewer'} at {detail.location.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-300">
          {detail.review.reviewText || 'This review has no written comment.'}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="bg-white/85 dark:bg-[#111b1d]/90">
          <CardHeader>
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
                <div className="text-slate-500 dark:text-slate-400">Summary</div>
                <p className="mt-2">{detail.latestAnalysis?.summary || 'No analysis yet.'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
                <div className="text-slate-500 dark:text-slate-400">Recommendation</div>
                <p className="mt-2">{detail.latestAnalysis?.actionRecommendation || 'Pending'}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
                <div className="text-slate-500 dark:text-slate-400">Sentiment</div>
                <p className="mt-2 font-medium text-slate-950 dark:text-white">
                  {detail.latestAnalysis?.sentiment || 'Pending'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
                <div className="text-slate-500 dark:text-slate-400">Risk</div>
                <p className="mt-2 font-medium text-slate-950 dark:text-white">
                  {detail.latestAnalysis?.riskLevel || 'Pending'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
                <div className="text-slate-500 dark:text-slate-400">Tags</div>
                <p className="mt-2 font-medium text-slate-950 dark:text-white">
                  {detail.latestAnalysis?.issueTags.join(', ') || 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/85 dark:bg-[#111b1d]/90">
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
                  className="rounded-full bg-[#c85c36] text-white hover:bg-[#b64a25]"
                  disabled={!detail.latestDraft}
                >
                  Approve draft
                </Button>
                <button
                  type="submit"
                  formAction={regenerateDraftAction}
                  className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#f5ede2] dark:border-white/10 dark:text-slate-200 dark:hover:bg-[#173033]"
                >
                  Regenerate
                </button>
              </div>
            </form>

            <form action={rejectDraftAction} className="space-y-4 rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
              <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
              <input type="hidden" name="reviewId" value={detail.review.id} />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Reject reason
                <Textarea name="reason" className="mt-2 rounded-[1.25rem] bg-white dark:bg-[#111b1d]" />
              </label>
              <Button variant="outline" className="rounded-full" disabled={!detail.latestDraft}>
                Reject draft
              </Button>
            </form>

            <form action={markPostedAction} className="space-y-4 rounded-[1.5rem] border border-black/10 bg-[#fbf8f2] p-4 dark:border-white/10 dark:bg-[#182527]">
              <input type="hidden" name="draftId" value={detail.latestDraft?.id ?? ''} />
              <input type="hidden" name="reviewId" value={detail.review.id} />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Final posted text
                <Textarea
                  name="postedText"
                  defaultValue={detail.latestDraft?.draftText || detail.review.ownerReplyText || ''}
                  className="mt-2 rounded-[1.25rem] bg-white dark:bg-[#111b1d]"
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
