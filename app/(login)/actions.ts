'use server';

import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  teamMembers,
  teams,
  users,
  ActivityType
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  createWorkspaceForUser,
  getPostAuthRedirect,
  logActivity
} from '@/lib/services/auth';

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data) => {
  const { email, password } = data;

  const [result] = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (!result) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  const isPasswordValid = await comparePasswords(password, result.user.passwordHash);
  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  await Promise.all([
    setSession(result.user),
    logActivity(result.team?.id, result.user.id, ActivityType.SIGN_IN)
  ]);

  redirect(await getPostAuthRedirect(result.team!.id));
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const signUp = validatedAction(signUpSchema, async (data) => {
  const { email, password } = data;

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return {
      error: 'An account with this email already exists.',
      email
    };
  }

  const passwordHash = await hashPassword(password);

  const { user: createdUser, team: createdTeam } = await createWorkspaceForUser({
    email,
    passwordHash
  });

  await Promise.all([
    setSession(createdUser),
    logActivity(createdTeam.id, createdUser.id, ActivityType.SIGN_UP),
    logActivity(createdTeam.id, createdUser.id, ActivityType.CREATE_TEAM)
  ]);

  redirect('/dashboard/setup');
});

export async function signOut() {
  const user = await getUser();
  if (!user) {
    return;
  }

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const isPasswordValid = await comparePasswords(
      data.currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        ...data,
        error: 'Current password is incorrect.'
      };
    }

    if (data.currentPassword === data.newPassword) {
      return {
        ...data,
        error: 'New password must be different from the current password.'
      };
    }

    if (data.confirmPassword !== data.newPassword) {
      return {
        ...data,
        error: 'New password and confirmation password do not match.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: await hashPassword(data.newPassword), updatedAt: new Date() })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: 'Password updated successfully.'
    };
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({
          name: data.name,
          email: data.email,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name: data.name, success: 'Account updated successfully.' };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const isPasswordValid = await comparePasswords(data.password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password: data.password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_ACCOUNT);

    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);
