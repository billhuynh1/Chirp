import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { businesses, locations } from '@/lib/db/schema';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { updateBusinessProfile } from '@/lib/services/businesses';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { businessId } = await params;

  if (!workspace?.business || workspace.business.id !== Number(businessId)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [business, businessLocations] = await Promise.all([
    db.query.businesses.findFirst({
      where: eq(businesses.id, Number(businessId))
    }),
    db.select().from(locations).where(eq(locations.businessId, Number(businessId)))
  ]);

  return Response.json({ business, locations: businessLocations });
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
  const business = await updateBusinessProfile(Number(businessId), body);
  return Response.json({ business });
}

