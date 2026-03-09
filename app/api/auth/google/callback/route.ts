import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithGoogle,
  exchangeGoogleAuthCode,
  fetchGoogleUserProfile,
  getGoogleAuthPagePath,
  GoogleAuthError,
  normalizeGoogleAuthMode
} from '@/lib/services/google-auth';

function clearGoogleAuthCookies(response: NextResponse) {
  response.cookies.delete('google_auth_state');
  response.cookies.delete('google_auth_mode');
  return response;
}

function redirectToAuthPage(request: NextRequest, mode: 'signin' | 'signup', error: string) {
  const url = new URL(getGoogleAuthPagePath(mode), request.url);
  url.searchParams.set('error', error);
  return clearGoogleAuthCookies(NextResponse.redirect(url));
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const mode = normalizeGoogleAuthMode(cookieStore.get('google_auth_mode')?.value);
  const expectedState = cookieStore.get('google_auth_state')?.value;
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const providerError = request.nextUrl.searchParams.get('error');

  if (providerError) {
    return redirectToAuthPage(request, mode, 'Google sign-in was cancelled or denied.');
  }

  if (!expectedState || !state || state !== expectedState) {
    return redirectToAuthPage(
      request,
      mode,
      'Google sign-in could not be verified. Please try again.'
    );
  }

  if (!code) {
    return redirectToAuthPage(
      request,
      mode,
      'Google did not return an authorization code. Please try again.'
    );
  }

  try {
    const token = await exchangeGoogleAuthCode(code);
    const profile = await fetchGoogleUserProfile(token.access_token);
    const result = await authenticateWithGoogle({ mode, profile });

    return clearGoogleAuthCookies(
      NextResponse.redirect(new URL(result.redirectTo, request.url))
    );
  } catch (error) {
    console.error('Google auth callback failed:', error);

    const message =
      error instanceof GoogleAuthError
        ? error.message
        : 'Google sign-in failed. Please try again.';

    return redirectToAuthPage(request, mode, message);
  }
}
