import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildInboxRowViewModel,
  sortReviewsForInbox
} from '../../lib/services/reviews/inbox.ts';

test('hides summary when it duplicates review text', () => {
  const viewModel = buildInboxRowViewModel({
    workflowStatus: 'new',
    reviewText: 'Tech arrived on time and fixed the leak quickly.',
    latestAnalysis: {
      summary: 'Tech arrived on time and fixed the leak quickly.',
      actionRecommendation: 'owner_review_required'
    }
  });

  assert.equal(viewModel.showSummary, false);
  assert.equal(
    viewModel.aiTakeaway,
    'Owner review required before publishing.'
  );
});

test('keeps summary when it adds distinct context', () => {
  const viewModel = buildInboxRowViewModel({
    workflowStatus: 'new',
    reviewText: 'They fixed it, but I had to wait all day for someone to show up.',
    latestAnalysis: {
      summary: 'Mixed feedback: solved issue but scheduling experience was poor.'
    }
  });

  assert.equal(viewModel.showSummary, true);
  assert.equal(
    viewModel.aiTakeaway,
    'Mixed feedback: solved issue but scheduling experience was poor.'
  );
});

test('maps workflow statuses to guided next actions', () => {
  const statuses = [
    ['new', 'Review analysis'],
    ['analyzed', 'Generate draft'],
    ['needs_attention', 'Generate draft'],
    ['draft_ready', 'Approve draft'],
    ['approved', 'Post and mark posted'],
    ['rejected', 'Regenerate draft'],
    ['posted_manual', 'Completed'],
    ['closed_no_reply', 'Completed']
  ] as const;

  for (const [workflowStatus, expected] of statuses) {
    const viewModel = buildInboxRowViewModel({ workflowStatus });
    assert.equal(viewModel.nextActionLabel, expected);
  }
});

test('shows no-reply action when analyzed recommendation is skip reply', () => {
  const viewModel = buildInboxRowViewModel({
    workflowStatus: 'analyzed',
    latestAnalysis: {
      actionRecommendation: 'skip_reply'
    }
  });

  assert.equal(viewModel.nextActionLabel, 'No reply recommended');
});

test('flags long reviews for read-full affordance', () => {
  const longReview = 'a'.repeat(260);
  const shortReview = 'a'.repeat(80);

  assert.equal(
    buildInboxRowViewModel({ workflowStatus: 'new', reviewText: longReview })
      .isLongReview,
    true
  );
  assert.equal(
    buildInboxRowViewModel({ workflowStatus: 'new', reviewText: shortReview })
      .isLongReview,
    false
  );
});

test('sorts by urgency first, then newest', () => {
  const sorted = sortReviewsForInbox([
    {
      id: 1,
      priority: 'low',
      reviewCreatedAt: new Date('2026-01-01T00:00:00Z')
    },
    {
      id: 2,
      priority: 'high',
      reviewCreatedAt: new Date('2025-12-01T00:00:00Z')
    },
    {
      id: 3,
      priority: 'medium',
      reviewCreatedAt: new Date('2026-03-01T00:00:00Z')
    },
    {
      id: 4,
      priority: 'low',
      reviewCreatedAt: new Date('2026-02-01T00:00:00Z'),
      latestAnalysis: { urgency: 'critical' }
    }
  ]);

  assert.deepEqual(
    sorted.map((review) => review.id),
    [4, 2, 3, 1]
  );
});

test('supports explicit newest-only sorting', () => {
  const sorted = sortReviewsForInbox(
    [
      {
        id: 1,
        priority: 'critical',
        reviewCreatedAt: new Date('2025-01-01T00:00:00Z')
      },
      {
        id: 2,
        priority: 'low',
        reviewCreatedAt: new Date('2026-02-01T00:00:00Z')
      },
      {
        id: 3,
        priority: 'high',
        reviewCreatedAt: new Date('2026-03-01T00:00:00Z')
      }
    ],
    'newest'
  );

  assert.deepEqual(
    sorted.map((review) => review.id),
    [3, 2, 1]
  );
});
