import { db } from '@/lib/db/drizzle';
import { locations, replyDrafts, reviews } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
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
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    targetEntityType: 'draft'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;
  const { draftId: draftIdRaw } = await params;
  const draftId = await parseRouteId(draftIdRaw, 'draftId', {
    request,
    workspace,
    targetEntityType: 'draft'
  });
  if (!draftId.ok) {
    return draftId.response;
  }

  const [scopedDraft] = await db
    .select({
      id: replyDrafts.id,
      reviewId: replyDrafts.reviewId
    })
    .from(replyDrafts)
    .innerJoin(reviews, eq(reviews.id, replyDrafts.reviewId))
    .innerJoin(locations, eq(locations.id, reviews.locationId))
    .where(
      and(
        eq(replyDrafts.id, draftId.value),
        eq(locations.businessId, workspace.business.id)
      )
    )
    .limit(1);

  const draft = scopedDraft ?? null;
  if (!draft) {
    const [existingDraft] = await db
      .select({ id: replyDrafts.id })
      .from(replyDrafts)
      .where(eq(replyDrafts.id, draftId.value))
      .limit(1);

    if (existingDraft) {
      return mutationErrorResponseWithTelemetry(
        403,
        'forbidden_scope',
        'Access to this review or draft is forbidden for the current workspace.',
        {
          request,
          workspace,
          targetEntityType: 'draft',
          targetEntityId: draftId.value
        }
      );
    }

    return mutationErrorResponseWithTelemetry(
      404,
      'not_found',
      'Draft not found',
      {
        request,
        workspace,
        targetEntityType: 'draft',
        targetEntityId: draftId.value
      }
    );
  }

  try {
    const regenerated = await generateDraftForReview(draft.reviewId, 'regenerate', {
      businessId: workspace.business.id
    });
    return Response.json({ draft: regenerated });
  } catch (error) {
    if (isReviewMutationAccessError(error)) {
      return mutationErrorResponseWithTelemetry(
        403,
        error.code,
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'draft',
          targetEntityId: draftId.value
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
          targetEntityId: draft.reviewId
        }
      );
    }

    throw error;
  }
}
