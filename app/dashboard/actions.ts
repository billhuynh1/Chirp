'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { createAuditLog } from '@/lib/services/audit';
import {
  completeBusinessOnboarding,
  getOnboardingStatus,
  updateBusinessProfile,
  updateBusinessSettings
} from '@/lib/services/businesses';
import {
  isAllowedTimezoneValue,
  normalizeServiceValue,
  normalizeTimezoneValue,
  normalizeUsPhoneToE164
} from '@/lib/validation/business-profile';
import { queueJob } from '@/lib/services/job-queue';
import { processPendingJobs } from '@/lib/services/jobs';
import {
  isDraftGenerationConflictError
} from '@/lib/services/reviews/draft-generation-policy';
import { isAbuseProtectionError } from '@/lib/services/reviews/abuse-protection';
import {
  approveDraft,
  acknowledgeNoReply,
  escalateReview,
  generateDraftForReview,
  getFocusQueueReview,
  markReviewPosted,
  rejectDraft
} from '@/lib/services/reviews';
import { selectGoogleLocationsForBusiness } from '@/lib/services/integrations/google';
import type {
  SetupOnboardingSnapshot,
  SetupStepActionError,
  SetupStepActionResult,
  SetupStepId
} from '@/lib/types/setup-step-action';

function csvToArray(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSetupSuccessRedirect(formData: FormData) {
  const value = formData.get('_successRedirect');
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value, 'http://localhost');
    if (url.origin !== 'http://localhost' || url.pathname !== '/dashboard/setup') {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function isInlineResponseMode(formData: FormData) {
  return formData.get('_responseMode') === 'inline';
}

function getFormData(args: [FormData] | [SetupStepActionResult | null, FormData]) {
  return args.length === 1 ? args[0] : args[1];
}

function toOnboardingSnapshot(status: Awaited<ReturnType<typeof getOnboardingStatus>>): SetupOnboardingSnapshot {
  return {
    completedCount: status.completedCount,
    totalCount: status.totalCount,
    allComplete: status.allComplete,
    stepCompletion: {
      businessProfile:
        status.steps.find((step) => step.id === 'business_info')?.isComplete ?? false,
      googleLocations:
        status.steps.find((step) => step.id === 'connect_google')?.isComplete ?? false,
      draftingDefaults:
        status.steps.find((step) => step.id === 'drafting_defaults')?.isComplete ?? false
    }
  };
}

async function getSetupOnboardingSnapshot(businessId: number) {
  const status = await getOnboardingStatus(businessId);
  return toOnboardingSnapshot(status);
}

async function buildInlineErrorResult(
  businessId: number,
  step: SetupStepId,
  errorCode: SetupStepActionError['errorCode'],
  message: string
): Promise<SetupStepActionError> {
  return {
    ok: false,
    step,
    errorCode,
    message,
    onboarding: await getSetupOnboardingSnapshot(businessId)
  };
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
  vertical: z.string().trim().min(1).max(80),
  primaryPhone: z.string().max(40).optional(),
  website: z.string().max(255).optional(),
  timezone: z.string().min(2).max(80),
  reviewContactEmail: z.string().email().optional().or(z.literal(''))
});

export async function saveBusinessProfileAction(
  ...args: [FormData] | [SetupStepActionResult | null, FormData]
) {
  const formData = getFormData(args);
  const workspace = await requireWorkspace();
  const isInline = isInlineResponseMode(formData);
  const successRedirect = getSetupSuccessRedirect(formData);
  const parsedResult = businessProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    if (isInline) {
      return buildInlineErrorResult(
        workspace.business.id,
        'business-profile',
        'invalid-input',
        'Business profile input is invalid. Check required fields and try again.'
      );
    }
    throw parsedResult.error;
  }
  const parsed = parsedResult.data;
  const normalizedService = normalizeServiceValue(parsed.vertical);
  const normalizedTimezone = normalizeTimezoneValue(parsed.timezone);
  const normalizedPhone = normalizeUsPhoneToE164(parsed.primaryPhone ?? null);
  if (!normalizedService) {
    if (isInline) {
      return buildInlineErrorResult(
        workspace.business.id,
        'business-profile',
        'invalid-service',
        'Service is invalid. Use plumbing for now.'
      );
    }
    redirect('/dashboard/setup?error=invalid-service');
  }
  if (!normalizedTimezone || !isAllowedTimezoneValue(normalizedTimezone)) {
    if (isInline) {
      return buildInlineErrorResult(
        workspace.business.id,
        'business-profile',
        'invalid-timezone',
        'Timezone is invalid. Select one of the available options.'
      );
    }
    redirect('/dashboard/setup?error=invalid-timezone');
  }
  if (parsed.primaryPhone && !normalizedPhone) {
    if (isInline) {
      return buildInlineErrorResult(
        workspace.business.id,
        'business-profile',
        'invalid-phone',
        'Primary phone is invalid. Enter a valid US phone number.'
      );
    }
    redirect('/dashboard/setup?error=invalid-phone');
  }

  await updateBusinessProfile(workspace.business.id, {
    name: parsed.name,
    vertical: normalizedService,
    primaryPhone: normalizedPhone,
    website: parsed.website || null,
    timezone: normalizedTimezone,
    reviewContactEmail: parsed.reviewContactEmail || null
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'business',
    entityId: workspace.business.id,
    action: 'update_business_profile',
    metadata: {
      ...parsed,
      vertical: normalizedService,
      timezone: normalizedTimezone,
      primaryPhone: normalizedPhone
    }
  });

  revalidatePath('/dashboard/setup');
  revalidatePath('/dashboard/settings');
  if (isInline) {
    return {
      ok: true,
      step: 'business-profile',
      onboarding: await getSetupOnboardingSnapshot(workspace.business.id),
      summary: {
        business: {
          service: normalizedService,
          timezone: normalizedTimezone,
          primaryPhone: normalizedPhone,
          website: parsed.website || null
        }
      }
    } satisfies SetupStepActionResult;
  }
  if (successRedirect) {
    redirect(successRedirect);
  }
}

