import { getCurrentWorkspace } from '@/lib/db/queries';
import { escalateReview } from '@/lib/services/reviews';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const review = await escalateReview({
    businessId: workspace.business.id,
    reviewId: Number(reviewId)
  });

  return Response.json({ review });
}
