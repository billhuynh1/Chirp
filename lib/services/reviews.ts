import crypto from 'node:crypto';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql
} from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  businessSettings,
  businesses,
  connectedAccounts,
  locations,
  notifications,
  replyDrafts,
  reviewAnalysis,
  reviews,
  teams,
  type Business,
  type BusinessSettings,
  type ConnectedAccount,
  type Location,
  type ReplyDraft,
  type Review,
  type ReviewAnalysis
} from '@/lib/db/schema';
import {
  analyzeReviewWithAI,
  generateReplyDraftWithAI
} from '@/lib/services/ai';
import { queueJob } from '@/lib/services/job-queue';
import { fetchReviewsForLocation } from '@/lib/services/integrations/google';

export type ReviewFilters = {
  locationId?: number;
  status?: string;
  rating?: number;
  urgency?: string;
  search?: string;
};

type ReviewWithContext = Review & {
  location: Location;
  latestAnalysis: ReviewAnalysis | null;
  latestDraft: ReplyDraft | null;
};

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function getBusinessContextForReview(reviewId: number) {
  const reviewRecord = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId)
  });

  if (!reviewRecord) {
    throw new Error('Review not found');
  }

  const location = await db.query.locations.findFirst({
    where: eq(locations.id, reviewRecord.locationId)
  });

  if (!location) {
    throw new Error('Location not found');
  }

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, location.businessId)
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const settings = await db.query.businessSettings.findFirst({
    where: eq(businessSettings.businessId, business.id)
  });

  if (!settings) {
    throw new Error('Business settings not found');
  }

  return { review: reviewRecord, location, business, settings };
}

async function getLatestAnalyses(reviewIds: number[]) {
  if (reviewIds.length === 0) {
    return new Map<number, ReviewAnalysis>();
  }

  const rows = await db
    .select()
    .from(reviewAnalysis)
    .where(and(inArray(reviewAnalysis.reviewId, reviewIds), eq(reviewAnalysis.isActive, true)));

  return new Map(rows.map((row) => [row.reviewId, row]));
}

async function getLatestDrafts(reviewIds: number[]) {
  if (reviewIds.length === 0) {
    return new Map<number, ReplyDraft>();
  }

  const rows = await db
    .select()
    .from(replyDrafts)
    .where(and(inArray(replyDrafts.reviewId, reviewIds), eq(replyDrafts.isActive, true)));

  return new Map(rows.map((row) => [row.reviewId, row]));
}

async function buildReviewRecords(baseReviews: Review[]) {
  const locationIds = [...new Set(baseReviews.map((review) => review.locationId))];
  const reviewIds = baseReviews.map((review) => review.id);

  const [locationRows, analysisMap, draftMap] = await Promise.all([
    db.select().from(locations).where(inArray(locations.id, locationIds)),
    getLatestAnalyses(reviewIds),
    getLatestDrafts(reviewIds)
  ]);

  const locationMap = new Map(locationRows.map((location) => [location.id, location]));

  return baseReviews.map((review) => ({
    ...review,
    location: locationMap.get(review.locationId)!,
    latestAnalysis: analysisMap.get(review.id) ?? null,
    latestDraft: draftMap.get(review.id) ?? null
  }));
}

export async function getDashboardSummary(businessId: number) {
  const businessLocations = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.businessId, businessId));

  const locationIds = businessLocations.map((location) => location.id);
  if (locationIds.length === 0) {
    return {
      newReviews: 0,
      urgentReviews: 0,
      readyToPost: 0,
      postedThisWeek: 0,
      totalLocations: 0
    };
  }

  const [[counts], [urgentCounts]] = await Promise.all([
    db
      .select({
        newReviews: sql<number>`count(*) filter (where ${reviews.workflowStatus} = 'new')`,
        readyToPost: sql<number>`count(*) filter (where ${reviews.workflowStatus} in ('draft_ready', 'approved'))`,
        postedThisWeek: sql<number>`count(*) filter (where ${reviews.workflowStatus} = 'posted_manual' and ${reviews.updatedAt} >= now() - interval '7 days')`
      })
      .from(reviews)
      .where(inArray(reviews.locationId, locationIds)),
    db
      .select({
        urgentReviews: sql<number>`count(distinct ${reviews.id})`
      })
      .from(reviews)
      .innerJoin(reviewAnalysis, eq(reviewAnalysis.reviewId, reviews.id))
      .where(
        and(
          inArray(reviews.locationId, locationIds),
          eq(reviewAnalysis.isActive, true),
          inArray(reviewAnalysis.urgency, ['high', 'critical'])
        )
      )
  ]);

  return {
    newReviews: Number(counts?.newReviews ?? 0),
    urgentReviews: Number(urgentCounts?.urgentReviews ?? 0),
    readyToPost: Number(counts?.readyToPost ?? 0),
    postedThisWeek: Number(counts?.postedThisWeek ?? 0),
    totalLocations: locationIds.length
  };
}

