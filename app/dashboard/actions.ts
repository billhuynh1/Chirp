'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { createAuditLog } from '@/lib/services/audit';
import {
  completeBusinessOnboarding,
  updateBusinessProfile,
  updateBusinessSettings
} from '@/lib/services/businesses';
import { queueJob } from '@/lib/services/job-queue';
import { processPendingJobs } from '@/lib/services/jobs';
import {
  approveDraft,
  generateDraftForReview,
  markReviewPosted,
  rejectDraft
} from '@/lib/services/reviews';
import { selectGoogleLocationsForBusiness } from '@/lib/services/integrations/google';

function csvToArray(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function requireWorkspace() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business || !workspace.settings) {
    throw new Error('Workspace not found');
  }
  return {
    ...workspace,
    business: workspace.business,
    settings: workspace.settings
  };
}

const businessProfileSchema = z.object({
  name: z.string().min(2).max(160),
  vertical: z.string().min(2).max(80),
  primaryPhone: z.string().max(40).optional(),
  website: z.string().max(255).optional(),
  timezone: z.string().min(2).max(80),
  reviewContactEmail: z.string().email().optional().or(z.literal(''))
});

export async function saveBusinessProfileAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const parsed = businessProfileSchema.parse(Object.fromEntries(formData));

  await updateBusinessProfile(workspace.business.id, {
    name: parsed.name,
    vertical: parsed.vertical,
    primaryPhone: parsed.primaryPhone || null,
    website: parsed.website || null,
    timezone: parsed.timezone,
    reviewContactEmail: parsed.reviewContactEmail || null
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'business',
    entityId: workspace.business.id,
    action: 'update_business_profile',
    metadata: parsed
  });

  revalidatePath('/dashboard/setup');
  revalidatePath('/dashboard/settings');
}

const businessSettingsSchema = z.object({
  brandVoice: z.string().min(10).max(1000),
  signoffName: z.string().min(2).max(120),
  escalationMessage: z.string().min(10).max(500),
  defaultReplyStyle: z.string().min(2).max(50),
  allowedPromises: z.string().optional(),
  bannedPhrases: z.string().optional(),
  notificationEmails: z.string().optional(),
  manualReviewRules: z.string().optional()
});

export async function saveBusinessSettingsAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const parsed = businessSettingsSchema.parse(Object.fromEntries(formData));

  await updateBusinessSettings(workspace.business.id, {
    brandVoice: parsed.brandVoice,
    signoffName: parsed.signoffName,
    escalationMessage: parsed.escalationMessage,
    defaultReplyStyle: parsed.defaultReplyStyle,
    allowedPromises: csvToArray(parsed.allowedPromises ?? null),
    bannedPhrases: csvToArray(parsed.bannedPhrases ?? null),
    notificationEmails: csvToArray(parsed.notificationEmails ?? null),
    manualReviewRules: csvToArray(parsed.manualReviewRules ?? null)
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'business_settings',
    entityId: workspace.settings.id,
    action: 'update_business_settings',
    metadata: parsed
  });

  revalidatePath('/dashboard/setup');
  revalidatePath('/dashboard/settings');
}

export async function selectGoogleLocationsAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const connectedAccountId = Number(formData.get('connectedAccountId'));
  const locationIds = formData
    .getAll('locationIds')
    .map((value) => String(value))
    .filter(Boolean);

  if (!connectedAccountId || locationIds.length === 0) {
    throw new Error('Select at least one Google location');
  }

  const selectedLocations = await selectGoogleLocationsForBusiness({
    businessId: workspace.business.id,
    connectedAccountId,
    locationIds
  });

  await queueJob({
    jobType: 'sync_reviews',
    idempotencyKey: `sync:${connectedAccountId}:${Date.now()}`,
    payload: {
      connectedAccountId
    }
  });
  await processPendingJobs(10);

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'integration',
    entityId: connectedAccountId,
    action: 'select_google_locations',
    metadata: {
      locationIds,
      selectedCount: selectedLocations.length
    }
  });

  revalidatePath('/dashboard/setup');
  revalidatePath('/dashboard/inbox');
}

export async function syncNowAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const connectedAccountId = Number(formData.get('connectedAccountId'));
  if (!connectedAccountId) {
    throw new Error('Connected account is required');
  }

  await queueJob({
    jobType: 'sync_reviews',
    idempotencyKey: `manual-sync:${connectedAccountId}:${Date.now()}`,
    payload: { connectedAccountId }
  });
  await processPendingJobs(20);

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'integration',
    entityId: connectedAccountId,
    action: 'manual_sync',
    metadata: {}
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/inbox');
}

export async function completeSetupAction() {
  const workspace = await requireWorkspace();
  await completeBusinessOnboarding(workspace.business.id);

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'business',
    entityId: workspace.business.id,
    action: 'complete_onboarding',
    metadata: {}
  });

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function regenerateDraftAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const reviewId = Number(formData.get('reviewId'));
  if (!reviewId) {
    throw new Error('Review ID is required');
  }

  const draft = await generateDraftForReview(reviewId, 'regenerate');

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'reply_draft',
    entityId: draft.id,
    action: 'regenerate_draft',
    metadata: { reviewId }
  });

  revalidatePath(`/dashboard/reviews/${reviewId}`);
  revalidatePath('/dashboard/inbox');
}

export async function approveDraftAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const draftId = Number(formData.get('draftId'));
  const reviewId = Number(formData.get('reviewId'));
  const approvedText = String(formData.get('approvedText') ?? '');

  const draft = await approveDraft({
    draftId,
    userId: workspace.user.id,
    editedText: approvedText || null
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'reply_draft',
    entityId: draft.id,
    action: 'approve_draft',
    metadata: { reviewId }
  });

  revalidatePath(`/dashboard/reviews/${reviewId}`);
  revalidatePath('/dashboard/inbox');
}

export async function rejectDraftAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const draftId = Number(formData.get('draftId'));
  const reviewId = Number(formData.get('reviewId'));
  const reason = String(formData.get('reason') ?? '');

  const draft = await rejectDraft({
    draftId,
    reason: reason || null
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'reply_draft',
    entityId: draft.id,
    action: 'reject_draft',
    metadata: { reviewId, reason }
  });

  revalidatePath(`/dashboard/reviews/${reviewId}`);
  revalidatePath('/dashboard/inbox');
}

export async function markPostedAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const reviewId = Number(formData.get('reviewId'));
  const draftId = Number(formData.get('draftId') || 0);
  const postedText = String(formData.get('postedText') ?? '');

  await markReviewPosted({
    reviewId,
    draftId: draftId || null,
    postedText: postedText || null
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'review',
    entityId: reviewId,
    action: 'mark_posted',
    metadata: {}
  });

  revalidatePath(`/dashboard/reviews/${reviewId}`);
  revalidatePath('/dashboard/inbox');
}

export async function dismissOnboardingAction() {
  const workspace = await requireWorkspace();
  await completeBusinessOnboarding(workspace.business.id);

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'business',
    entityId: workspace.business.id,
    action: 'complete_onboarding',
    metadata: { source: 'checklist_dismiss' }
  });

  revalidatePath('/dashboard');
}
