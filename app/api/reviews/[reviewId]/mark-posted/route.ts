import { markReviewPosted } from '@/lib/services/reviews';
import {
  isReviewMutationAccessError
} from '@/lib/services/reviews';
import {
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { markPostedBodySchema } from '@/lib/validation/mutations';

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

  const bodyResult = await parseJsonBody(request, markPostedBodySchema, {
    allowEmpty: true,
    telemetry: {
      workspace,
      targetEntityType: 'review',
      targetEntityId: reviewId.value
    }
  });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  try {
    const result = await markReviewPosted({
      reviewId: reviewId.value,
      draftId: bodyResult.data.draftId ?? null,
      postedText: bodyResult.data.postedText ?? null,
      businessId: workspace.business.id
    });

    return Response.json({ review: result.review });
  } catch (error) {
    if (isReviewMutationAccessError(error)) {
      return mutationErrorResponseWithTelemetry(
        403,
        error.code,
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'review',
          targetEntityId: reviewId.value
        }
      );
    }

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
    if (error instanceof Error && error.message === 'Draft not found') {
      return mutationErrorResponseWithTelemetry(
        404,
        'not_found',
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'draft',
          targetEntityId: bodyResult.data.draftId ?? null
        }
      );
    }

    throw error;
  }
}
