import { expect, test } from '@playwright/test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db/drizzle';
import {
  analyzeStoredReview,
  generateDraftForReview
} from '../../lib/services/reviews';
import {
  businessSettings,
  businesses,
  locations,
  reviewAnalysis,
  replyDrafts,
  reviews,
  teamMembers,
  users
} from '../../lib/db/schema';

async function createReviewFixture(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error('Fixture user not found');
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);
  if (!membership) {
    throw new Error('Fixture membership not found');
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.teamId, membership.teamId))
    .limit(1);
  if (!business) {
    throw new Error('Fixture business not found');
  }

  const [location] = await db
    .insert(locations)
    .values({
      businessId: business.id,
      externalLocationId: `loc-${Date.now()}`,
      name: 'Smoke Test Location',
      status: 'active'
    })
    .returning();

  const now = new Date();
  const [review] = await db
    .insert(reviews)
    .values({
      locationId: location.id,
      externalReviewId: `review-${Date.now()}`,
      provider: 'google_business_profile',
      starRating: 5,
      reviewText: 'Great service and fast fix. Thank you!',
      reviewCreatedAt: now,
      reviewUpdatedAt: now,
      payloadHash: `hash-${Date.now()}`,
      rawPayload: {},
      workflowStatus: 'analyzed',
      priority: 'low',
      needsAttention: false
    })
    .returning();

  await db.insert(reviewAnalysis).values({
    reviewId: review.id,
    sentiment: 'positive',
    urgency: 'low',
    riskLevel: 'low',
    issueTags: [],
    summary: 'Positive review for fast service.',
    actionRecommendation: 'publish_safe_reply',
    confidence: 90,
    requiresManualReview: false,
    analysisVersion: 1,
    isActive: true,
    rawOutput: { source: 'fixture' },
    modelName: 'rules-v1'
  });

  return review.id;
}

async function createUnanalyzedReviewFixture(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error('Fixture user not found');
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);
  if (!membership) {
    throw new Error('Fixture membership not found');
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.teamId, membership.teamId))
    .limit(1);
  if (!business) {
    throw new Error('Fixture business not found');
  }

  const [location] = await db
    .insert(locations)
    .values({
      businessId: business.id,
      externalLocationId: `loc-analysis-${Date.now()}`,
      name: 'Analysis Metadata Location',
      status: 'active'
    })
    .returning();

  const now = new Date();
  const [review] = await db
    .insert(reviews)
    .values({
      locationId: location.id,
      externalReviewId: `review-analysis-${Date.now()}`,
      provider: 'google_business_profile',
      starRating: 5,
      reviewText: 'Fast response and clear communication. Great job.',
      reviewCreatedAt: now,
      reviewUpdatedAt: now,
      payloadHash: `hash-analysis-${Date.now()}`,
      rawPayload: {},
      workflowStatus: 'new',
      priority: 'low',
      needsAttention: false
    })
    .returning();

  return review.id;
}

async function setFocusQueueFlag(email: string, enabled: boolean) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error('Fixture user not found');
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);
  if (!membership) {
    throw new Error('Fixture membership not found');
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.teamId, membership.teamId))
    .limit(1);
  if (!business) {
    throw new Error('Fixture business not found');
  }

  await db
    .update(businessSettings)
    .set({
      focusQueueEnabled: enabled
    })
    .where(eq(businessSettings.businessId, business.id));
}

