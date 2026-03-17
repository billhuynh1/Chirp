import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  teamMembers,
  teams,
  users,
  type ActivityType,
  type NewActivityLog,
  type NewTeam,
  type NewTeamMember,
  type NewUser
} from '@/lib/db/schema';
import { getBusinessByTeamId } from '@/lib/db/queries';
import { createDefaultBusiness } from '@/lib/services/businesses';

export async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  action: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  const record: NewActivityLog = {
    teamId,
    userId,
    action,
    ipAddress: ipAddress || ''
  };

  await db.insert(activityLogs).values(record);
}

export async function getPostAuthRedirect(teamId: number) {
  const business = await getBusinessByTeamId(teamId);
  if (!business || !business.onboardingCompletedAt) {
    return '/dashboard/setup';
  }

  return '/dashboard';
}

type CreateWorkspaceForUserInput = {
  email: string;
  passwordHash: string;
  name?: string | null;
  googleSub?: string | null;
};

export async function createWorkspaceForUser(input: CreateWorkspaceForUserInput) {
  const [createdUser] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name ?? null,
      googleSub: input.googleSub ?? null,
      passwordHash: input.passwordHash,
      role: 'owner'
    } satisfies NewUser)
    .returning();

  const workspaceOwner = input.name?.trim().split(/\s+/)[0] || input.email.split('@')[0];

  const [createdTeam] = await db
    .insert(teams)
    .values({
      name: `${workspaceOwner}'s Workspace`
    } satisfies NewTeam)
    .returning();

  await db.insert(teamMembers).values({
    userId: createdUser.id,
    teamId: createdTeam.id,
    role: 'owner'
  } satisfies NewTeamMember);

  await createDefaultBusiness({
    teamId: createdTeam.id,
    ownerEmail: input.email,
    defaultName: 'Your Home Service Business'
  });

  return { user: createdUser, team: createdTeam };
}
