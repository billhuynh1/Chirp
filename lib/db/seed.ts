import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { createDefaultBusiness } from '@/lib/services/businesses';

async function seed() {
  const email = 'owner@chirp-demo.com';
  const passwordHash = await hashPassword('admin1234');

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: 'owner',
      name: 'Demo Owner'
    })
    .returning();

  const [team] = await db
    .insert(teams)
    .values({
      name: 'Chirp Demo Workspace'
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner'
  });

  await createDefaultBusiness({
    teamId: team.id,
    ownerEmail: email,
    defaultName: 'Chirp Plumbing Demo'
  });
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
