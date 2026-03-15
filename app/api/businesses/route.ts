import { updateBusinessProfile } from '@/lib/services/businesses';
import {
  parseJsonBody,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { updateBusinessProfileMutationSchema } from '@/lib/validation/mutations';

export async function POST(request: Request) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    ownerOnly: true,
    targetEntityType: 'business'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;

  const bodyResult = await parseJsonBody(request, updateBusinessProfileMutationSchema, {
    telemetry: {
      workspace,
      targetEntityType: 'business',
      targetEntityId: workspace.business.id
    }
  });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const business = await updateBusinessProfile(workspace.business.id, bodyResult.data);
  return Response.json({ business });
}
