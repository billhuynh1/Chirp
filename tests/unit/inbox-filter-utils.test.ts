import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClearAllInboxHref,
  buildInboxHref,
  countActiveInboxFilters,
  parseInboxFilterState,
  patchSearchParams,
  resolveWorkflowStatusesForFilters
} from '../../lib/services/reviews/inbox-filters.ts';

test('maps each status group to expected workflow statuses', () => {
  assert.deepEqual(resolveWorkflowStatusesForFilters({ statusGroup: 'needs_review' }), [
    'new',
    'analyzed',
    'needs_attention',
    'rejected'
  ]);
  assert.deepEqual(resolveWorkflowStatusesForFilters({ statusGroup: 'draft_ready' }), [
    'draft_ready'
  ]);
  assert.deepEqual(resolveWorkflowStatusesForFilters({ statusGroup: 'ready_to_post' }), [
    'approved'
  ]);
  assert.deepEqual(resolveWorkflowStatusesForFilters({ statusGroup: 'completed' }), [
    'posted_manual',
    'closed_no_reply'
  ]);
});

test('statusGroup takes precedence over legacy status', () => {
  const statuses = resolveWorkflowStatusesForFilters({
    statusGroup: 'ready_to_post',
    status: 'rejected'
  });

  assert.deepEqual(statuses, ['approved']);
});

test('falls back to raw status when statusGroup is missing', () => {
  const statuses = resolveWorkflowStatusesForFilters({ status: 'rejected' });
  assert.deepEqual(statuses, ['rejected']);
});

test('patchSearchParams preserves unrelated params and updates requested keys', () => {
  const current = new URLSearchParams('foo=bar&statusGroup=needs_review&urgency=high');
  const next = patchSearchParams(current, { statusGroup: 'completed', urgency: null, rating: 4 });

  assert.equal(next.get('foo'), 'bar');
  assert.equal(next.get('statusGroup'), 'completed');
  assert.equal(next.get('urgency'), null);
  assert.equal(next.get('rating'), '4');
});

test('clear all removes filter keys but keeps unrelated params', () => {
  const current = new URLSearchParams(
    'search=leak&statusGroup=needs_review&rating=2&location=3&foo=bar'
  );

  const href = buildClearAllInboxHref(current);
  assert.equal(href, '/dashboard/inbox?foo=bar');
});

test('buildInboxHref patches only targeted keys', () => {
  const current = new URLSearchParams('search=leak&foo=bar');
  const href = buildInboxHref(current, { urgency: 'urgent' });
  assert.equal(href, '/dashboard/inbox?search=leak&foo=bar&urgency=urgent');
});

test('parseInboxFilterState accepts only supported values', () => {
  const state = parseInboxFilterState({
    statusGroup: 'draft_ready',
    status: 'rejected',
    urgency: 'critical',
    rating: '5',
    location: '10',
    sort: 'newest',
    search: ' plumber  '
  });

  assert.equal(state.statusGroup, 'draft_ready');
  assert.equal(state.status, 'rejected');
  assert.equal(state.urgency, 'critical');
  assert.equal(state.rating, 5);
  assert.equal(state.locationId, 10);
  assert.equal(state.sort, 'newest');
  assert.equal(state.search, 'plumber');
});

test('countActiveInboxFilters excludes default sort', () => {
  assert.equal(
    countActiveInboxFilters({
      statusGroup: 'needs_review',
      sort: 'urgency_then_newest'
    }),
    1
  );
  assert.equal(
    countActiveInboxFilters({
      statusGroup: 'needs_review',
      sort: 'newest'
    }),
    2
  );
});
