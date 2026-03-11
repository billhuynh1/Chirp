import { getCurrentWorkspace } from '@/lib/db/queries';
import { listBusinessReviews } from '@/lib/services/reviews';
import { parseInboxFilterState } from '@/lib/services/reviews/inbox-filters';

export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const state = parseInboxFilterState(Object.fromEntries(url.searchParams.entries()));

  const reviews = await listBusinessReviews(workspace.business.id, {
    locationId: state.locationId,
    status: state.status,
    statusGroup: state.statusGroup,
    rating: state.rating,
    urgency: state.urgency,
    search: state.search,
    sort: state.sort
  });

  return Response.json({ reviews });
}
