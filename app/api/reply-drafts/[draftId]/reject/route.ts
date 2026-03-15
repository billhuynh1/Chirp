import { rejectDraft } from '@/lib/services/reviews';
import {
  isReviewMutationAccessError
} from '@/lib/services/reviews';
import {
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { rejectDraftBodySchema } from '@/lib/validation/mutations';

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

  const bodyResult = await parseJsonBody(request, rejectDraftBodySchema, {
    allowEmpty: true,
    telemetry: {
      workspace,
      targetEntityType: 'draft',
      targetEntityId: draftId.value
    }
  });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  try {
    const result = await rejectDraft({
      draftId: draftId.value,
      reason: bodyResult.data.reason ?? null,
      businessId: workspace.business.id
    });

    return Response.json({ draft: result.draft });
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

    if (error instanceof Error && error.message === 'Draft not found') {
      return mutationErrorResponseWithTelemetry(
        404,
        'not_found',
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'draft',
          targetEntityId: draftId.value
        }
      );
    }

    throw error;
  }
}
