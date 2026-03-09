import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  buildGoogleOAuthUrl,
  createGoogleOAuthState
} from '@/lib/services/integrations/google';
import { getEnv, isExternalServicesMocked, requireEnv } from '@/lib/env';

export async function POST() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = createGoogleOAuthState();
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 10
  });
  cookieStore.set('google_oauth_business_id', String(workspace.business.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 10
  });

  if (isExternalServicesMocked() || !getEnv('GOOGLE_CLIENT_ID')) {
    return NextResponse.redirect(
      new URL(`/api/integrations/google/callback?state=${state}&mode=mock`, requireEnv('BASE_URL'))
    );
  }

  return NextResponse.redirect(buildGoogleOAuthUrl(state));
}
