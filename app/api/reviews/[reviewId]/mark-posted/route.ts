import { getCurrentWorkspace } from '@/lib/db/queries';
import { markReviewPosted } from '@/lib/services/reviews';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const review = await markReviewPosted({
    reviewId: Number(reviewId),
    draftId: body.draftId ? Number(body.draftId) : null,
    postedText: body.postedText ?? null
  });

  return Response.json({ review });
}

