import { redirect } from 'next/navigation';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { listBusinessReviews } from '@/lib/services/reviews';
import { SplitPaneInbox, type MockReview } from './split-pane-inbox';

export const metadata = {
  title: 'Inbox - Chirp',
};

export default async function InboxPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  // Fetch reviews directly from DB (which are mock data seeded by the app)
  const dbReviews = await listBusinessReviews(workspace.business.id);

  const mappedReviews: MockReview[] = dbReviews.map((r) => {
    let status: 'needs_review'|'draft_ready'|'completed' = 'needs_review';
    if (r.workflowStatus === 'draft_ready' || r.workflowStatus === 'approved') status = 'draft_ready';
    if (r.workflowStatus === 'posted_manual' || r.workflowStatus === 'completed') status = 'completed';

    let urgency: 'urgent'|'high'|'medium'|'low' = 'low';
    const analysisUrgency = r.latestAnalysis?.urgency || r.priority;
    if (['critical', 'urgent', 'high', 'medium', 'low'].includes(analysisUrgency ?? '')) {
       urgency = (analysisUrgency === 'critical' ? 'urgent' : analysisUrgency) as any;
    }

    return {
      id: String(r.id),
      reviewerName: r.reviewerName || 'Anonymous',
      rating: r.starRating,
      text: r.reviewText || '',
      locationName: r.location.name,
      date: (r.reviewCreatedAt || new Date()).toString(),
      status,
      urgency,
      analysis: {
        summary: r.latestAnalysis?.summary || 'No analysis available.',
        recommendation: r.latestAnalysis?.actionRecommendation || 'N/A',
        sentiment: r.latestAnalysis?.sentiment || 'Neutral',
        riskLevel: r.latestAnalysis?.riskLevel || 'Low',
        tags: (r.latestAnalysis?.issueTags ?? []).map(String)
      },
      draftText: r.latestDraft?.draftText || '',
      finalPostedText: r.ownerReplyText || undefined
    };
  });

  return (
    <section className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-10rem)] gap-2">
      <div className="flex items-center justify-between shrink-0 mb-2">
         <h1 className="text-2xl font-semibold tracking-tight">Reviews Inbox</h1>
      </div>
      <div className="flex-1 min-h-0">
        <SplitPaneInbox initialReviews={mappedReviews} />
      </div>
    </section>
  );
}
