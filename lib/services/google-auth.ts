import 'server-only';

import { randomBytes } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { hashPassword, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { ActivityType, users } from '@/lib/db/schema';
import { getUserWithTeam } from '@/lib/db/queries';
import { getEnv, requireEnv } from '@/lib/env';
import {
  createWorkspaceForUser,
  getPostAuthRedirect,
  logActivity
} from '@/lib/services/auth';

export type GoogleAuthMode = 'signin' | 'signup';

const googleTokenSchema = z.object({
  access_token: z.string()
});

const googleUserSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.boolean(), z.literal('true'), z.literal('false')]),
  name: z.string().optional()
});

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export function getGoogleAuthPagePath(mode: GoogleAuthMode) {
  return mode === 'signup' ? '/sign-up' : '/sign-in';
}

export function normalizeGoogleAuthMode(value: string | null | undefined): GoogleAuthMode {
  return value === 'signup' ? 'signup' : 'signin';
}

export function createGoogleAuthState() {
  return randomBytes(24).toString('hex');
}

function getGoogleAuthClientId() {
  return getEnv('GOOGLE_AUTH_CLIENT_ID') ?? requireEnv('GOOGLE_CLIENT_ID');
}

function getGoogleAuthClientSecret() {
  return getEnv('GOOGLE_AUTH_CLIENT_SECRET') ?? requireEnv('GOOGLE_CLIENT_SECRET');
}

export function getGoogleAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getGoogleAuthClientId(),
    redirect_uri: `${requireEnv('BASE_URL')}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: getGoogleAuthClientId(),
      client_secret: getGoogleAuthClientSecret(),
      redirect_uri: `${requireEnv('BASE_URL')}/api/auth/google/callback`,
      grant_type: 'authorization_code'
    }).toString(),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new GoogleAuthError('Google sign-in failed while exchanging the authorization code.');
  }

  return googleTokenSchema.parse(await response.json());
}

export async function fetchGoogleUserProfile(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new GoogleAuthError('Google sign-in failed while loading the account profile.');
  }

  const profile = googleUserSchema.parse(await response.json());
  const isVerified =
    profile.email_verified === true || profile.email_verified === 'true';

  if (!isVerified) {
    throw new GoogleAuthError('Your Google account email must be verified before you can continue.');
  }

  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name?.trim() || null
  };
}

async function signInExistingUser(userId: number) {
  const userWithTeam = await getUserWithTeam(userId);
  if (!userWithTeam?.teamId) {
    throw new GoogleAuthError('This account is missing a workspace.');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    throw new GoogleAuthError('This account is no longer available.');
  }

  await Promise.all([
    setSession(user),
    logActivity(userWithTeam.teamId, user.id, ActivityType.SIGN_IN)
  ]);

  return {
    redirectTo: await getPostAuthRedirect(userWithTeam.teamId)
  };
}

export async function authenticateWithGoogle(input: {
  mode: GoogleAuthMode;
  profile: {
    sub: string;
    email: string;
    name: string | null;
  };
}) {
  const [existingByGoogleSub] = await db
    .select()
    .from(users)
    .where(and(eq(users.googleSub, input.profile.sub), isNull(users.deletedAt)))
    .limit(1);

  if (existingByGoogleSub) {
    if (!existingByGoogleSub.name && input.profile.name) {
      await db
        .update(users)
        .set({
          name: input.profile.name,
          updatedAt: new Date()
        })
        .where(eq(users.id, existingByGoogleSub.id));
    }

    return signInExistingUser(existingByGoogleSub.id);
  }

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, input.profile.email), isNull(users.deletedAt)))
    .limit(1);

  if (existingByEmail) {
    if (existingByEmail.googleSub && existingByEmail.googleSub !== input.profile.sub) {
      throw new GoogleAuthError('This email is already linked to a different Google account.');
    }

    await db
      .update(users)
      .set({
        googleSub: input.profile.sub,
        name: existingByEmail.name ?? input.profile.name,
        updatedAt: new Date()
      })
      .where(eq(users.id, existingByEmail.id));

    return signInExistingUser(existingByEmail.id);
  }

  if (input.mode === 'signin') {
    throw new GoogleAuthError('No account exists for this Google email yet. Use Google sign up first.');
  }

  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  const { user, team } = await createWorkspaceForUser({
    email: input.profile.email,
    name: input.profile.name,
    googleSub: input.profile.sub,
    passwordHash
  });

  await Promise.all([
    setSession(user),
    logActivity(team.id, user.id, ActivityType.SIGN_UP),
    logActivity(team.id, user.id, ActivityType.CREATE_TEAM)
  ]);

  return {
    redirectTo: '/dashboard/setup'
  };
}
