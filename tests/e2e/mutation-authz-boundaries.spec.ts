import { expect, test, type Browser, type Page } from '@playwright/test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db/drizzle';
import {
  businesses,
  locations,
  reviewAnalysis,
  replyDrafts,
  reviews,
  teamMembers,
  users
} from '../../lib/db/schema';

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/sign-up');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard\/setup/);
}

async function createSignedInPage(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, email, password);
  return { context, page };
}

async function getBusinessFixture(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error(`Fixture user not found for ${email}`);
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);
  if (!membership) {
    throw new Error(`Fixture membership not found for ${email}`);
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.teamId, membership.teamId))
    .limit(1);
  if (!business) {
    throw new Error(`Fixture business not found for ${email}`);
  }

  return { user, membership, business };
}

async function createReviewAndDraftFixture(email: string) {
  const { business } = await getBusinessFixture(email);
  const token = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const now = new Date();

  const [location] = await db
    .insert(locations)
    .values({
      businessId: business.id,
      externalLocationId: `mutation-loc-${token}`,
      name: 'Mutation Authz Test Location',
      status: 'active'
    })
    .returning();

  const [review] = await db
    .insert(reviews)
    .values({
      locationId: location.id,
      provider: 'google_business_profile',
      externalReviewId: `mutation-review-${token}`,
      reviewerName: 'Test Customer',
      starRating: 4,
      reviewText: 'Quick service and clean work.',
      reviewCreatedAt: now,
      reviewUpdatedAt: now,
      payloadHash: `mutation-hash-${token}`,
      rawPayload: {},
      workflowStatus: 'draft_ready',
      priority: 'low',
      needsAttention: false
    })
    .returning();

  const [analysis] = await db
    .insert(reviewAnalysis)
    .values({
      reviewId: review.id,
      sentiment: 'positive',
      urgency: 'low',
      riskLevel: 'low',
      issueTags: [],
      summary: 'Positive service feedback.',
      actionRecommendation: 'publish_safe_reply',
      confidence: 90,
      requiresManualReview: false,
      analysisVersion: 1,
      isActive: true,
      rawOutput: { source: 'fixture' },
      modelName: 'rules-v1'
    })
    .returning();

  const [draft] = await db
    .insert(replyDrafts)
    .values({
      reviewId: review.id,
      analysisId: analysis.id,
      draftText: 'Thank you for the feedback.\n\nThe Team',
      tone: 'professional',
      ctaType: 'none',
      safetyNotes: [],
      generationMetadata: { source: 'fixture' },
      generationReason: 'manual',
      draftStatus: 'generated',
      version: 1,
      isActive: true
    })
    .returning();

  return { reviewId: review.id, draftId: draft.id, businessId: business.id };
}

test('mutation routes reject invalid path params with structured 400', async ({
  browser
}) => {
  const email = `qa+mutation-invalid-${Date.now()}@example.com`;
  const password = 'testpass1234';
  const { context, page } = await createSignedInPage(browser, email, password);

  const response = await page.request.post('/api/reviews/not-a-number/mark-posted', {
    data: { postedText: 'Thanks!' }
  });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'invalid_input',
      message: 'reviewId must be a positive integer.'
    }
  });

  await context.close();
});

test('mutation routes reject unknown generationReason with structured 400', async ({
  browser
}) => {
  const email = `qa+mutation-generation-${Date.now()}@example.com`;
  const password = 'testpass1234';
  const { context, page } = await createSignedInPage(browser, email, password);

  const response = await page.request.post('/api/reviews/1/drafts', {
    data: {
      generationReason: 'unexpected_reason'
    }
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'invalid_input',
      message: 'Request body validation failed.'
    }
  });

  await context.close();
});

test('cross-tenant review and draft mutations are blocked with 403 and no state change', async ({
  browser
}) => {
  const password = 'testpass1234';
  const ownerEmail = `qa+mutation-owner-${Date.now()}@example.com`;
  const foreignEmail = `qa+mutation-foreign-${Date.now()}@example.com`;

  const ownerSession = await createSignedInPage(browser, ownerEmail, password);
  const foreignSession = await createSignedInPage(browser, foreignEmail, password);
  const foreignFixture = await createReviewAndDraftFixture(foreignEmail);

  const markPostedResponse = await ownerSession.page.request.post(
    `/api/reviews/${foreignFixture.reviewId}/mark-posted`,
    { data: { postedText: 'Cross-tenant mutate attempt' } }
  );
  expect(markPostedResponse.status()).toBe(403);
  await expect(markPostedResponse.json()).resolves.toMatchObject({
    error: {
      code: 'forbidden_scope'
    }
  });

  const approveResponse = await ownerSession.page.request.post(
    `/api/reply-drafts/${foreignFixture.draftId}/approve`,
    { data: { approvedText: 'Cross-tenant approve attempt' } }
  );
  expect(approveResponse.status()).toBe(403);
  await expect(approveResponse.json()).resolves.toMatchObject({
    error: {
      code: 'forbidden_scope'
    }
  });

  const [reviewAfter] = await db
    .select({
      workflowStatus: reviews.workflowStatus,
      ownerReplyText: reviews.ownerReplyText
    })
    .from(reviews)
    .where(eq(reviews.id, foreignFixture.reviewId))
    .limit(1);
  expect(reviewAfter?.workflowStatus).toBe('draft_ready');
  expect(reviewAfter?.ownerReplyText).toBeNull();

  const [draftAfter] = await db
    .select({
      draftStatus: replyDrafts.draftStatus,
      approvedByUserId: replyDrafts.approvedByUserId
    })
    .from(replyDrafts)
    .where(eq(replyDrafts.id, foreignFixture.draftId))
    .limit(1);
  expect(draftAfter?.draftStatus).toBe('generated');
  expect(draftAfter?.approvedByUserId).toBeNull();

  await ownerSession.context.close();
  await foreignSession.context.close();
});

