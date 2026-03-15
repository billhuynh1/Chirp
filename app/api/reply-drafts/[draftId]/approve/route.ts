import { approveDraft } from '@/lib/services/reviews';
import {
  isReviewMutationAccessError
} from '@/lib/services/reviews';
import {
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { approveDraftBodySchema } from '@/lib/validation/mutations';

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

  const bodyResult = await parseJsonBody(request, approveDraftBodySchema, {
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
    const result = await approveDraft({
      draftId: draftId.value,
      userId: workspace.user.id,
      editedText: bodyResult.data.approvedText ?? null,
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
