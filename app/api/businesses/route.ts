import { getCurrentWorkspace } from '@/lib/db/queries';
import { updateBusinessProfile } from '@/lib/services/businesses';

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const business = await updateBusinessProfile(workspace.business.id, body);
  return Response.json({ business });
}

