import { generateDraftForReview } from '@/lib/services/reviews';
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

  const draft = await generateDraftForReview(Number(reviewId), 'manual');
  return Response.json({ draft });
}