test('smoke: draft mode setup/settings and review generate/no-reply states', async ({
  page
}) => {
  const email = `qa+hybrid-smoke-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
  const password = 'testpass1234';
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => {
    consoleErrors.push(`pageerror:${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      const isKnownHydrationWarning =
        text.includes("A tree hydrated but some attributes of the server rendered HTML didn't match");

      if (!isKnownHydrationWarning) {
        consoleErrors.push(`console:${text}`);
      }
    }
  });

  await page.goto('/sign-up');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard\/setup/);

  const draftingCard = page.locator('#drafting-defaults');
  await draftingCard.locator('#draftGenerationMode').selectOption('manual_only');
  await draftingCard.getByRole('button', { name: /Save|Saving\.\.\./ }).click();
  await expect(draftingCard.getByText('Step completed')).toBeVisible();

  await page.goto('/dashboard/inbox');
  await expect(page.getByPlaceholder('Search reviews...')).toBeVisible();

  await page.goto('/dashboard/settings');
  await expect(page.locator('#draftGenerationMode')).toBeVisible();
  await page.route('**/dashboard/settings', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await route.continue();
  });
  await page.locator('#focusQueueEnabled').selectOption('true');
  await page.locator('#draftGenerationMode').selectOption('hybrid_risk_gated');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('button', { name: 'Saving settings...' })).toBeVisible();
  await expect(page.locator('#focusQueueEnabled')).toHaveValue('true');

  const reviewId = await createReviewFixture(email);

  await page.route('**/api/reviews/*/drafts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        draft: {
          draftText: 'Mock regenerated draft for list view smoke check.',
          tone: 'professional',
          ctaType: 'none',
          safetyNotes: ['No invented facts.']
        }
      })
    });
  });

  await page.goto('/dashboard/inbox?view=list');
  await expect(page.getByRole('button', { name: 'Regenerate Draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Regenerate Draft' }).click();
  await expect(page.getByText('Draft regenerated')).toBeVisible();

  await page.goto(`/dashboard/reviews/${reviewId}`);
  await expect(page.getByRole('button', { name: 'Generate draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate draft' }).click();
  await expect(page.getByRole('button', { name: 'Approve draft' })).toBeVisible();

  await page.route('**/api/reply-drafts/*/regenerate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        draft: {
          draftText: 'Mock regenerated draft for focus queue smoke check.',
          tone: 'professional',
          ctaType: 'none',
          safetyNotes: ['No invented facts.']
        }
      })
    });
  });

  await page.goto('/dashboard/inbox?view=focus');
  await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible();
  await page.getByRole('button', { name: 'Regenerate' }).click();
  await expect(page.getByText('Draft regenerated')).toBeVisible();

  const [generatedDraftRow] = await db
    .select({
      generationMetadata: replyDrafts.generationMetadata
    })
    .from(replyDrafts)
    .where(and(eq(replyDrafts.reviewId, reviewId), eq(replyDrafts.isActive, true)))
    .limit(1);
  expect(typeof generatedDraftRow?.generationMetadata).toBe('object');
  expect(
    (generatedDraftRow?.generationMetadata as { source?: unknown } | undefined)?.source
  ).toBeTruthy();

  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  const metadataReviewId = await createUnanalyzedReviewFixture(email);
  try {
    process.env.OPENAI_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          model: 'gpt-4o-mini-2026-03-01',
          usage: {
            prompt_tokens: 88,
            completion_tokens: 22,
            total_tokens: 110
          },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sentiment: 'positive',
                  urgency: 'low',
                  riskLevel: 'low',
                  issueTags: [],
                  summary: 'Customer praised communication and speed.',
                  actionRecommendation: 'publish_safe_reply',
                  confidence: 93,
                  requiresManualReview: false
                })
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const analysisRecord = await analyzeStoredReview(metadataReviewId, {
      bypassAbuseProtection: true
    });
    const analysisRawOutput = analysisRecord.rawOutput as {
      source?: string;
      promptVersion?: string;
      usage?: { totalTokens?: number };
    };

    expect(analysisRawOutput.source).toBe('openai');
    expect(analysisRawOutput.promptVersion).toBe('analysis-v3-compact-offtopic-gate');
    expect(analysisRawOutput.usage?.totalTokens).toBe(110);

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          model: 'gpt-4o-mini-2026-03-02',
          usage: {
            prompt_tokens: 75,
            completion_tokens: 20,
            total_tokens: 95
          },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  draftText:
                    'Thank you for your review. We appreciate your kind feedback.\n\nThe Team',
                  tone: 'warm_professional',
                  ctaType: 'none',
                  safetyNotes: ['No invented facts.']
                })
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const draftRecord = await generateDraftForReview(metadataReviewId, 'manual', {
      bypassAbuseProtection: true
    });
    const draftMetadata = draftRecord.generationMetadata as {
      source?: string;
      promptVersion?: string;
      usage?: { totalTokens?: number };
    };
    expect(draftMetadata.source).toBe('openai');
    expect(draftMetadata.promptVersion).toBe('draft-v3-compact-personalized');
    expect(draftMetadata.usage?.totalTokens).toBe(95);

    await db
      .update(reviews)
      .set({
        workflowStatus: 'posted_manual',
        needsAttention: false
      })
      .where(eq(reviews.id, metadataReviewId));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }

  await db
    .update(reviewAnalysis)
    .set({
      actionRecommendation: 'skip_reply'
    })
    .where(and(eq(reviewAnalysis.reviewId, reviewId), eq(reviewAnalysis.isActive, true)));

  await page.goto(`/dashboard/reviews/${reviewId}`);
  await expect(page.getByText('No public reply recommended for this review.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate draft' })).toHaveCount(0);

  await db
    .update(reviews)
    .set({
      workflowStatus: 'analyzed'
    })
    .where(eq(reviews.id, reviewId));
  await db
    .update(replyDrafts)
    .set({
      isActive: false
    })
    .where(eq(replyDrafts.reviewId, reviewId));

  await setFocusQueueFlag(email, true);
  await page.goto('/dashboard/inbox');
  await expect(page.getByRole('heading', { name: 'Reviews Inbox' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acknowledge no-reply' })).toBeVisible();
  await page.getByRole('button', { name: 'Acknowledge no-reply' }).click();
  await expect(page.getByText('You are all caught up')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
