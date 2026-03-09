import crypto from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  connectedAccounts,
  locations,
  type ConnectedAccount,
  type Location
} from '@/lib/db/schema';
import { getEnv, isExternalServicesMocked, requireEnv } from '@/lib/env';
import { decryptValue, encryptValue } from '@/lib/security';

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

export type SelectableGoogleLocation = {
  accountName: string;
  externalLocationId: string;
  name: string;
  address: string | null;
  phone: string | null;
};

type GoogleReviewRecord = {
  externalReviewId: string;
  reviewerName: string | null;
  reviewerPhotoUrl: string | null;
  starRating: number;
  reviewText: string | null;
  reviewCreatedAt: Date;
  reviewUpdatedAt: Date;
  ownerReplyText: string | null;
  ownerReplyUpdatedAt: Date | null;
  sourceUrl: string | null;
  rawPayload: Record<string, unknown>;
};

function getRedirectUri() {
  return (
    getEnv('GOOGLE_REDIRECT_URI') ??
    `${requireEnv('BASE_URL')}/api/integrations/google/callback`
  );
}

export function buildGoogleOAuthUrl(state: string) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: 'https://www.googleapis.com/auth/business.manage'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function createGoogleOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

async function exchangeAuthorizationCode(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function refreshGoogleAccessToken(account: ConnectedAccount) {
  if (!account.refreshTokenEncrypted) {
    throw new Error('Missing Google refresh token');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: decryptValue(account.refreshTokenEncrypted),
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed with status ${response.status}`);
  }

  const token = (await response.json()) as GoogleTokenResponse;

  const [updated] = await db
    .update(connectedAccounts)
    .set({
      accessTokenEncrypted: encryptValue(token.access_token),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      updatedAt: new Date(),
      status: 'active',
      lastError: null
    })
    .where(eq(connectedAccounts.id, account.id))
    .returning();

  return updated;
}

async function getAccessToken(account: ConnectedAccount) {
  if (account.metadata?.['mock']) {
    return 'mock-token';
  }

  if (!account.accessTokenEncrypted) {
    throw new Error('Missing Google access token');
  }

  if (account.expiresAt && account.expiresAt.getTime() < Date.now() + 60_000) {
    const refreshed = await refreshGoogleAccessToken(account);
    return refreshed.accessTokenEncrypted
      ? decryptValue(refreshed.accessTokenEncrypted)
      : 'mock-token';
  }

  return decryptValue(account.accessTokenEncrypted);
}

function toSelectableGoogleLocations(input: any[]): SelectableGoogleLocation[] {
  return input.map((location) => {
    const address = location.storefrontAddress
      ? [
          location.storefrontAddress.addressLines?.join(', '),
          location.storefrontAddress.locality,
          location.storefrontAddress.administrativeArea,
          location.storefrontAddress.postalCode
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    return {
      accountName: location.accountName ?? '',
      externalLocationId: String(location.name ?? '').split('/').pop() ?? '',
      name: location.title ?? location.locationName ?? 'Google Location',
      address,
      phone:
        location.phoneNumbers?.primaryPhone ??
        location.phoneNumbers?.additionalPhones?.[0] ??
        null
    };
  });
}

async function listGoogleAccounts(accessToken: string) {
  const response = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google accounts fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    accounts?: Array<{ name: string; accountName?: string }>;
  };

  return payload.accounts ?? [];
}

async function listGoogleLocationsForAccount(
  accessToken: string,
  accountName: string
) {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google locations fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { locations?: any[] };

  return (payload.locations ?? []).map((location) => ({
    ...location,
    accountName
  }));
}

async function listSelectableLocations(accessToken: string) {
  const accounts = await listGoogleAccounts(accessToken);
  const locationGroups = await Promise.all(
    accounts.map((account) => listGoogleLocationsForAccount(accessToken, account.name))
  );

  return toSelectableGoogleLocations(locationGroups.flat());
}

function getMockLocations(): SelectableGoogleLocation[] {
  return [
    {
      accountName: 'accounts/mock-plumbing',
      externalLocationId: 'mock-east',
      name: 'Chirp Plumbing - East Austin',
      address: '1401 E Cesar Chavez St, Austin, TX 78702',
      phone: '(512) 555-0101'
    },
    {
      accountName: 'accounts/mock-plumbing',
      externalLocationId: 'mock-north',
      name: 'Chirp Plumbing - North Austin',
      address: '11601 Burnet Rd, Austin, TX 78758',
      phone: '(512) 555-0102'
    }
  ];
}

export async function connectGoogleAccountForBusiness({
  businessId,
  code
}: {
  businessId: number;
  code?: string | null;
}) {
  const mock = isExternalServicesMocked() || !getEnv('GOOGLE_CLIENT_ID');
  const tokenResponse = mock ? null : await exchangeAuthorizationCode(code!);
  const selectableLocations = mock
    ? getMockLocations()
    : await listSelectableLocations(tokenResponse!.access_token);

  const externalAccountId =
    selectableLocations[0]?.accountName ?? `mock-account-${businessId}`;
  const encryptedAccessToken = tokenResponse?.access_token
    ? encryptValue(tokenResponse.access_token)
    : null;
  const encryptedRefreshToken = tokenResponse?.refresh_token
    ? encryptValue(tokenResponse.refresh_token)
    : null;

  const [existing] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.businessId, businessId),
        eq(connectedAccounts.provider, 'google_business_profile')
      )
    )
    .limit(1);

  const metadata = {
    mock,
    availableLocations: selectableLocations
  };

  if (existing) {
    const [updated] = await db
      .update(connectedAccounts)
      .set({
        externalAccountId,
        accessTokenEncrypted: encryptedAccessToken ?? existing.accessTokenEncrypted,
        refreshTokenEncrypted:
          encryptedRefreshToken ?? existing.refreshTokenEncrypted,
        expiresAt: tokenResponse
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : existing.expiresAt,
        scope: tokenResponse?.scope ?? existing.scope,
        status: 'active',
        metadata,
        updatedAt: new Date(),
        lastError: null
      })
      .where(eq(connectedAccounts.id, existing.id))
      .returning();

    return updated;
  }

  const [account] = await db
    .insert(connectedAccounts)
    .values({
      businessId,
      provider: 'google_business_profile',
      externalAccountId,
      accessTokenEncrypted: encryptedAccessToken,
      refreshTokenEncrypted: encryptedRefreshToken,
      expiresAt: tokenResponse
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null,
      scope: tokenResponse?.scope ?? 'https://www.googleapis.com/auth/business.manage',
      status: 'active',
      metadata
    })
    .returning();

  return account;
}

export function getSelectableLocationsFromMetadata(account: ConnectedAccount) {
  const locationsValue = account.metadata?.['availableLocations'];
  if (!Array.isArray(locationsValue)) {
    return [];
  }
  return locationsValue as SelectableGoogleLocation[];
}

export async function selectGoogleLocationsForBusiness({
  businessId,
  connectedAccountId,
  locationIds
}: {
  businessId: number;
  connectedAccountId: number;
  locationIds: string[];
}) {
  const account = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.id, connectedAccountId),
      eq(connectedAccounts.businessId, businessId)
    )
  });

  if (!account) {
    throw new Error('Connected account not found');
  }

  const selectable = getSelectableLocationsFromMetadata(account).filter((location) =>
    locationIds.includes(location.externalLocationId)
  );

  if (selectable.length === 0) {
    throw new Error('Select at least one location');
  }

  for (const location of selectable) {
    const [existing] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.businessId, businessId),
          eq(locations.externalLocationId, location.externalLocationId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(locations)
        .set({
          connectedAccountId,
          googleAccountName: location.accountName,
          name: location.name,
          address: location.address,
          phone: location.phone,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(locations.id, existing.id));
    } else {
      await db.insert(locations).values({
        businessId,
        connectedAccountId,
        googleAccountName: location.accountName,
        externalLocationId: location.externalLocationId,
        name: location.name,
        address: location.address,
        phone: location.phone,
        isPrimary: selectable.indexOf(location) === 0,
        status: 'active'
      });
    }
  }

  await db
    .update(connectedAccounts)
    .set({
      metadata: {
        ...account.metadata,
        selectedLocationIds: locationIds
      },
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, account.id));

  return db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.businessId, businessId),
        inArray(locations.externalLocationId, locationIds)
      )
    );
}

function getMockReviews(location: Location): GoogleReviewRecord[] {
  const now = new Date();
  return [
    {
      externalReviewId: `${location.externalLocationId}-r1`,
      reviewerName: 'Amanda R.',
      reviewerPhotoUrl: null,
      starRating: 5,
      reviewText:
        'Fast response, clean work, and the plumber explained everything clearly.',
      reviewCreatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      reviewUpdatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      ownerReplyText: null,
      ownerReplyUpdatedAt: null,
      sourceUrl: null,
      rawPayload: {}
    },
    {
      externalReviewId: `${location.externalLocationId}-r2`,
      reviewerName: 'Marcus T.',
      reviewerPhotoUrl: null,
      starRating: 1,
      reviewText:
        'Technician arrived late, charged more than quoted, and the leak came back the next day.',
      reviewCreatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      reviewUpdatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      ownerReplyText: null,
      ownerReplyUpdatedAt: null,
      sourceUrl: null,
      rawPayload: {}
    }
  ];
}

function parseGoogleStarRating(value: string | undefined) {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

function mapGoogleReview(review: any): GoogleReviewRecord {
  return {
    externalReviewId: review.reviewId ?? review.name ?? crypto.randomUUID(),
    reviewerName: review.reviewer?.displayName ?? null,
    reviewerPhotoUrl: review.reviewer?.profilePhotoUrl ?? null,
    starRating: parseGoogleStarRating(review.starRating),
    reviewText: review.comment ?? null,
    reviewCreatedAt: new Date(review.createTime ?? new Date().toISOString()),
    reviewUpdatedAt: new Date(review.updateTime ?? review.createTime ?? new Date().toISOString()),
    ownerReplyText: review.reviewReply?.comment ?? null,
    ownerReplyUpdatedAt: review.reviewReply?.updateTime
      ? new Date(review.reviewReply.updateTime)
      : null,
    sourceUrl: review.reviewer?.profileUrl ?? null,
    rawPayload: review
  };
}

export async function fetchReviewsForLocation(
  account: ConnectedAccount,
  location: Location
) {
  if (account.metadata?.['mock']) {
    return getMockReviews(location);
  }

  const accessToken = await getAccessToken(account);
  const accountName = location.googleAccountName ?? account.externalAccountId;
  const resource = `accounts/${accountName.split('/').pop()}/locations/${location.externalLocationId}`;
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/${resource}/reviews?pageSize=50&orderBy=updateTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google reviews fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { reviews?: any[] };
  return (payload.reviews ?? []).map(mapGoogleReview);
}

export async function disconnectGoogleAccount(businessId: number) {
  const [account] = await db
    .update(connectedAccounts)
    .set({
      status: 'disconnected',
      updatedAt: new Date()
    })
    .where(
      and(
        eq(connectedAccounts.businessId, businessId),
        eq(connectedAccounts.provider, 'google_business_profile')
      )
    )
    .returning();

  return account ?? null;
}

export async function markGoogleAccountError(accountId: number, message: string) {
  await db
    .update(connectedAccounts)
    .set({
      status: 'error',
      lastError: message,
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, accountId));
}
