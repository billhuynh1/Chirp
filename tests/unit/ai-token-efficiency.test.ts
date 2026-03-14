import assert from 'node:assert/strict';
import test from 'node:test';
import type { Business, BusinessSettings, Review } from '../../lib/db/schema.ts';
import {
  analyzeReviewWithAI,
  generateReplyDraftWithAI
} from '../../lib/services/ai.ts';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

function createReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 1,
    locationId: 1,
    provider: 'google_business_profile',
    externalReviewId: 'rev-1',
    reviewerName: 'Alex',
    reviewerPhotoUrl: null,
    starRating: 5,
    reviewText: 'Great team. Fast fix and clean work.',
    reviewCreatedAt: new Date(),
    reviewUpdatedAt: new Date(),
    ownerReplyText: null,
    ownerReplyUpdatedAt: null,
    hasOwnerReply: false,
    sourceUrl: null,
    payloadHash: 'hash',
    rawPayload: {},
    workflowStatus: 'new',
    priority: 'low',
    needsAttention: false,
    assignedUserId: null,
    escalatedAt: null,
    lastProcessedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function createBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 1,
    teamId: 1,
    name: 'QuickFix Plumbing',
    vertical: 'plumbing',
    primaryPhone: null,
    website: null,
    timezone: 'America/Los_Angeles',
    reviewContactEmail: null,
    status: 'trial',
    onboardingCompletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function createSettings(overrides: Partial<BusinessSettings> = {}): BusinessSettings {
  return {
    id: 1,
    businessId: 1,
    brandVoice: 'Helpful, calm, and professional.',
    signoffName: 'The Team',
    escalationMessage: 'Please contact our office so we can review the details directly.',
    allowedPromises: [],
    bannedPhrases: [],
    notificationEmails: [],
    defaultReplyStyle: 'professional',
    draftGenerationMode: 'hybrid_risk_gated',
    focusQueueEnabled: false,
    language: 'en',
    manualReviewRules: ['negative_reviews', 'damage_claim', 'safety_concern'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

test('analysis prompt payload is compact and raw output captures usage/model metadata', async (t) => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'test-model';

  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), OPENAI_ENDPOINT);
    requestBody = JSON.parse(String(init?.body));

    return new Response(
      JSON.stringify({
        model: 'gpt-4o-mini-2026-01-01',
        usage: {
          prompt_tokens: 90,
          completion_tokens: 30,
          total_tokens: 120
        },
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'positive',
                urgency: 'low',
                riskLevel: 'low',
                issueTags: [],
                summary: 'Customer praised quick and clean service.',
                actionRecommendation: 'publish_safe_reply',
                confidence: 92,
                requiresManualReview: false
              })
            }
          }
        ]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    if (originalModel === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = originalModel;
    }
  });

  const result = await analyzeReviewWithAI(createReview());

  const messages = requestBody?.messages as Array<{ content: string }>;
  const userPayload = JSON.parse(messages[1]?.content ?? '{}');

  assert.equal(typeof userPayload.expectedShape, 'undefined');
  assert.equal(userPayload.rating, 5);
  assert.equal(userPayload.reviewText, 'Great team. Fast fix and clean work.');
  assert.equal(Array.isArray(userPayload.allowedIssueTags), true);

  assert.equal(result.modelName, 'gpt-4o-mini-2026-01-01');
  assert.equal(result.rawOutput.source, 'openai');
  assert.equal(result.rawOutput.promptVersion, 'analysis-v3-compact-offtopic-gate');
  assert.deepEqual(result.rawOutput.usage, {
    promptTokens: 90,
    completionTokens: 30,
    totalTokens: 120
  });
  assert.deepEqual(result.rawOutput.offTopicSpam, {
    detected: false,
    matches: [],
    source: 'deterministic_v1'
  });
});

