import { and, eq } from 'drizzle-orm';
import type { LucideIcon } from 'lucide-react';
import { Building2, Link2, Sparkles } from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import {
  businessSettings,
  businesses,
  connectedAccounts,
  locations,
  type Business,
  type BusinessSettings,
  type NewBusiness,
  type NewBusinessSettings
} from '@/lib/db/schema';

export async function createDefaultBusiness({
  teamId,
  ownerEmail,
  defaultName
}: {
  teamId: number;
  ownerEmail: string;
  defaultName: string;
}) {
  const newBusiness: NewBusiness = {
    teamId,
    name: defaultName,
    vertical: 'plumbing',
    reviewContactEmail: ownerEmail,
    timezone: 'America/Los_Angeles',
    status: 'trial'
  };

  const [business] = await db.insert(businesses).values(newBusiness).returning();

  const settings: NewBusinessSettings = {
    businessId: business.id,
    brandVoice: 'Helpful, calm, and professional. Focus on service, cleanliness, and responsiveness.',
    signoffName: business.name,
    escalationMessage:
      'Please contact our office so we can review the details and help directly.',
    allowedPromises: [],
    bannedPhrases: ['we guarantee a refund', 'we admit fault', 'this was our negligence'],
    notificationEmails: [ownerEmail],
    defaultReplyStyle: 'professional',
    language: 'en',
    manualReviewRules: ['negative_reviews', 'damage_claim', 'safety_concern']
  };

  const [createdSettings] = await db
    .insert(businessSettings)
    .values(settings)
    .returning();

  return { business, settings: createdSettings };
}

export async function getBusinessWithSettings(teamId: number) {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.teamId, teamId)
  });

  if (!business) {
    return null;
  }

  const [settings, googleAccount, selectedLocations] = await Promise.all([
    db.query.businessSettings.findFirst({
      where: eq(businessSettings.businessId, business.id)
    }),
    db.query.connectedAccounts.findFirst({
      where: and(
        eq(connectedAccounts.businessId, business.id),
        eq(connectedAccounts.provider, 'google_business_profile')
      )
    }),
    db
      .select()
      .from(locations)
      .where(eq(locations.businessId, business.id))
  ]);

  return {
    business,
    settings: settings ?? null,
    googleAccount: googleAccount ?? null,
    locations: selectedLocations
  };
}

export async function updateBusinessProfile(
  businessId: number,
  data: Partial<
    Pick<
      Business,
      | 'name'
      | 'vertical'
      | 'primaryPhone'
      | 'website'
      | 'timezone'
      | 'reviewContactEmail'
      | 'status'
    >
  >
) {
  const [business] = await db
    .update(businesses)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(businesses.id, businessId))
    .returning();

  return business;
}

export async function updateBusinessSettings(
  businessId: number,
  data: Partial<
    Pick<
      BusinessSettings,
      | 'brandVoice'
      | 'signoffName'
      | 'escalationMessage'
      | 'allowedPromises'
      | 'bannedPhrases'
      | 'notificationEmails'
      | 'defaultReplyStyle'
      | 'language'
      | 'manualReviewRules'
    >
  >
) {
  const existing = await db.query.businessSettings.findFirst({
    where: eq(businessSettings.businessId, businessId)
  });

  if (!existing) {
    const [created] = await db
      .insert(businessSettings)
      .values({
        businessId,
        brandVoice: data.brandVoice ?? 'Helpful, calm, and professional.',
        signoffName: data.signoffName ?? 'The Team',
        escalationMessage:
          data.escalationMessage ??
          'Please contact our office so we can review the details directly.',
        allowedPromises: data.allowedPromises ?? [],
        bannedPhrases: data.bannedPhrases ?? [],
        notificationEmails: data.notificationEmails ?? [],
        defaultReplyStyle: data.defaultReplyStyle ?? 'professional',
        language: data.language ?? 'en',
        manualReviewRules: data.manualReviewRules ?? []
      })
      .returning();

    return created;
  }

  const [updated] = await db
    .update(businessSettings)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(businessSettings.id, existing.id))
    .returning();

  return updated;
}

export async function completeBusinessOnboarding(businessId: number) {
  const [business] = await db
    .update(businesses)
    .set({
      onboardingCompletedAt: new Date(),
      status: 'active',
      updatedAt: new Date()
    })
    .where(eq(businesses.id, businessId))
    .returning();

  return business;
}

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  isComplete: boolean;
};

export type OnboardingStatus = {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
};

export async function getOnboardingStatus(
  businessId: number
): Promise<OnboardingStatus> {
  const [business, settings, googleAccount] = await Promise.all([
    db.query.businesses.findFirst({
      where: eq(businesses.id, businessId)
    }),
    db.query.businessSettings.findFirst({
      where: eq(businessSettings.businessId, businessId)
    }),
    db.query.connectedAccounts.findFirst({
      where: and(
        eq(connectedAccounts.businessId, businessId),
        eq(connectedAccounts.provider, 'google_business_profile')
      )
    })
  ]);

  const hasBusinessInfo =
    !!business &&
    business.vertical !== 'plumbing' &&
    (!!business.primaryPhone || !!business.website);

  const hasGoogleConnected = !!googleAccount;

  const hasConfiguredDrafts =
    !!settings &&
    (settings.brandVoice !==
      'Helpful, calm, and professional. Focus on service, cleanliness, and responsiveness.' ||
      settings.signoffName !== (business?.name ?? 'The Team'));

  const steps: OnboardingStep[] = [
    {
      id: 'business_info',
      title: 'Add business info',
      description:
        'Set your service niche, phone number, and website so Chirp can tailor replies.',
      icon: Building2,
      href: '/dashboard/setup',
      isComplete: hasBusinessInfo
    },
    {
      id: 'connect_google',
      title: 'Connect Google Business Profile',
      description:
        'Link your Google account to start importing reviews automatically.',
      icon: Link2,
      href: '/dashboard/setup',
      isComplete: hasGoogleConnected
    },
    {
      id: 'drafting_defaults',
      title: 'Configure drafting defaults',
      description:
        'Set your brand voice and sign-off name so AI drafts sound like you.',
      icon: Sparkles,
      href: '/dashboard/setup',
      isComplete: hasConfiguredDrafts
    }
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allComplete: completedCount === steps.length
  };
}
