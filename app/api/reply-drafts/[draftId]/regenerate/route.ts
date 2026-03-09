import { getCurrentWorkspace } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { replyDrafts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateDraftForReview } from '@/lib/services/reviews';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { draftId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const draft = await db.query.replyDrafts.findFirst({
    where: eq(replyDrafts.id, Number(draftId))
  });
  if (!draft) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const regenerated = await generateDraftForReview(draft.reviewId, 'regenerate');
  return Response.json({ draft: regenerated });
}