const businessSettingsSchema = z.object({
  brandVoice: z.string().min(10).max(1000),
  signoffName: z.string().min(2).max(120),
  escalationMessage: z.string().min(10).max(500),
  defaultReplyStyle: z.string().min(2).max(50),
  draftGenerationMode: z
    .enum(['hybrid_risk_gated', 'manual_only'])
    .optional()
    .default('hybrid_risk_gated'),
  focusQueueEnabled: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  allowedPromises: z.string().optional(),
  bannedPhrases: z.string().optional(),
  notificationEmails: z.string().optional(),
  manualReviewRules: z.string().optional()
});

export async function saveBusinessSettingsAction(
  ...args: [FormData] | [SetupStepActionResult | null, FormData]
) {
  const formData = getFormData(args);
  const workspace = await requireWorkspace();
  const isInline = isInlineResponseMode(formData);
  const successRedirect = getSetupSuccessRedirect(formData);
  const parsedResult = businessSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    if (isInline) {
      return buildInlineErrorResult(
        workspace.business.id,
        'drafting-defaults',
        'invalid-input',
        'Drafting defaults are invalid. Check required fields and try again.'
      );
    }
    throw parsedResult.error;
  }
  const parsed = parsedResult.data;

  await updateBusinessSettings(workspace.business.id, {
    brandVoice: parsed.brandVoice,
    signoffName: parsed.signoffName,
    escalationMessage: parsed.escalationMessage,
    defaultReplyStyle: parsed.defaultReplyStyle,
    draftGenerationMode: parsed.draftGenerationMode,
    focusQueueEnabled: parsed.focusQueueEnabled,
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
  if (isInline) {
    return {
      ok: true,
      step: 'drafting-defaults',
      onboarding: await getSetupOnboardingSnapshot(workspace.business.id),
      summary: {
        drafting: {
          signoffName: parsed.signoffName,
          defaultReplyStyle: parsed.defaultReplyStyle,
          draftGenerationMode: parsed.draftGenerationMode,
          focusQueueEnabled: parsed.focusQueueEnabled ?? workspace.settings.focusQueueEnabled
        }
      }
    } satisfies SetupStepActionResult;
  }
  if (successRedirect) {
    redirect(successRedirect);
  }
}

export async function selectGoogleLocationsAction(
  ...args: [FormData] | [SetupStepActionResult | null, FormData]
) {
  const formData = getFormData(args);
  const workspace = await requireWorkspace();
  const isInline = isInlineResponseMode(formData);
  const successRedirect = getSetupSuccessRedirect(formData);
  const connectedAccountId = Number(formData.get('connectedAccountId'));
  const locationIds = formData
    .getAll('locationIds')
    .map((value) => String(value))
    .filter(Boolean);

  if (!connectedAccountId || locationIds.length === 0) {
    if (isInline) {
      return buildInlineErrorResult(
        workspace.business.id,
        'google-locations',
        'invalid-locations',
        'Select at least one Google location.'
      );
    }
    throw new Error('Select at least one Google location');
  }
  let selectedLocations;
  try {
    selectedLocations = await selectGoogleLocationsForBusiness({
      businessId: workspace.business.id,
      connectedAccountId,
      locationIds
    });
  } catch (error) {
    if (isInline) {
      const message = error instanceof Error ? error.message : 'Unable to save locations.';
      return buildInlineErrorResult(
        workspace.business.id,
        'google-locations',
        'server-error',
        message
      );
    }
    throw error;
  }

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
  if (isInline) {
    return {
      ok: true,
      step: 'google-locations',
      onboarding: await getSetupOnboardingSnapshot(workspace.business.id),
      summary: {
        google: {
          selectedLocationIds: locationIds,
          selectedLocationsCount: selectedLocations.length,
          connectionStatus: workspace.connectedAccount?.status ?? 'active'
        }
      }
    } satisfies SetupStepActionResult;
  }
  if (successRedirect) {
    redirect(successRedirect);
  }
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
  if (workspace.business.onboardingCompletedAt) {
    revalidatePath('/dashboard');
    redirect('/dashboard');
  }

  const onboardingStatus = await getOnboardingStatus(workspace.business.id);
  if (!onboardingStatus.allComplete) {
    redirect('/dashboard/setup?error=incomplete-onboarding');
  }

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
  const generationReason = String(formData.get('generationReason') ?? 'regenerate');
  if (!reviewId) {
    throw new Error('Review ID is required');
  }

  let draft;
  try {
    draft = await generateDraftForReview(reviewId, generationReason);
  } catch (error) {
    if (isAbuseProtectionError(error)) {
      redirect(`/dashboard/reviews/${reviewId}?draftError=${error.code}`);
    }

    if (isDraftGenerationConflictError(error)) {
      redirect(`/dashboard/reviews/${reviewId}?draftError=${error.code}`);
    }
    throw error;
  }

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'reply_draft',
    entityId: draft.id,
    action: 'regenerate_draft',
    metadata: { reviewId, generationReason }
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
  revalidatePath('/dashboard/setup');
}

export async function acknowledgeNoReplyAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const reviewId = Number(formData.get('reviewId'));
  if (!reviewId) {
    throw new Error('Review ID is required');
  }

  const review = await acknowledgeNoReply({
    businessId: workspace.business.id,
    reviewId
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'review',
    entityId: review.id,
    action: 'acknowledge_no_reply',
    metadata: {}
  });

  revalidatePath('/dashboard/inbox');
  revalidatePath(`/dashboard/reviews/${reviewId}`);
}

export async function escalateReviewAction(formData: FormData) {
  const workspace = await requireWorkspace();
  const reviewId = Number(formData.get('reviewId'));
  if (!reviewId) {
    throw new Error('Review ID is required');
  }

  const review = await escalateReview({
    businessId: workspace.business.id,
    reviewId
  });

  await createAuditLog({
    teamId: workspace.team.id,
    businessId: workspace.business.id,
    userId: workspace.user.id,
    entityType: 'review',
    entityId: review.id,
    action: 'escalate_review',
    metadata: {}
  });

  revalidatePath('/dashboard/inbox');
  revalidatePath(`/dashboard/reviews/${reviewId}`);
}

export async function getFocusQueueAction() {
  const workspace = await requireWorkspace();
  return getFocusQueueReview(workspace.business.id);
}
