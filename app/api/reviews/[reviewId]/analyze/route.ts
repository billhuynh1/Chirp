import { analyzeStoredReview } from '@/lib/services/reviews';
import { getCurrentWorkspace } from '@/lib/db/queries';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const analysis = await analyzeStoredReview(Number(reviewId));
  return Response.json({ analysis });
}

