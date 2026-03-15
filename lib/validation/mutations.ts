import { z } from 'zod';

const positiveIntSchema = z.coerce.number().int().positive();

const nonEmptyUpdate = <S extends z.ZodRawShape>(schema: z.ZodObject<S>) =>
  schema.refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.'
  });

export const createDraftBodySchema = z
  .object({
    generationReason: z.enum(['manual', 'regenerate']).optional()
  })
  .default({});

export const approveDraftBodySchema = z.object({
  approvedText: z.string().max(5000).optional().nullable()
});

export const rejectDraftBodySchema = z.object({
  reason: z.string().max(1000).optional().nullable()
});

export const markPostedBodySchema = z.object({
  draftId: positiveIntSchema.optional().nullable(),
  postedText: z.string().max(5000).optional().nullable()
});

export const updateBusinessProfileMutationSchema = nonEmptyUpdate(
  z
    .object({
      name: z.string().trim().min(2).max(160).optional(),
      vertical: z.string().trim().min(1).max(80).optional(),
      primaryPhone: z.string().trim().max(40).optional().nullable(),
      website: z.string().trim().max(255).optional().nullable(),
      timezone: z.string().trim().min(2).max(80).optional(),
      reviewContactEmail: z.string().email().optional().nullable(),
      status: z.string().trim().min(1).max(30).optional()
    })
    .strict()
);

export const updateBusinessSettingsMutationSchema = nonEmptyUpdate(
  z
    .object({
      brandVoice: z.string().min(10).max(1000).optional(),
      signoffName: z.string().min(2).max(120).optional(),
      escalationMessage: z.string().min(10).max(500).optional(),
      defaultReplyStyle: z.string().min(2).max(50).optional(),
      draftGenerationMode: z.enum(['hybrid_risk_gated', 'manual_only']).optional(),
      focusQueueEnabled: z.boolean().optional(),
      allowedPromises: z.array(z.string().min(1).max(200)).optional(),
      bannedPhrases: z.array(z.string().min(1).max(200)).optional(),
      notificationEmails: z.array(z.string().email()).optional(),
      language: z.string().min(2).max(20).optional(),
      manualReviewRules: z.array(z.string().min(1).max(100)).optional()
    })
    .strict()
);

export const selectGoogleLocationsBodySchema = z.object({
  connectedAccountId: positiveIntSchema,
  locationIds: z.array(z.string().trim().min(1)).min(1)
});
