import { getCurrentWorkspace } from '@/lib/db/queries';
import { getReviewDetail } from '@/lib/services/reviews';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const detail = await getReviewDetail(workspace.business.id, Number(reviewId));
  if (!detail) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(detail);
}

