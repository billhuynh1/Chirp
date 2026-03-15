import { analyzeStoredReview } from '@/lib/services/reviews';
import {
  type AbuseProtectionResponse,
  isAbuseProtectionError
} from '@/lib/services/reviews/abuse-protection';
import {
  isReviewMutationAccessError
} from '@/lib/services/reviews';
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
    const analysis = await analyzeStoredReview(reviewId.value, {
      businessId: workspace.business.id
    });
    return Response.json({ analysis });
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

    if (isAbuseProtectionError(error)) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            retryAfterSeconds: error.retryAfterSeconds
          }
        } satisfies AbuseProtectionResponse,
        {
          status: error.status,
          headers: {
            'Retry-After': String(error.retryAfterSeconds)
          }
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

    throw error;
  }
}
