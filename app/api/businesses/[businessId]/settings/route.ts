import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { businessSettings } from '@/lib/db/schema';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { updateBusinessSettings } from '@/lib/services/businesses';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { businessId } = await params;

  if (!workspace?.business || workspace.business.id !== Number(businessId)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await db.query.businessSettings.findFirst({
    where: eq(businessSettings.businessId, Number(businessId))
  });

  return Response.json({ settings });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { businessId } = await params;

  if (!workspace?.business || workspace.business.id !== Number(businessId)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const settings = await updateBusinessSettings(Number(businessId), body);
  return Response.json({ settings });
}

