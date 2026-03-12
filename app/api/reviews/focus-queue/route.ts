import { getCurrentWorkspace } from '@/lib/db/queries';
import { getFocusQueueReview } from '@/lib/services/reviews';

export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const item = await getFocusQueueReview(workspace.business.id);
  return Response.json(
    item
      ? {
          review: item.review,
          nextAction: item.nextAction,
          reason: item.reason
        }
      : {
          review: null,
          nextAction: null,
          reason: null
        }
  );
}
