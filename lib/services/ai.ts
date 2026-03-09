import {
  NEGATIVE_KEYWORDS,
  NEGATIVE_RISK_KEYWORDS,
  ISSUE_TAG_PATTERNS,
  POSITIVE_KEYWORDS,
  type HomeServiceIssueTag
} from '@/lib/services/reviews/constants';
import type {
  Business,
  BusinessSettings,
  Review,
  ReviewAnalysis
} from '@/lib/db/schema';
import { getEnv } from '@/lib/env';

export type AnalysisResult = {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | 'rating_only';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issueTags: HomeServiceIssueTag[];
  summary: string;
  actionRecommendation:
    | 'publish_safe_reply'
    | 'owner_review_required'
    | 'owner_review_and_offline_resolution'
    | 'skip_reply';
  confidence: number;
  requiresManualReview: boolean;
  rawOutput: Record<string, unknown>;
  modelName: string;
};

export type DraftResult = {
  draftText: string;
  tone: string;
  ctaType: string;
  safetyNotes: string[];
  modelName: string;
};

type OpenAIMessage = {
  role: 'system' | 'user';
  content: string;
};

function normalizeText(text: string | null) {
  return (text ?? '').toLowerCase().trim();
}

function findIssueTags(text: string) {
  const tags = Object.entries(ISSUE_TAG_PATTERNS).flatMap(([tag, patterns]) =>
    patterns.some((pattern) => text.includes(pattern)) ? [tag as HomeServiceIssueTag] : []
  );

  return [...new Set(tags)];
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function summarizeText(review: Review, issueTags: string[]) {
  const rawText = (review.reviewText ?? '').trim();
  if (!rawText) {
    return `${review.starRating}-star review with no written comment.`;
  }

  const firstSentence = rawText.split(/[.!?]/).find(Boolean)?.trim();
  if (firstSentence) {
    return firstSentence;
  }

  if (issueTags.length > 0) {
    return `Review mentions ${issueTags.join(', ')}.`;
  }

  return rawText.slice(0, 180);
}

function determineSentiment(review: Review, text: string) {
  if (!text) {
    return 'rating_only' as const;
  }

  if (review.starRating <= 2) {
    return 'negative' as const;
  }

  if (review.starRating === 3) {
    return includesAny(text, POSITIVE_KEYWORDS) && includesAny(text, NEGATIVE_KEYWORDS)
      ? ('mixed' as const)
      : ('neutral' as const);
  }

  if (includesAny(text, NEGATIVE_KEYWORDS)) {
    return 'mixed' as const;
  }

  return 'positive' as const;
}

function determineRiskLevel(review: Review, text: string, issueTags: string[]) {
  if (includesAny(text, NEGATIVE_RISK_KEYWORDS)) {
    return 'critical' as const;
  }

  if (
    review.starRating <= 2 ||
    issueTags.includes('damage_claim') ||
    issueTags.includes('safety_concern')
  ) {
    return 'high' as const;
  }

  if (review.starRating === 3 || issueTags.length > 0) {
    return 'medium' as const;
  }

  return 'low' as const;
}

function determineUrgency(
  review: Review,
  sentiment: AnalysisResult['sentiment'],
  riskLevel: AnalysisResult['riskLevel']
) {
  if (riskLevel === 'critical') {
    return 'critical' as const;
  }
  if (review.starRating <= 2) {
    return 'high' as const;
  }
  if (sentiment === 'mixed' || review.starRating === 3) {
    return 'medium' as const;
  }
  return 'low' as const;
}

function requiresManualReview(
  review: Review,
  riskLevel: AnalysisResult['riskLevel'],
  issueTags: string[]
) {
  if (review.starRating <= 2) {
    return true;
  }

  if (
    riskLevel === 'critical' ||
    riskLevel === 'high' ||
    issueTags.includes('damage_claim') ||
    issueTags.includes('safety_concern') ||
    issueTags.includes('billing_issue')
  ) {
    return true;
  }

  return false;
}

function buildFallbackAnalysis(review: Review): AnalysisResult {
  const text = normalizeText(review.reviewText);
  const issueTags = findIssueTags(text);
  const sentiment = determineSentiment(review, text);
  const riskLevel = determineRiskLevel(review, text, issueTags);
  const urgency = determineUrgency(review, sentiment, riskLevel);
  const manualReview = requiresManualReview(review, riskLevel, issueTags);
  const summary = summarizeText(review, issueTags);

  return {
    sentiment,
    urgency,
    riskLevel,
    issueTags,
    summary,
    actionRecommendation:
      sentiment === 'rating_only' && review.starRating >= 5
        ? 'publish_safe_reply'
        : manualReview
        ? 'owner_review_and_offline_resolution'
        : sentiment === 'positive'
        ? 'publish_safe_reply'
        : 'owner_review_required',
    confidence: 80,
    requiresManualReview: manualReview,
    rawOutput: {
      source: 'rules'
    },
    modelName: 'rules-v1'
  };
}

function buildDraftSafetyNotes(
  settings: BusinessSettings,
  analysis: AnalysisResult | ReviewAnalysis
) {
  const notes = ['No invented facts.', 'No liability admission.', 'No refund promise.'];
  if (!settings.allowedPromises.length) {
    notes.push('No compensation language unless business has configured it.');
  }
  if (analysis.requiresManualReview) {
    notes.push('Manual review required before posting.');
  }
  return notes;
}

function buildFallbackDraft(
  review: Review,
  business: Business,
  settings: BusinessSettings,
  analysis: AnalysisResult | ReviewAnalysis
): DraftResult {
  const signoff = settings.signoffName || business.name;
  const reviewText = normalizeText(review.reviewText);
  const safetyNotes = buildDraftSafetyNotes(settings, analysis);

  if (analysis.riskLevel === 'critical' || analysis.requiresManualReview) {
    return {
      draftText: `Thank you for sharing this feedback. We’re sorry to hear your experience did not meet expectations. We take concerns like this seriously and would like to review the details directly. Please contact our office${
        business.primaryPhone ? ` at ${business.primaryPhone}` : ''
      } so we can look into this further.\n\n${signoff}`,
      tone: 'calm_professional',
      ctaType: 'offline_contact',
      safetyNotes,
      modelName: 'rules-v1'
    };
  }

  if (analysis.sentiment === 'positive' || review.starRating >= 4) {
    const serviceMention = reviewText.includes('clean')
      ? 'clean work'
      : reviewText.includes('fast') || reviewText.includes('quick')
      ? 'fast response'
      : 'the experience with our team';

    return {
      draftText: `Thank you for the review. We appreciate you taking the time to share your experience with ${serviceMention}. We’re glad our team could help, and we appreciate the opportunity to earn your trust.\n\n${signoff}`,
      tone: 'warm_professional',
      ctaType: 'none',
      safetyNotes,
      modelName: 'rules-v1'
    };
  }

  return {
    draftText: `Thank you for the feedback. We appreciate you bringing this to our attention. We always want communication and service to feel clear and professional. Please contact our office${
      business.primaryPhone ? ` at ${business.primaryPhone}` : ''
    } so we can review the details with you directly.\n\n${signoff}`,
    tone: 'professional',
    ctaType: 'offline_contact',
    safetyNotes,
    modelName: 'rules-v1'
  };
}

async function fetchOpenAIJson<T>(messages: OpenAIMessage[]) {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getEnv('OPENAI_MODEL') ?? 'gpt-4o-mini',
      response_format: {
        type: 'json_object'
      },
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  return JSON.parse(content) as T;
}

function sanitizeDraftText(text: string, settings: BusinessSettings) {
  const lowered = text.toLowerCase();
  const banned = [
    'we admit fault',
    'our negligence',
    'we guarantee a refund',
    ...settings.bannedPhrases.map((phrase) => phrase.toLowerCase())
  ];

  if (banned.some((phrase) => phrase && lowered.includes(phrase))) {
    throw new Error('Draft contains banned content');
  }

  return text.trim();
}

export async function analyzeReviewWithAI(review: Review) {
  const fallback = buildFallbackAnalysis(review);
  if (!getEnv('OPENAI_API_KEY') || !review.reviewText) {
    return fallback;
  }

  try {
    const result = await fetchOpenAIJson<AnalysisResult>([
      {
        role: 'system',
        content:
          'You classify customer reviews for a plumbing business. Return valid JSON only. Never invent facts.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          rating: review.starRating,
          reviewText: review.reviewText,
          allowedIssueTags: Object.keys(ISSUE_TAG_PATTERNS),
          expectedShape: {
            sentiment: 'positive|neutral|negative|mixed|rating_only',
            urgency: 'low|medium|high|critical',
            riskLevel: 'low|medium|high|critical',
            issueTags: ['issue_tag'],
            summary: 'short summary',
            actionRecommendation:
              'publish_safe_reply|owner_review_required|owner_review_and_offline_resolution|skip_reply',
            confidence: 0,
            requiresManualReview: true
          }
        })
      }
    ]);

    if (!result) {
      return fallback;
    }

    return {
      ...fallback,
      ...result,
      modelName: getEnv('OPENAI_MODEL') ?? 'gpt-4o-mini',
      rawOutput: {
        source: 'openai'
      }
    };
  } catch {
    return fallback;
  }
}

