import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  createGoogleAuthState,
  getGoogleAuthPagePath,
  getGoogleAuthorizationUrl,
  normalizeGoogleAuthMode
} from '@/lib/services/google-auth';

function redirectToAuthPage(request: NextRequest, mode: 'signin' | 'signup', error: string) {
  const url = new URL(getGoogleAuthPagePath(mode), request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const mode = normalizeGoogleAuthMode(request.nextUrl.searchParams.get('mode'));

  try {
    const state = createGoogleAuthState();
    const cookieStore = await cookies();

    cookieStore.set('google_auth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/'
    });

    cookieStore.set('google_auth_mode', mode, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/'
    });

    return NextResponse.redirect(getGoogleAuthorizationUrl(state));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Google sign-in is not configured yet. Add the Google auth environment variables first.';

    return redirectToAuthPage(
      request,
      mode,
      message
    );
  }
}
