const REVIEW_WORKFLOW_STATUSES = [
  'new',
  'analyzed',
  'draft_ready',
  'needs_attention',
  'approved',
  'posted_manual',
  'rejected',
  'closed_no_reply'
] as const;

const INBOX_URGENCY_FILTERS = ['urgent', 'critical', 'high', 'medium', 'low'] as const;

export const REVIEW_STATUS_GROUP_TO_STATUSES = {
  needs_review: ['new', 'analyzed', 'needs_attention', 'rejected'],
  draft_ready: ['draft_ready'],
  ready_to_post: ['approved'],
  completed: ['posted_manual', 'closed_no_reply']
} as const;

export type ReviewWorkflowStatus = (typeof REVIEW_WORKFLOW_STATUSES)[number];
export type ReviewStatusGroup = keyof typeof REVIEW_STATUS_GROUP_TO_STATUSES;
export type InboxUrgencyFilter = (typeof INBOX_URGENCY_FILTERS)[number];
export type ReviewSortMode = 'urgency_then_newest' | 'newest';

export type InboxFilterState = {
  search?: string;
  status?: ReviewWorkflowStatus;
  statusGroup?: ReviewStatusGroup;
  urgency?: InboxUrgencyFilter;
  rating?: number;
  locationId?: number;
  sort?: ReviewSortMode;
};

type ParsedParams = Record<string, string | string[] | undefined>;
type QueryPatch = Record<string, string | number | null | undefined>;

const CLEARABLE_FILTER_KEYS = ['search', 'status', 'statusGroup', 'urgency', 'rating', 'location', 'sort'];

function readParam(params: ParsedParams, key: string) {
  const value = params[key];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

function isWorkflowStatus(status?: string): status is ReviewWorkflowStatus {
  return !!status && REVIEW_WORKFLOW_STATUSES.includes(status as ReviewWorkflowStatus);
}

export function isReviewStatusGroup(group?: string): group is ReviewStatusGroup {
  return !!group && group in REVIEW_STATUS_GROUP_TO_STATUSES;
}

export function isInboxUrgencyFilter(urgency?: string): urgency is InboxUrgencyFilter {
  return !!urgency && INBOX_URGENCY_FILTERS.includes(urgency as InboxUrgencyFilter);
}

export function resolveWorkflowStatusesForFilters({
  statusGroup,
  status
}: {
  statusGroup?: string;
  status?: string;
}) {
  if (isReviewStatusGroup(statusGroup)) {
    return [...REVIEW_STATUS_GROUP_TO_STATUSES[statusGroup]];
  }

  if (isWorkflowStatus(status)) {
    return [status];
  }

  return null;
}

export function parseInboxFilterState(params: ParsedParams): InboxFilterState {
  const search = readParam(params, 'search')?.trim();
  const status = readParam(params, 'status');
  const statusGroup = readParam(params, 'statusGroup');
  const urgency = readParam(params, 'urgency');
  const ratingRaw = readParam(params, 'rating');
  const locationRaw = readParam(params, 'location');
  const sortRaw = readParam(params, 'sort');

  const rating = ratingRaw ? Number(ratingRaw) : null;
  const locationId = locationRaw ? Number(locationRaw) : null;

  return {
    search: search || undefined,
    status: isWorkflowStatus(status) ? status : undefined,
    statusGroup: isReviewStatusGroup(statusGroup) ? statusGroup : undefined,
    urgency: isInboxUrgencyFilter(urgency) ? urgency : undefined,
    rating:
      Number.isInteger(rating) && rating !== null && rating >= 1 && rating <= 5
        ? rating
        : undefined,
    locationId:
      Number.isInteger(locationId) && locationId !== null && locationId > 0
        ? locationId
        : undefined,
    sort:
      sortRaw === 'urgency_then_newest' || sortRaw === 'newest'
        ? sortRaw
        : undefined
  };
}

export function toUrlSearchParams(params: ParsedParams) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      searchParams.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      searchParams.set(key, value[0]);
    }
  }

  return searchParams;
}

export function patchSearchParams(current: URLSearchParams, patch: QueryPatch) {
  const next = new URLSearchParams(current);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  return next;
}

export function buildInboxHref(
  current: URLSearchParams,
  patch: QueryPatch,
  basePath = '/dashboard/inbox'
) {
  const next = patchSearchParams(current, patch);
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildClearAllInboxHref(
  current: URLSearchParams,
  basePath = '/dashboard/inbox'
) {
  const patch = Object.fromEntries(CLEARABLE_FILTER_KEYS.map((key) => [key, null]));
  return buildInboxHref(current, patch, basePath);
}

export function countActiveInboxFilters(state: InboxFilterState) {
  let count = 0;

  if (state.search) {
    count += 1;
  }
  if (state.statusGroup || state.status) {
    count += 1;
  }
  if (state.urgency) {
    count += 1;
  }
  if (state.rating) {
    count += 1;
  }
  if (state.locationId) {
    count += 1;
  }
  if (state.sort === 'newest') {
    count += 1;
  }

  return count;
}
