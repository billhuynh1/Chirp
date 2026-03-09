import { approveDraft } from '@/lib/services/reviews';
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
  const draft = await approveDraft({
    draftId: Number(draftId),
    userId: workspace.user.id,
    editedText: body.approvedText ?? null
  });

  return Response.json({ draft });
}

