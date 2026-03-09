import { getCurrentWorkspace } from '@/lib/db/queries';

export async function GET() {
  const workspace = await getCurrentWorkspace();
  return Response.json(workspace);
}

