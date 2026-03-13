type FocusQueueAnalysisSnapshot = {
  urgency?: string | null;
  actionRecommendation?: string | null;
  riskLevel?: string | null;
  requiresManualReview?: boolean | null;
};

export type FocusQueueCandidate = {
  id: number;
  workflowStatus: string;
  starRating: number;
  priority?: string | null;
  assignedUserId?: number | null;
  escalatedAt?: Date | string | null;
  reviewCreatedAt?: Date | string | null;
  latestDraft?: { id: number } | null;
  latestAnalysis?: FocusQueueAnalysisSnapshot | null;
};

export type FocusQueueNextAction =
  | 'generate_draft'
  | 'approve_draft'
  | 'regenerate_draft'
  | 'mark_posted'
  | 'acknowledge_no_reply';

export type FocusQueueResolution = {
  nextAction: FocusQueueNextAction;
  reason: string;
};

const ACTIONABLE_STATUSES = new Set([
  'needs_attention',
  'rejected',
  'analyzed',
  'draft_ready',
  'approved'
]);

const URGENCY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

const WORKFLOW_PRIORITY: Record<string, number> = {
  needs_attention: 0,
  rejected: 0,
  analyzed: 1,
  draft_ready: 2,
  approved: 3
};

export function isActionableForFocusQueue(candidate: FocusQueueCandidate) {
  return ACTIONABLE_STATUSES.has(candidate.workflowStatus);
}

export function shouldEscalateAfterAnalysis(input: {
  starRating: number;
  requiresManualReview: boolean;
  riskLevel: string;
}) {
  if (input.starRating >= 1 && input.starRating <= 3) {
    return true;
  }
  if (input.requiresManualReview) {
    return true;
  }

  return input.riskLevel === 'high' || input.riskLevel === 'critical';
}

function getUrgencyRank(candidate: FocusQueueCandidate) {
  const urgency = candidate.latestAnalysis?.urgency?.toLowerCase() ?? '';
  if (urgency in URGENCY_ORDER) {
    return URGENCY_ORDER[urgency];
  }

  const fallback = candidate.priority?.toLowerCase() ?? 'low';
  return URGENCY_ORDER[fallback] ?? URGENCY_ORDER.low;
}

function getWorkflowRank(candidate: FocusQueueCandidate) {
  return WORKFLOW_PRIORITY[candidate.workflowStatus] ?? 10;
}

function getCreatedAtMs(candidate: FocusQueueCandidate) {
  if (!candidate.reviewCreatedAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  return new Date(candidate.reviewCreatedAt).getTime();
}

function isOwnerEscalation(candidate: FocusQueueCandidate, ownerUserId: number | null) {
  return Boolean(
    ownerUserId &&
      candidate.assignedUserId === ownerUserId &&
      candidate.escalatedAt
  );
}

export function sortFocusQueueCandidates(
  candidates: FocusQueueCandidate[],
  ownerUserId: number | null
) {
  return [...candidates]
    .filter(isActionableForFocusQueue)
    .sort((a, b) => {
      const ownerDelta =
        Number(isOwnerEscalation(b, ownerUserId)) -
        Number(isOwnerEscalation(a, ownerUserId));
      if (ownerDelta !== 0) {
        return ownerDelta;
      }

      const urgencyDelta = getUrgencyRank(a) - getUrgencyRank(b);
      if (urgencyDelta !== 0) {
        return urgencyDelta;
      }

      const workflowDelta = getWorkflowRank(a) - getWorkflowRank(b);
      if (workflowDelta !== 0) {
        return workflowDelta;
      }

      return getCreatedAtMs(a) - getCreatedAtMs(b);
    });
}

export function resolveFocusQueueAction(
  candidate: FocusQueueCandidate
): FocusQueueResolution {
  if (
    candidate.workflowStatus === 'analyzed' &&
    candidate.latestAnalysis?.actionRecommendation === 'skip_reply'
  ) {
    return {
      nextAction: 'acknowledge_no_reply',
      reason: 'AI marked this review as no public reply recommended.'
    };
  }

  if (candidate.workflowStatus === 'approved') {
    return {
      nextAction: 'mark_posted',
      reason: 'Reply is approved and ready to be posted manually.'
    };
  }

  if (candidate.workflowStatus === 'rejected') {
    return {
      nextAction: 'regenerate_draft',
      reason: 'Draft was rejected and needs a safer revision.'
    };
  }

  if (candidate.latestDraft) {
    return {
      nextAction: 'approve_draft',
      reason: 'Review and approve the generated draft.'
    };
  }

  return {
    nextAction: 'generate_draft',
    reason: 'Generate a draft to move this review forward.'
  };
}
