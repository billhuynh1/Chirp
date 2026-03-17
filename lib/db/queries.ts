import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { db } from './drizzle';
import {
  activityLogs,
  auditLogs,
  businessSettings,
  businesses,
  connectedAccounts,
  locations,
  reviews,
  teamMembers,
  teams,
  users
} from './schema';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie?.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value).catch(() => null);
  if (!sessionData?.user?.id || new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
}

export async function getUserWithTeam(userId: number) {
  const [result] = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result ?? null;
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return team ?? null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return membership?.team ?? null;
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(20);
}

export async function getRecentBusinessAuditLogs(limit = 20) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    throw new Error('Workspace not found');
  }

  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      ipAddress: auditLogs.ipAddress,
      userName: users.name
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.businessId, workspace.business.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getReviewActivityContext(reviewIds: number[]) {
  if (reviewIds.length === 0) {
    return [] as Array<{
      reviewId: number;
      reviewerName: string | null;
      workflowStatus: string;
      locationName: string;
    }>;
  }

  return db
    .select({
      reviewId: reviews.id,
      reviewerName: reviews.reviewerName,
      workflowStatus: reviews.workflowStatus,
      locationName: locations.name
    })
    .from(reviews)
    .innerJoin(locations, eq(reviews.locationId, locations.id))
    .where(inArray(reviews.id, reviewIds));
}

export async function getBusinessByTeamId(teamId: number) {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.teamId, teamId))
    .limit(1);

  return business ?? null;
}

export async function getCurrentBusiness() {
  const team = await getTeamForUser();
  if (!team) {
    return null;
  }

  return getBusinessByTeamId(team.id);
}

export async function getCurrentWorkspace() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const team = await getTeamForUser();
  if (!team) {
    return null;
  }

  const business = await getBusinessByTeamId(team.id);
  if (!business) {
    return { user, team, business: null, settings: null, connectedAccount: null };
  }

  const [settings, connectedAccount] = await Promise.all([
    db.query.businessSettings.findFirst({
      where: eq(businessSettings.businessId, business.id)
    }),
    db.query.connectedAccounts.findFirst({
      where: and(
        eq(connectedAccounts.businessId, business.id),
        eq(connectedAccounts.provider, 'google_business_profile')
      )
    })
  ]);

  return { user, team, business, settings: settings ?? null, connectedAccount: connectedAccount ?? null };
}
