import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  buildGoogleOAuthUrl,
  createGoogleOAuthState
} from '@/lib/services/integrations/google';
import { getEnv, isExternalServicesMocked, requireEnv } from '@/lib/env';
import { requireWorkspaceForMutation } from '@/lib/auth/mutation-guards';

export async function POST(request: Request) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    ownerOnly: true,
    targetEntityType: 'integration'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;

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
      new URL(`/api/integrations/google/callback?state=${state}&mode=mock`, requireEnv('BASE_URL')),
      303
    );
  }

  return NextResponse.redirect(buildGoogleOAuthUrl(state), 303);
}
