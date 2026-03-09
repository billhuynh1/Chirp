import { rejectDraft } from '@/lib/services/reviews';
import { getCurrentWorkspace } from '@/lib/db/queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { draftId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const draft = await rejectDraft({
    draftId: Number(draftId),
    reason: body.reason ?? null
  });

  return Response.json({ draft });
}

