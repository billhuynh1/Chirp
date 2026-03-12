import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { getFocusQueueReview, listBusinessReviews } from '@/lib/services/reviews';
import { Button } from '@/components/ui/button';
import { SplitPaneInbox, type MockReview } from './split-pane-inbox';
import { FocusQueuePanel } from './focus-queue-panel';

export const metadata = {
  title: 'Inbox - Chirp',
};

export default async function InboxPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const requestedView =
    typeof params.view === 'string' && params.view === 'list' ? 'list' : 'focus';
  const focusQueueEnabled = workspace.settings?.focusQueueEnabled ?? false;
  const activeView = focusQueueEnabled ? requestedView : 'list';

  // Fetch reviews directly from DB (which are mock data seeded by the app)
  const [dbReviews, focusQueueItem] = await Promise.all([
    listBusinessReviews(workspace.business.id),
    focusQueueEnabled ? getFocusQueueReview(workspace.business.id) : Promise.resolve(null)
  ]);

  const mappedReviews: MockReview[] = dbReviews.map((r) => {
    let status: 'needs_review'|'draft_ready'|'completed' = 'needs_review';
    if (r.workflowStatus === 'draft_ready' || r.workflowStatus === 'approved') status = 'draft_ready';
    if (
      r.workflowStatus === 'posted_manual' ||
      r.workflowStatus === 'completed' ||
      r.workflowStatus === 'closed_no_reply'
    ) {
      status = 'completed';
    }

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
        <div className="flex items-center gap-2">
          {focusQueueEnabled ? (
            <Button
              asChild
              size="sm"
              variant={activeView === 'focus' ? 'default' : 'outline'}
              className="rounded-full"
            >
              <Link href="/dashboard/inbox?view=focus">Focus Queue</Link>
            </Button>
          ) : null}
          <Button
            asChild
            size="sm"
            variant={activeView === 'list' ? 'default' : 'outline'}
            className="rounded-full"
          >
            <Link href="/dashboard/inbox?view=list">List View</Link>
          </Button>
        </div>
      </div>
      {!focusQueueEnabled && requestedView === 'focus' ? (
        <div className="rounded-[1rem] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Focus Queue is disabled for this workspace.
        </div>
      ) : null}
      <div className="flex-1 min-h-0">
        {activeView === 'focus' ? (
          <FocusQueuePanel item={focusQueueItem} />
        ) : (
          <SplitPaneInbox initialReviews={mappedReviews} />
        )}
      </div>
    </section>
  );
}
