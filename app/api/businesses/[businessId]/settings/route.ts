import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { businessSettings } from '@/lib/db/schema';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { updateBusinessSettings } from '@/lib/services/businesses';
import {
  mutationErrorResponse,
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { updateBusinessSettingsMutationSchema } from '@/lib/validation/mutations';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { businessId: businessIdRaw } = await params;
  const businessId = await parseRouteId(businessIdRaw, 'businessId');
  if (!businessId.ok) {
    return businessId.response;
  }

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (workspace.business.id !== businessId.value) {
    return mutationErrorResponse(403, 'forbidden_scope', 'Forbidden');
  }

  const settings = await db.query.businessSettings.findFirst({
    where: eq(businessSettings.businessId, businessId.value)
  });

  return Response.json({ settings });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    ownerOnly: true,
    targetEntityType: 'business_settings'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;
  const { businessId: businessIdRaw } = await params;
  const businessId = await parseRouteId(businessIdRaw, 'businessId', {
    request,
    workspace,
    targetEntityType: 'business'
  });
  if (!businessId.ok) {
    return businessId.response;
  }
  if (workspace.business.id !== businessId.value) {
    return mutationErrorResponseWithTelemetry(
      403,
      'forbidden_scope',
      'Access to this business is forbidden for the current workspace.',
      {
        request,
        workspace,
        targetEntityType: 'business',
        targetEntityId: businessId.value
      }
    );
  }

  const bodyResult = await parseJsonBody(request, updateBusinessSettingsMutationSchema, {
    telemetry: {
      workspace,
      targetEntityType: 'business_settings',
      targetEntityId: businessId.value
    }
  });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const settings = await updateBusinessSettings(businessId.value, bodyResult.data);
  return Response.json({ settings });
}
