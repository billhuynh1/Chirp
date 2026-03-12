export type ReviewSortMode = 'urgency_then_newest' | 'newest';

type AnalysisSnapshot = {
  urgency?: string | null;
  summary?: string | null;
  issueTags?: unknown[] | null;
  actionRecommendation?: string | null;
};

type InboxReviewLike = {
  workflowStatus: string;
  priority?: string | null;
  reviewCreatedAt?: Date | string | null;
  reviewText?: string | null;
  latestAnalysis?: AnalysisSnapshot | null;
};

export type InboxRowViewModel = {
  customerMessage: string;
  aiTakeaway: string;
  nextActionLabel: string;
  nextActionDescription: string;
  showSummary: boolean;
  isLongReview: boolean;
};

const LONG_REVIEW_THRESHOLD = 220;
const URGENCY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

const ACTION_RECOMMENDATION_COPY: Record<string, string> = {
  publish_safe_reply: 'Safe to publish a polished reply.',
  owner_review_required: 'Owner review required before publishing.',
  owner_review_and_offline_resolution:
    'Owner review and offline follow-up recommended.',
  skip_reply: 'No public reply recommended.'
};

const NEXT_ACTION_COPY: Record<
  string,
  { label: string; description: string }
> = {
  new: {
    label: 'Review analysis',
    description: 'Open details and confirm AI classification before replying.'
  },
  draft_ready: {
    label: 'Approve draft',
    description: 'Review and approve the suggested reply text.'
  },
  approved: {
    label: 'Post and mark posted',
    description: 'Manually post the approved reply, then mark it complete.'
  },
  rejected: {
    label: 'Regenerate draft',
    description: 'Generate a safer or clearer reply version.'
  },
  posted_manual: {
    label: 'Completed',
    description: 'Reply already posted and marked complete.'
  },
  closed_no_reply: {
    label: 'Completed',
    description: 'No-reply recommendation was acknowledged.'
  }
};

const ANALYZED_ACTION_COPY = {
  generate: {
    label: 'Generate draft',
    description: 'Generate a reply draft when you are ready.'
  },
  noReply: {
    label: 'No reply recommended',
    description: 'AI marked this review as no-reply.'
  }
} as const;

function normalizeTextForCompare(text: string | null | undefined) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getUrgencyRank(review: InboxReviewLike) {
  const analysisUrgency = review.latestAnalysis?.urgency?.toLowerCase() ?? '';
  if (analysisUrgency in URGENCY_ORDER) {
    return URGENCY_ORDER[analysisUrgency];
  }

  const fallbackPriority = review.priority?.toLowerCase() ?? 'low';
  return URGENCY_ORDER[fallbackPriority] ?? URGENCY_ORDER.low;
}

export function sortReviewsForInbox<T extends InboxReviewLike>(
  reviews: T[],
  sort: ReviewSortMode = 'urgency_then_newest'
) {
  const copy = [...reviews];

  if (sort === 'newest') {
    return copy.sort((a, b) => {
      const aTime = a.reviewCreatedAt ? new Date(a.reviewCreatedAt).getTime() : 0;
      const bTime = b.reviewCreatedAt ? new Date(b.reviewCreatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  return copy.sort((a, b) => {
    const urgencyDelta = getUrgencyRank(a) - getUrgencyRank(b);
    if (urgencyDelta !== 0) {
      return urgencyDelta;
    }

    const aTime = a.reviewCreatedAt ? new Date(a.reviewCreatedAt).getTime() : 0;
    const bTime = b.reviewCreatedAt ? new Date(b.reviewCreatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function getActionRecommendationCopy(recommendation?: string | null) {
  if (!recommendation) {
    return null;
  }

  return ACTION_RECOMMENDATION_COPY[recommendation] ?? null;
}

function getAiTakeaway(review: InboxReviewLike, showSummary: boolean) {
  if (showSummary && review.latestAnalysis?.summary) {
    return review.latestAnalysis.summary;
  }

  const tags = (review.latestAnalysis?.issueTags ?? []).filter(
    (tag): tag is string => typeof tag === 'string'
  );
  if (tags.length > 0) {
    return `Tags: ${tags.map((tag) => tag.replace(/_/g, ' ')).join(', ')}`;
  }

  const recommendationCopy = getActionRecommendationCopy(
    review.latestAnalysis?.actionRecommendation
  );
  if (recommendationCopy) {
    return recommendationCopy;
  }

  return 'AI takeaway unavailable';
}

function getNextActionCopy(review: InboxReviewLike) {
  if (review.workflowStatus === 'analyzed' || review.workflowStatus === 'needs_attention') {
    if (review.latestAnalysis?.actionRecommendation === 'skip_reply') {
      return ANALYZED_ACTION_COPY.noReply;
    }

    return ANALYZED_ACTION_COPY.generate;
  }

  return NEXT_ACTION_COPY[review.workflowStatus] ?? NEXT_ACTION_COPY.new;
}

export function buildInboxRowViewModel(review: InboxReviewLike): InboxRowViewModel {
  const customerMessage = (review.reviewText ?? '').trim() || 'Rating-only review';
  const messageNormalized = normalizeTextForCompare(customerMessage);
  const summary = review.latestAnalysis?.summary?.trim() ?? '';
  const summaryNormalized = normalizeTextForCompare(summary);

  const showSummary =
    summaryNormalized.length > 0 &&
    !messageNormalized.includes(summaryNormalized) &&
    !summaryNormalized.includes(messageNormalized.slice(0, 140));

  const nextAction = getNextActionCopy(review);

  return {
    customerMessage,
    aiTakeaway: getAiTakeaway(review, showSummary),
    nextActionLabel: nextAction.label,
    nextActionDescription: nextAction.description,
    showSummary,
    isLongReview: customerMessage.length > LONG_REVIEW_THRESHOLD
  };
}
