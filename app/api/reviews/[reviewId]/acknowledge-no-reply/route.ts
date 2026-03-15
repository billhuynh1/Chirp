import { acknowledgeNoReply } from '@/lib/services/reviews';
import {
  mutationErrorResponseWithTelemetry,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    targetEntityType: 'review'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;
  const { reviewId: reviewIdRaw } = await params;
  const reviewId = await parseRouteId(reviewIdRaw, 'reviewId', {
    request,
    workspace,
    targetEntityType: 'review'
  });
  if (!reviewId.ok) {
    return reviewId.response;
  }

  try {
    const review = await acknowledgeNoReply({
      businessId: workspace.business.id,
      reviewId: reviewId.value
    });

    return Response.json({ review });
  } catch (error) {
    if (error instanceof Error && error.message === 'Review not found') {
      return mutationErrorResponseWithTelemetry(
        404,
        'not_found',
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'review',
          targetEntityId: reviewId.value
        }
      );
    }
    if (
      error instanceof Error &&
      error.message === 'Review is not eligible for no-reply acknowledgement'
    ) {
      return mutationErrorResponseWithTelemetry(
        400,
        'invalid_state',
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'review',
          targetEntityId: reviewId.value
        }
      );
    }
    throw error;
  }
}
