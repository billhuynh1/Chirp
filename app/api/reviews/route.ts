import { getCurrentWorkspace } from '@/lib/db/queries';
import { listBusinessReviews } from '@/lib/services/reviews';

export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const reviews = await listBusinessReviews(workspace.business.id, {
    locationId: url.searchParams.get('location')
      ? Number(url.searchParams.get('location'))
      : undefined,
    status: url.searchParams.get('status') || undefined,
    rating: url.searchParams.get('rating')
      ? Number(url.searchParams.get('rating'))
      : undefined,
    urgency: url.searchParams.get('urgency') || undefined,
    search: url.searchParams.get('search') || undefined
  });

  return Response.json({ reviews });
}