test('draft prompt omits empty/default optional fields and stores generation metadata', async (t) => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';

  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (_, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        model: 'gpt-4o-mini-2026-02-01',
        usage: {
          prompt_tokens: 70,
          completion_tokens: 25,
          total_tokens: 95
        },
        choices: [
          {
            message: {
              content: JSON.stringify({
                draftText: 'Thanks for the great feedback. We appreciate your trust.\n\nThe Team',
                tone: 'warm_professional',
                ctaType: 'none',
                safetyNotes: ['No invented facts.']
              })
            }
          }
        ]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  const review = createReview();
  const business = createBusiness();
  const settings = createSettings();

  const result = await generateReplyDraftWithAI({
    review,
    business,
    settings,
    analysis: {
      sentiment: 'positive',
      urgency: 'low',
      riskLevel: 'low',
      issueTags: [],
      summary: 'Positive review',
      actionRecommendation: 'publish_safe_reply',
      confidence: 90,
      requiresManualReview: false,
      rawOutput: {},
      modelName: 'rules-v1'
    }
  });

  const messages = requestBody?.messages as Array<{ content: string }>;
  const userPayload = JSON.parse(messages[1]?.content ?? '{}');

  assert.equal(typeof userPayload.allowedPromises, 'undefined');
  assert.equal(typeof userPayload.bannedPhrases, 'undefined');
  assert.equal(typeof userPayload.issueTags, 'undefined');
  assert.equal(typeof userPayload.brandVoice, 'undefined');
  assert.equal(typeof userPayload.escalationMessage, 'undefined');

  assert.equal(result.modelName, 'gpt-4o-mini-2026-02-01');
  assert.deepEqual(result.generationMetadata, {
    source: 'openai',
    promptVersion: 'draft-v3-compact-personalized',
    modelName: 'gpt-4o-mini-2026-02-01',
    usage: {
      promptTokens: 70,
      completionTokens: 25,
      totalTokens: 95
    }
  });
});

test('analyze falls back safely when OpenAI response has no content', async (t) => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        model: 'gpt-4o-mini-2026-03-01',
        usage: {
          prompt_tokens: 55,
          completion_tokens: 10,
          total_tokens: 65
        },
        choices: [{ message: {} }]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  const result = await analyzeReviewWithAI(createReview({ reviewText: 'Great service.' }));
  assert.equal(result.modelName, 'rules-v1');
  assert.equal(result.rawOutput.source, 'rules');
});

test('off-topic coding request forces skip_reply in fallback analysis', async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await analyzeReviewWithAI(
    createReview({
      reviewText: 'Can you solve this Python homework problem and write the code?',
      starRating: 5
    })
  );

  if (originalApiKey !== undefined) {
    process.env.OPENAI_API_KEY = originalApiKey;
  }

  assert.equal(result.actionRecommendation, 'skip_reply');
  assert.equal(result.requiresManualReview, true);
  assert.equal(result.issueTags.includes('off_topic_spam'), true);
  assert.equal(
    result.summary,
    'Review appears off-topic or promotional spam and not a legitimate customer feedback item. No public reply recommended.'
  );
  assert.deepEqual(result.rawOutput.offTopicSpam, {
    detected: true,
    matches: ['coding_solve_request', 'coding_write_code', 'coding_homework'],
    source: 'deterministic_v1'
  });
});

test('off-topic detection overrides OpenAI publish_safe_reply recommendation', async (t) => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        model: 'gpt-4o-mini-2026-04-01',
        usage: {
          prompt_tokens: 90,
          completion_tokens: 30,
          total_tokens: 120
        },
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'positive',
                urgency: 'low',
                riskLevel: 'low',
                issueTags: [],
                summary: 'Looks like a normal review.',
                actionRecommendation: 'publish_safe_reply',
                confidence: 91,
                requiresManualReview: false
              })
            }
          }
        ]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  const result = await analyzeReviewWithAI(
    createReview({
      reviewText: 'Please debug this code and solve my algorithm question in Python.'
    })
  );

  assert.equal(result.rawOutput.source, 'openai');
  assert.equal(result.actionRecommendation, 'skip_reply');
  assert.equal(result.requiresManualReview, true);
  assert.equal(result.issueTags.includes('off_topic_spam'), true);
  assert.deepEqual(result.rawOutput.offTopicSpam, {
    detected: true,
    matches: ['coding_debug_request', 'coding_solve_request'],
    source: 'deterministic_v1'
  });
});

test('legitimate plumbing review does not trigger off-topic tag', async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await analyzeReviewWithAI(
    createReview({
      reviewText: 'Our sink was leaking and your technician fixed it quickly. Thank you!'
    })
  );

  if (originalApiKey !== undefined) {
    process.env.OPENAI_API_KEY = originalApiKey;
  }

  assert.equal(result.issueTags.includes('off_topic_spam'), false);
  assert.deepEqual(result.rawOutput.offTopicSpam, {
    detected: false,
    matches: [],
    source: 'deterministic_v1'
  });
});
