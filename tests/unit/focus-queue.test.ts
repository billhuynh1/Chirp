import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveFocusQueueAction,
  shouldEscalateAfterAnalysis,
  sortFocusQueueCandidates
} from '../../lib/services/reviews/focus-queue.ts';

test('prioritizes owner-assigned escalations before other items', () => {
  const sorted = sortFocusQueueCandidates(
    [
      {
        id: 1,
        workflowStatus: 'analyzed',
        starRating: 5,
        assignedUserId: null,
        escalatedAt: null,
        reviewCreatedAt: new Date('2026-01-01T00:00:00Z'),
        latestAnalysis: { urgency: 'critical' }
      },
      {
        id: 2,
        workflowStatus: 'analyzed',
        starRating: 3,
        assignedUserId: 42,
        escalatedAt: new Date('2026-01-02T00:00:00Z'),
        reviewCreatedAt: new Date('2026-02-01T00:00:00Z'),
        latestAnalysis: { urgency: 'medium' }
      }
    ],
    42
  );

  assert.equal(sorted[0]?.id, 2);
});

test('sorts by urgency, then workflow, then oldest created review', () => {
  const sorted = sortFocusQueueCandidates(
    [
      {
        id: 1,
        workflowStatus: 'draft_ready',
        starRating: 5,
        reviewCreatedAt: new Date('2026-02-01T00:00:00Z'),
        latestAnalysis: { urgency: 'medium' }
      },
      {
        id: 2,
        workflowStatus: 'analyzed',
        starRating: 4,
        reviewCreatedAt: new Date('2026-03-01T00:00:00Z'),
        latestAnalysis: { urgency: 'high' }
      },
      {
        id: 3,
        workflowStatus: 'needs_attention',
        starRating: 2,
        reviewCreatedAt: new Date('2026-01-01T00:00:00Z'),
        latestAnalysis: { urgency: 'high' }
      }
    ],
    null
  );

  assert.deepEqual(
    sorted.map((item) => item.id),
    [3, 2, 1]
  );
});

test('resolves no-reply items to acknowledge action', () => {
  const resolution = resolveFocusQueueAction({
    id: 100,
    workflowStatus: 'analyzed',
    starRating: 5,
    latestAnalysis: { actionRecommendation: 'skip_reply' }
  });

  assert.equal(resolution.nextAction, 'acknowledge_no_reply');
});

test('resolves needs-attention items with an existing draft to approve action', () => {
  const resolution = resolveFocusQueueAction({
    id: 101,
    workflowStatus: 'needs_attention',
    starRating: 2,
    latestDraft: { id: 999 },
    latestAnalysis: { actionRecommendation: 'owner_review_required' }
  });

  assert.equal(resolution.nextAction, 'approve_draft');
});

test('excludes closed no-reply reviews from actionable queue candidates', () => {
  const sorted = sortFocusQueueCandidates(
    [
      {
        id: 1,
        workflowStatus: 'closed_no_reply',
        starRating: 5,
        reviewCreatedAt: new Date('2026-01-01T00:00:00Z'),
        latestAnalysis: { urgency: 'low' }
      },
      {
        id: 2,
        workflowStatus: 'analyzed',
        starRating: 5,
        reviewCreatedAt: new Date('2026-02-01T00:00:00Z'),
        latestAnalysis: { urgency: 'low', actionRecommendation: 'publish_safe_reply' }
      }
    ],
    null
  );

  assert.deepEqual(
    sorted.map((item) => item.id),
    [2]
  );
});

test('auto-escalation rules cover ratings, manual review, and high risk', () => {
  assert.equal(
    shouldEscalateAfterAnalysis({
      starRating: 3,
      requiresManualReview: false,
      riskLevel: 'low'
    }),
    true
  );

  assert.equal(
    shouldEscalateAfterAnalysis({
      starRating: 5,
      requiresManualReview: true,
      riskLevel: 'low'
    }),
    true
  );

  assert.equal(
    shouldEscalateAfterAnalysis({
      starRating: 5,
      requiresManualReview: false,
      riskLevel: 'high'
    }),
    true
  );

  assert.equal(
    shouldEscalateAfterAnalysis({
      starRating: 5,
      requiresManualReview: false,
      riskLevel: 'low'
    }),
    false
  );
});
