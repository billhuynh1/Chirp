import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { connectGoogleAccountForBusiness } from '@/lib/services/integrations/google';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get('google_oauth_state')?.value;
  const businessId = Number(cookieStore.get('google_oauth_business_id')?.value);
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const mode = request.nextUrl.searchParams.get('mode');

  if (!businessId || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/dashboard/setup?error=google-state', request.url));
  }

  await connectGoogleAccountForBusiness({
    businessId,
    code: mode === 'mock' ? null : code
  });

  cookieStore.delete('google_oauth_state');
  cookieStore.delete('google_oauth_business_id');

  return NextResponse.redirect(new URL('/dashboard/setup?connected=google', request.url));
}

