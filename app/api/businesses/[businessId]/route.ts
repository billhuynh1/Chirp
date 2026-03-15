import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { businesses, locations } from '@/lib/db/schema';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { updateBusinessProfile } from '@/lib/services/businesses';
import {
  mutationErrorResponse,
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { updateBusinessProfileMutationSchema } from '@/lib/validation/mutations';

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

  const [business, businessLocations] = await Promise.all([
    db.query.businesses.findFirst({
      where: eq(businesses.id, businessId.value)
    }),
    db.select().from(locations).where(eq(locations.businessId, businessId.value))
  ]);

  return Response.json({ business, locations: businessLocations });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    ownerOnly: true,
    targetEntityType: 'business'
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

  const bodyResult = await parseJsonBody(request, updateBusinessProfileMutationSchema, {
    telemetry: {
      workspace,
      targetEntityType: 'business',
      targetEntityId: businessId.value
    }
  });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const business = await updateBusinessProfile(businessId.value, bodyResult.data);
  return Response.json({ business });
}