export async function listBusinessReviews(
  businessId: number,
  filters: ReviewFilters = {}
) {
  const businessLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.businessId, businessId));

  const locationIds = businessLocations.map((location) => location.id);
  if (locationIds.length === 0) {
    return [] as ReviewWithContext[];
  }

  const predicates = [inArray(reviews.locationId, locationIds)];

  if (filters.locationId) {
    predicates.push(eq(reviews.locationId, filters.locationId));
  }
  if (filters.status) {
    predicates.push(eq(reviews.workflowStatus, filters.status));
  }
  if (filters.rating) {
    predicates.push(eq(reviews.starRating, filters.rating));
  }
  if (filters.search) {
    predicates.push(
      or(
        ilike(reviews.reviewText, `%${filters.search}%`),
        ilike(reviews.reviewerName, `%${filters.search}%`)
      )!
    );
  }

  let rows = await db
    .select()
    .from(reviews)
    .where(and(...predicates))
    .orderBy(desc(reviews.reviewCreatedAt))
    .limit(100);

  rows = await maybeFilterByUrgency(rows, filters.urgency);

  return buildReviewRecords(rows);
}

async function maybeFilterByUrgency(rows: Review[], urgency?: string) {
  if (!urgency || rows.length === 0) {
    return rows;
  }

  const analyses = await getLatestAnalyses(rows.map((row) => row.id));
  if (urgency === 'urgent') {
    return rows.filter((row) => {
      const analysisUrgency = analyses.get(row.id)?.urgency;
      return analysisUrgency === 'high' || analysisUrgency === 'critical';
    });
  }

  return rows.filter((row) => analyses.get(row.id)?.urgency === urgency);
}

export async function getReviewDetail(businessId: number, reviewId: number) {
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId)
  });

  if (!review) {
    return null;
  }

  const location = await db.query.locations.findFirst({
    where: and(eq(locations.id, review.locationId), eq(locations.businessId, businessId))
  });

  if (!location) {
    return null;
  }

  const [business, settings, analyses, drafts] = await Promise.all([
    db.query.businesses.findFirst({
      where: eq(businesses.id, businessId)
    }),
    db.query.businessSettings.findFirst({
      where: eq(businessSettings.businessId, businessId)
    }),
    db
      .select()
      .from(reviewAnalysis)
      .where(eq(reviewAnalysis.reviewId, reviewId))
      .orderBy(desc(reviewAnalysis.analysisVersion)),
    db
      .select()
      .from(replyDrafts)
      .where(eq(replyDrafts.reviewId, reviewId))
      .orderBy(desc(replyDrafts.version))
  ]);

  return {
    review,
    location,
    business: business!,
    settings: settings!,
    analyses,
    drafts,
    latestAnalysis: analyses[0] ?? null,
    latestDraft: drafts[0] ?? null
  };
}

export async function syncConnectedAccountReviews(connectedAccountId: number) {
  const account = await db.query.connectedAccounts.findFirst({
    where: eq(connectedAccounts.id, connectedAccountId)
  });

  if (!account) {
    throw new Error('Connected account not found');
  }

  const accountLocations = await db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.connectedAccountId, account.id),
        eq(locations.status, 'active')
      )
    );

  let importedCount = 0;

  for (const location of accountLocations) {
    const fetchedReviews = await fetchReviewsForLocation(account, location);

    for (const review of fetchedReviews) {
      const payloadHash = hashPayload(review.rawPayload);
      const [existing] = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.locationId, location.id),
            eq(reviews.externalReviewId, review.externalReviewId),
            eq(reviews.provider, 'google_business_profile')
          )
        )
        .limit(1);

      if (existing && existing.payloadHash === payloadHash) {
        continue;
      }

      if (existing) {
        const [updated] = await db
          .update(reviews)
          .set({
            reviewerName: review.reviewerName,
            reviewerPhotoUrl: review.reviewerPhotoUrl,
            starRating: review.starRating,
            reviewText: review.reviewText,
            reviewCreatedAt: review.reviewCreatedAt,
            reviewUpdatedAt: review.reviewUpdatedAt,
            ownerReplyText: review.ownerReplyText,
            ownerReplyUpdatedAt: review.ownerReplyUpdatedAt,
            hasOwnerReply: Boolean(review.ownerReplyText),
            sourceUrl: review.sourceUrl,
            payloadHash,
            rawPayload: review.rawPayload,
            workflowStatus: 'new',
            priority: existing.priority,
            needsAttention: false,
            updatedAt: new Date()
          })
          .where(eq(reviews.id, existing.id))
          .returning();

        await queueJob({
          jobType: 'analyze_review',
          idempotencyKey: `analyze:${updated.id}:${payloadHash}`,
          payload: { reviewId: updated.id, payloadHash }
        });
      } else {
        const [created] = await db
          .insert(reviews)
          .values({
            locationId: location.id,
            provider: 'google_business_profile',
            externalReviewId: review.externalReviewId,
            reviewerName: review.reviewerName,
            reviewerPhotoUrl: review.reviewerPhotoUrl,
            starRating: review.starRating,
            reviewText: review.reviewText,
            reviewCreatedAt: review.reviewCreatedAt,
            reviewUpdatedAt: review.reviewUpdatedAt,
            ownerReplyText: review.ownerReplyText,
            ownerReplyUpdatedAt: review.ownerReplyUpdatedAt,
            hasOwnerReply: Boolean(review.ownerReplyText),
            sourceUrl: review.sourceUrl,
            payloadHash,
            rawPayload: review.rawPayload,
            workflowStatus: 'new',
            priority: review.starRating <= 2 ? 'high' : 'low',
            needsAttention: review.starRating <= 2
          })
          .returning();

        await queueJob({
          jobType: 'analyze_review',
          idempotencyKey: `analyze:${created.id}:${payloadHash}`,
          payload: { reviewId: created.id, payloadHash }
        });
      }

      importedCount += 1;
    }

    await db
      .update(locations)
      .set({
        lastSyncedAt: new Date(),
        syncError: null,
        updatedAt: new Date()
      })
      .where(eq(locations.id, location.id));
  }

  await db
    .update(connectedAccounts)
    .set({
      lastSyncAt: new Date(),
      status: 'active',
      lastError: null,
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, connectedAccountId));

  return {
    importedCount,
    locationCount: accountLocations.length
  };
}

