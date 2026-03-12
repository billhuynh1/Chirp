import { generateDraftForReview } from '@/lib/services/reviews';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  type DraftGenerationConflictResponse,
  isDraftGenerationConflictError
} from '@/lib/services/reviews/draft-generation-policy';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const draft = await generateDraftForReview(Number(reviewId), 'manual');
    return Response.json({ draft });
  } catch (error) {
    if (isDraftGenerationConflictError(error)) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message
          }
        } satisfies DraftGenerationConflictResponse,
        { status: error.status }
      );
    }

    throw error;
  }
}
