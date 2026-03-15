import { generateDraftForReview } from '@/lib/services/reviews';
import {
  type DraftGenerationConflictResponse,
  isDraftGenerationConflictError
} from '@/lib/services/reviews/draft-generation-policy';
import {
  type AbuseProtectionResponse,
  isAbuseProtectionError
} from '@/lib/services/reviews/abuse-protection';
import {
  isReviewMutationAccessError
} from '@/lib/services/reviews';
import {
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { createDraftBodySchema } from '@/lib/validation/mutations';

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

  const bodyResult = await parseJsonBody(request, createDraftBodySchema, {
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
  const generationReason =
    bodyResult.data.generationReason === 'regenerate' ? 'regenerate' : 'manual';

  try {
    const draft = await generateDraftForReview(reviewId.value, generationReason, {
      businessId: workspace.business.id
    });
    return Response.json({ draft });
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