test('member role is blocked from owner-only escalation controls', async ({ browser }) => {
  const email = `qa+mutation-member-${Date.now()}@example.com`;
  const password = 'testpass1234';
  const session = await createSignedInPage(browser, email, password);
  const fixture = await createReviewAndDraftFixture(email);
  const { user, membership } = await getBusinessFixture(email);

  await db
    .update(teamMembers)
    .set({ role: 'member' })
    .where(and(eq(teamMembers.id, membership.id), eq(teamMembers.userId, user.id)));

  const response = await session.page.request.post(
    `/api/reviews/${fixture.reviewId}/escalate`
  );

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: 'forbidden',
      message: 'Owner role is required for this action.'
    }
  });

  await session.context.close();
});

test('draft approve mutation is idempotent on repeated request payloads', async ({
  browser
}) => {
  const email = `a${Date.now()}${Math.floor(Math.random() * 10_000)}@example.com`;
  const password = 'testpass1234';
  const session = await createSignedInPage(browser, email, password);
  const fixture = await createReviewAndDraftFixture(email);

  const firstResponse = await session.page.request.post(
    `/api/reply-drafts/${fixture.draftId}/approve`,
    { data: { approvedText: 'Thanks for choosing our plumbing team.' } }
  );
  expect(firstResponse.status()).toBe(200);

  const [draftAfterFirst] = await db
    .select({
      draftStatus: replyDrafts.draftStatus,
      draftText: replyDrafts.draftText,
      approvedAt: replyDrafts.approvedAt,
      updatedAt: replyDrafts.updatedAt
    })
    .from(replyDrafts)
    .where(eq(replyDrafts.id, fixture.draftId))
    .limit(1);
  expect(draftAfterFirst?.draftStatus).toBe('edited');
  expect(draftAfterFirst?.approvedAt).toBeTruthy();

  await new Promise((resolve) => setTimeout(resolve, 30));

  const secondResponse = await session.page.request.post(
    `/api/reply-drafts/${fixture.draftId}/approve`,
    { data: { approvedText: 'Thanks for choosing our plumbing team.' } }
  );
  expect(secondResponse.status()).toBe(200);

  const [draftAfterSecond] = await db
    .select({
      draftStatus: replyDrafts.draftStatus,
      draftText: replyDrafts.draftText,
      approvedAt: replyDrafts.approvedAt,
      updatedAt: replyDrafts.updatedAt
    })
    .from(replyDrafts)
    .where(eq(replyDrafts.id, fixture.draftId))
    .limit(1);

  expect(draftAfterSecond?.draftStatus).toBe('edited');
  expect(draftAfterSecond?.draftText).toBe('Thanks for choosing our plumbing team.');
  expect(draftAfterSecond?.approvedAt?.getTime()).toBe(
    draftAfterFirst?.approvedAt?.getTime()
  );
  expect(draftAfterSecond?.updatedAt?.getTime()).toBe(
    draftAfterFirst?.updatedAt?.getTime()
  );

  await session.context.close();
});

test('review escalate mutation is idempotent on repeated requests', async ({ browser }) => {
  const email = `b${Date.now()}${Math.floor(Math.random() * 10_000)}@example.com`;
  const password = 'testpass1234';
  const session = await createSignedInPage(browser, email, password);
  const fixture = await createReviewAndDraftFixture(email);

  const firstResponse = await session.page.request.post(
    `/api/reviews/${fixture.reviewId}/escalate`
  );
  expect(firstResponse.status()).toBe(200);

  const [reviewAfterFirst] = await db
    .select({
      workflowStatus: reviews.workflowStatus,
      needsAttention: reviews.needsAttention,
      assignedUserId: reviews.assignedUserId,
      escalatedAt: reviews.escalatedAt,
      updatedAt: reviews.updatedAt
    })
    .from(reviews)
    .where(eq(reviews.id, fixture.reviewId))
    .limit(1);
  expect(reviewAfterFirst?.workflowStatus).toBe('needs_attention');
  expect(reviewAfterFirst?.needsAttention).toBe(true);
  expect(reviewAfterFirst?.assignedUserId).toBeTruthy();
  expect(reviewAfterFirst?.escalatedAt).toBeTruthy();

  await new Promise((resolve) => setTimeout(resolve, 30));

  const secondResponse = await session.page.request.post(
    `/api/reviews/${fixture.reviewId}/escalate`
  );
  expect(secondResponse.status()).toBe(200);

  const [reviewAfterSecond] = await db
    .select({
      workflowStatus: reviews.workflowStatus,
      needsAttention: reviews.needsAttention,
      assignedUserId: reviews.assignedUserId,
      escalatedAt: reviews.escalatedAt,
      updatedAt: reviews.updatedAt
    })
    .from(reviews)
    .where(eq(reviews.id, fixture.reviewId))
    .limit(1);

  expect(reviewAfterSecond?.workflowStatus).toBe('needs_attention');
  expect(reviewAfterSecond?.needsAttention).toBe(true);
  expect(reviewAfterSecond?.assignedUserId).toBe(reviewAfterFirst?.assignedUserId);
  expect(reviewAfterSecond?.escalatedAt?.getTime()).toBe(
    reviewAfterFirst?.escalatedAt?.getTime()
  );
  expect(reviewAfterSecond?.updatedAt?.getTime()).toBe(
    reviewAfterFirst?.updatedAt?.getTime()
  );

  await session.context.close();
});