export async function analyzeStoredReview(reviewId: number) {
  const { review, business, settings } = await getBusinessContextForReview(reviewId);
  const analysis = await analyzeReviewWithAI(review);

  const existingVersions = await db
    .select({
      version: reviewAnalysis.analysisVersion
    })
    .from(reviewAnalysis)
    .where(eq(reviewAnalysis.reviewId, reviewId))
    .orderBy(desc(reviewAnalysis.analysisVersion))
    .limit(1);

  await db
    .update(reviewAnalysis)
    .set({
      isActive: false
    })
    .where(eq(reviewAnalysis.reviewId, reviewId));

  const [createdAnalysis] = await db
    .insert(reviewAnalysis)
    .values({
      reviewId,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      riskLevel: analysis.riskLevel,
      issueTags: analysis.issueTags,
      summary: analysis.summary,
      actionRecommendation: analysis.actionRecommendation,
      confidence: analysis.confidence,
      requiresManualReview: analysis.requiresManualReview,
      analysisVersion: (existingVersions[0]?.version ?? 0) + 1,
      isActive: true,
      rawOutput: analysis.rawOutput,
      modelName: analysis.modelName
    })
    .returning();

  const workflowStatus = analysis.requiresManualReview
    ? 'needs_attention'
    : analysis.actionRecommendation === 'skip_reply'
    ? 'analyzed'
    : 'analyzed';

  await db
    .update(reviews)
    .set({
      workflowStatus,
      priority: analysis.urgency,
      needsAttention: analysis.requiresManualReview,
      lastProcessedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(reviews.id, reviewId));

  if (analysis.actionRecommendation !== 'skip_reply') {
    await queueJob({
      jobType: 'generate_draft',
      idempotencyKey: `draft:${reviewId}:${createdAnalysis.id}:initial`,
      payload: {
        reviewId,
        analysisId: createdAnalysis.id,
        generationReason: 'initial'
      }
    });
  }

  if (analysis.urgency === 'high' || analysis.urgency === 'critical') {
    const recipients =
      settings.notificationEmails.length > 0
        ? settings.notificationEmails
        : business.reviewContactEmail
        ? [business.reviewContactEmail]
        : [];

    for (const recipient of recipients) {
      const [notification] = await db
        .insert(notifications)
        .values({
          businessId: business.id,
          reviewId,
          type: 'urgent_review',
          channel: 'email',
          recipient,
          subject: `Urgent review for ${business.name}`,
          payload: {
            rating: review.starRating,
            reviewText: review.reviewText,
            urgency: analysis.urgency,
            locationId: review.locationId
          }
        })
        .returning();

      await queueJob({
        jobType: 'send_notification',
        idempotencyKey: `notification:${notification.id}`,
        payload: { notificationId: notification.id }
      });
    }
  }

  return createdAnalysis;
}

export async function generateDraftForReview(
  reviewId: number,
  generationReason = 'manual'
) {
  const { review, business, settings } = await getBusinessContextForReview(reviewId);
  const analysis = await db.query.reviewAnalysis.findFirst({
    where: and(eq(reviewAnalysis.reviewId, reviewId), eq(reviewAnalysis.isActive, true))
  });

  if (!analysis) {
    throw new Error('Review analysis not found');
  }

  const latestVersion = await db
    .select({
      version: replyDrafts.version
    })
    .from(replyDrafts)
    .where(eq(replyDrafts.reviewId, reviewId))
    .orderBy(desc(replyDrafts.version))
    .limit(1);

  await db
    .update(replyDrafts)
    .set({
      isActive: false,
      updatedAt: new Date()
    })
    .where(eq(replyDrafts.reviewId, reviewId));

  const draft = await generateReplyDraftWithAI({
    review,
    business,
    settings,
    analysis
  });

  const [createdDraft] = await db
    .insert(replyDrafts)
    .values({
      reviewId,
      analysisId: analysis.id,
      draftText: draft.draftText,
      tone: draft.tone,
      ctaType: draft.ctaType,
      safetyNotes: draft.safetyNotes,
      generationReason,
      draftStatus: 'generated',
      version: (latestVersion[0]?.version ?? 0) + 1,
      isActive: true
    })
    .returning();

  await db
    .update(reviews)
    .set({
      workflowStatus: analysis.requiresManualReview ? 'needs_attention' : 'draft_ready',
      updatedAt: new Date()
    })
    .where(eq(reviews.id, reviewId));

  return createdDraft;
}

export async function approveDraft({
  draftId,
  userId,
  editedText
}: {
  draftId: number;
  userId: number;
  editedText?: string | null;
}) {
  const draft = await db.query.replyDrafts.findFirst({
    where: eq(replyDrafts.id, draftId)
  });

  if (!draft) {
    throw new Error('Draft not found');
  }

  const [updatedDraft] = await db
    .update(replyDrafts)
    .set({
      draftText: editedText?.trim() ? editedText.trim() : draft.draftText,
      draftStatus: editedText?.trim() ? 'edited' : 'approved',
      approvedByUserId: userId,
      approvedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(replyDrafts.id, draftId))
    .returning();

  await db
    .update(reviews)
    .set({
      workflowStatus: 'approved',
      updatedAt: new Date()
    })
    .where(eq(reviews.id, draft.reviewId));

  return updatedDraft;
}

export async function rejectDraft({
  draftId,
  reason
}: {
  draftId: number;
  reason?: string | null;
}) {
  const draft = await db.query.replyDrafts.findFirst({
    where: eq(replyDrafts.id, draftId)
  });

  if (!draft) {
    throw new Error('Draft not found');
  }

  const [updatedDraft] = await db
    .update(replyDrafts)
    .set({
      draftStatus: 'rejected',
      rejectedReason: reason ?? null,
      updatedAt: new Date()
    })
    .where(eq(replyDrafts.id, draftId))
    .returning();

  await db
    .update(reviews)
    .set({
      workflowStatus: 'rejected',
      needsAttention: true,
      updatedAt: new Date()
    })
    .where(eq(reviews.id, draft.reviewId));

  return updatedDraft;
}

export async function markReviewPosted({
  reviewId,
  draftId,
  postedText
}: {
  reviewId: number;
  draftId?: number | null;
  postedText?: string | null;
}) {
  if (draftId) {
    await db
      .update(replyDrafts)
      .set({
        draftStatus: 'posted_manual',
        postedAt: new Date(),
        postedText: postedText?.trim() || null,
        updatedAt: new Date()
      })
      .where(eq(replyDrafts.id, draftId));
  }

  const [review] = await db
    .update(reviews)
    .set({
      workflowStatus: 'posted_manual',
      hasOwnerReply: true,
      ownerReplyText: postedText?.trim() || null,
      ownerReplyUpdatedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  return review;
}

export async function getReviewAnalytics(businessId: number) {
  const businessLocations = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.businessId, businessId));

  const locationIds = businessLocations.map((location) => location.id);
  if (locationIds.length === 0) {
    return {
      importedReviews: 0,
      generatedDrafts: 0,
      postedReviews: 0
    };
  }

  const [counts] = await db
    .select({
      importedReviews: sql<number>`count(*)`,
      postedReviews: sql<number>`count(*) filter (where ${reviews.workflowStatus} = 'posted_manual')`
    })
    .from(reviews)
    .where(inArray(reviews.locationId, locationIds));

  const [draftCounts] = await db
    .select({
      generatedDrafts: sql<number>`count(*)`
    })
    .from(replyDrafts)
    .leftJoin(reviews, eq(replyDrafts.reviewId, reviews.id))
    .where(inArray(reviews.locationId, locationIds));

  return {
    importedReviews: Number(counts?.importedReviews ?? 0),
    generatedDrafts: Number(draftCounts?.generatedDrafts ?? 0),
    postedReviews: Number(counts?.postedReviews ?? 0)
  };
}