export async function generateReplyDraftWithAI({
  review,
  business,
  settings,
  analysis
}: {
  review: Review;
  business: Business;
  settings: BusinessSettings;
  analysis: AnalysisResult | ReviewAnalysis;
}) {
  const fallback = buildFallbackDraft(review, business, settings, analysis);
  if (!getEnv('OPENAI_API_KEY') || analysis.riskLevel === 'critical') {
    return fallback;
  }

  try {
    const result = await fetchOpenAIJson<{
      draftText: string;
      tone: string;
      ctaType: string;
      safetyNotes: string[];
    }>([
      {
        role: 'system',
        content:
          'You write safe review replies for plumbing businesses. Return JSON only. Do not invent facts, admit liability, promise refunds, or mention compensation unless explicitly provided.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          businessName: business.name,
          vertical: business.vertical,
          brandVoice: settings.brandVoice,
          signoffName: settings.signoffName,
          escalationMessage: settings.escalationMessage,
          allowedPromises: settings.allowedPromises,
          bannedPhrases: settings.bannedPhrases,
          rating: review.starRating,
          reviewText: review.reviewText,
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          urgency: analysis.urgency,
          riskLevel: analysis.riskLevel,
          issueTags: analysis.issueTags,
          requiresManualReview: analysis.requiresManualReview,
          expectedShape: {
            draftText: 'reply text',
            tone: 'professional',
            ctaType: 'none|offline_contact|follow_up',
            safetyNotes: ['note']
          }
        })
      }
    ]);

    if (!result?.draftText) {
      return fallback;
    }

    return {
      draftText: sanitizeDraftText(result.draftText, settings),
      tone: result.tone || fallback.tone,
      ctaType: result.ctaType || fallback.ctaType,
      safetyNotes:
        result.safetyNotes?.length > 0 ? result.safetyNotes : fallback.safetyNotes,
      modelName: getEnv('OPENAI_MODEL') ?? 'gpt-4o-mini'
    };
  } catch {
    return fallback;
  }
}
