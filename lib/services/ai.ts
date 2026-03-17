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
import {
  getServiceDisplayLabel,
  normalizeServiceValue
} from '@/lib/validation/business-profile';

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
  generationMetadata: Record<string, unknown>;
};

type OpenAIMessage = {
  role: 'system' | 'user';
  content: string;
};

type OpenAIUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type OpenAIResponse<T> = {
  data: T | null;
  modelName: string | null;
  usage: OpenAIUsage | null;
};

type OpenAIErrorMetadata = {
  status: number;
  code?: string;
  message: string;
};

class OpenAIRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor({
    status,
    code,
    message
  }: {
    status: number;
    code?: string;
    message: string;
  }) {
    super(message);
    this.name = 'OpenAIRequestError';
    this.status = status;
    this.code = code;
  }
}

const ANALYSIS_PROMPT_VERSION = 'analysis-v4-service-aware';
const DRAFT_PROMPT_VERSION = 'draft-v4-service-aware';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_BRAND_VOICE = 'Helpful, calm, and professional.';
const DEFAULT_ESCALATION_MESSAGE = 'Please contact our office so we can review the details directly.';

function getConfiguredOpenAIModel() {
  return getEnv('OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL;
}

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

type OffTopicSpamDetection = {
  detected: boolean;
  matches: string[];
};

const OFF_TOPIC_SUMMARY =
  'Review appears off-topic or promotional spam and not a legitimate customer feedback item. No public reply recommended.';

function detectOffTopicSpam(reviewText: string | null): OffTopicSpamDetection {
  const normalized = normalizeText(reviewText);
  if (!normalized) {
    return { detected: false, matches: [] };
  }

  const matches: string[] = [];
  const strongCodingSignals: Array<[string, RegExp]> = [
    ['coding_leetcode', /\bleetcode\b/],
    ['coding_debug_request', /\b(debug|fix)\s+(this|my)\s+code\b/],
    [
      'coding_solve_request',
      /\b(can you|please)\b.*\bsolve\b.*\b(problem|question|code|homework)\b/
    ],
    ['coding_write_code', /\bwrite\s+(the\s+)?(code|program|function|script)\b/],
    ['coding_homework', /\b(homework|assignment)\b/]
  ];

  for (const [label, pattern] of strongCodingSignals) {
    if (pattern.test(normalized)) {
      matches.push(label);
    }
  }

  const broadCodingSignals: Array<[string, RegExp]> = [
    ['coding_python', /\bpython\b/],
    ['coding_javascript', /\bjavascript\b/],
    ['coding_java', /\bjava\b/],
    ['coding_cplusplus', /\bc\+\+\b/],
    ['coding_algorithm', /\balgorithm\b/],
    ['coding_function', /\bfunction\b/],
    ['coding_runtime_error', /\bruntime error\b/]
  ];
  const broadCodingMatches = broadCodingSignals
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([label]) => label);
  const hasQuestionCue =
    normalized.includes('?') ||
    normalized.includes('can you') ||
    normalized.includes('how do i');
  if (matches.length === 0 && broadCodingMatches.length >= 2 && hasQuestionCue) {
    matches.push(...broadCodingMatches.slice(0, 2));
  }

  const hasLink =
    /(https?:\/\/|www\.|bit\.ly\/|tinyurl\.com\/|t\.me\/|wa\.me\/)/.test(normalized);
  const hasContactCue =
    /\b(contact me|dm me|text me|call me|whatsapp|telegram)\b/.test(normalized);
  const hasPromoCue =
    /\b(earn money|make money|investment|crypto|forex|seo services?|marketing services?|click (the )?link|subscribe)\b/.test(
      normalized
    );
  const hasDirectContact =
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(normalized) ||
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(normalized);

  if ((hasLink && (hasContactCue || hasPromoCue)) || (hasPromoCue && hasDirectContact)) {
    matches.push('spam_promotional_contact');
  }

  return {
    detected: matches.length > 0,
    matches: [...new Set(matches)]
  };
}

function applyOffTopicSpamOverride(review: Review, analysis: AnalysisResult): AnalysisResult {
  const detection = detectOffTopicSpam(review.reviewText);
  const rawOutput = {
    ...(analysis.rawOutput ?? {}),
    offTopicSpam: {
      detected: detection.detected,
      matches: detection.matches,
      source: 'deterministic_v1'
    }
  };

  if (!detection.detected) {
    return {
      ...analysis,
      rawOutput
    };
  }

  const issueTags: HomeServiceIssueTag[] = analysis.issueTags.includes('off_topic_spam')
    ? analysis.issueTags
    : [...analysis.issueTags, 'off_topic_spam'];

  return {
    ...analysis,
    issueTags,
    summary: OFF_TOPIC_SUMMARY,
    actionRecommendation: 'skip_reply',
    requiresManualReview: true,
    rawOutput
  };
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

function extractCustomerFirstName(reviewerName: string | null) {
  const rawName = reviewerName?.trim();
  if (!rawName) {
    return null;
  }

  const normalized = rawName.replace(/\s+/g, ' ');
  const firstToken = normalized.split(' ')[0]?.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, '');
  if (!firstToken) {
    return null;
  }

  if (!/^[a-zA-Z][a-zA-Z'-]{1,29}$/.test(firstToken)) {
    return null;
  }

  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
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
  const customerFirstName = extractCustomerFirstName(review.reviewerName);
  const criticalGreeting = customerFirstName
    ? `Thank you, ${customerFirstName}, for sharing this feedback.`
    : 'Thank you for sharing this feedback.';
  const positiveGreeting = customerFirstName
    ? `Thank you, ${customerFirstName}, for the review.`
    : 'Thank you for the review.';
  const neutralGreeting = customerFirstName
    ? `Thank you, ${customerFirstName}, for the feedback.`
    : 'Thank you for the feedback.';

  if (analysis.riskLevel === 'critical' || analysis.requiresManualReview) {
    return {
      draftText: `${criticalGreeting} We’re sorry to hear your experience did not meet expectations. We take concerns like this seriously and would like to review the details directly. Please contact our office${
        business.primaryPhone ? ` at ${business.primaryPhone}` : ''
      } so we can look into this further.\n\n${signoff}`,
      tone: 'calm_professional',
      ctaType: 'offline_contact',
      safetyNotes,
      modelName: 'rules-v1',
      generationMetadata: {
        source: 'rules'
      }
    };
  }

  if (analysis.sentiment === 'positive' || review.starRating >= 4) {
    const serviceMention = reviewText.includes('clean')
      ? 'clean work'
      : reviewText.includes('fast') || reviewText.includes('quick')
      ? 'fast response'
      : 'the experience with our team';

    return {
      draftText: `${positiveGreeting} We appreciate you taking the time to share your experience with ${serviceMention}. We’re glad our team could help, and we appreciate the opportunity to earn your trust.\n\n${signoff}`,
      tone: 'warm_professional',
      ctaType: 'none',
      safetyNotes,
      modelName: 'rules-v1',
      generationMetadata: {
        source: 'rules'
      }
    };
  }

  return {
    draftText: `${neutralGreeting} We appreciate you bringing this to our attention. We always want communication and service to feel clear and professional. Please contact our office${
      business.primaryPhone ? ` at ${business.primaryPhone}` : ''
    } so we can review the details with you directly.\n\n${signoff}`,
    tone: 'professional',
    ctaType: 'offline_contact',
    safetyNotes,
    modelName: 'rules-v1',
    generationMetadata: {
      source: 'rules'
    }
  };
}

async function fetchOpenAIJson<T>(messages: OpenAIMessage[]): Promise<OpenAIResponse<T>> {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) {
    return {
      data: null,
      modelName: null,
      usage: null
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getConfiguredOpenAIModel(),
      response_format: {
        type: 'json_object'
      },
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorCode: string | undefined;
    let errorMessage = `OpenAI request failed with status ${response.status}`;

    if (errorText) {
      try {
        const parsed = JSON.parse(errorText) as {
          error?: {
            code?: string;
            message?: string;
          };
        };
        if (parsed.error?.code) {
          errorCode = parsed.error.code;
        }
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch {
        errorMessage = errorText.slice(0, 320);
      }
    }

    throw new OpenAIRequestError({
      status: response.status,
      code: errorCode,
      message: errorMessage
    });
  }

  const payload = (await response.json()) as {
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return {
      data: null,
      modelName: payload.model ?? getConfiguredOpenAIModel(),
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens ?? 0,
            completionTokens: payload.usage.completion_tokens ?? 0,
            totalTokens: payload.usage.total_tokens ?? 0
          }
        : null
    };
  }

  return {
    data: JSON.parse(content) as T,
    modelName: payload.model ?? getConfiguredOpenAIModel(),
    usage: payload.usage
      ? {
          promptTokens: payload.usage.prompt_tokens ?? 0,
          completionTokens: payload.usage.completion_tokens ?? 0,
          totalTokens: payload.usage.total_tokens ?? 0
        }
      : null
  };
}

function extractOpenAIErrorMetadata(error: unknown): OpenAIErrorMetadata | null {
  if (!(error instanceof OpenAIRequestError)) {
    return null;
  }

  return {
    status: error.status,
    code: error.code,
    message: error.message
  };
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

function ensureSignoff(draftText: string, signoffName: string) {
  const normalizedSignoff = signoffName.trim();
  if (!normalizedSignoff) {
    return draftText.trim();
  }

  const trimmedDraft = draftText.trim();
  const draftLines = trimmedDraft.split('\n').map((line) => line.trim());
  const hasSignoff = draftLines.some(
    (line) => line.toLowerCase() === normalizedSignoff.toLowerCase()
  );

  if (hasSignoff) {
    return trimmedDraft;
  }

  return `${trimmedDraft}\n\n${normalizedSignoff}`;
}

function resolveServicePromptContext(vertical: string | null | undefined) {
  const normalizedVertical = normalizeServiceValue(vertical);
  return {
    vertical: normalizedVertical ?? 'home_service',
    displayLabel: getServiceDisplayLabel(normalizedVertical) || 'home service'
  };
}

function buildAnalysisPromptPayload(
  review: Review,
  vertical: string | null | undefined
) {
  const serviceContext = resolveServicePromptContext(vertical);

  return {
    vertical: serviceContext.vertical,
    rating: review.starRating,
    reviewText: review.reviewText,
    allowedIssueTags: Object.keys(ISSUE_TAG_PATTERNS)
  };
}

function buildDraftPromptPayload({
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
  const serviceContext = resolveServicePromptContext(business.vertical);
  const payload: Record<string, unknown> = {
    businessName: business.name,
    vertical: serviceContext.vertical,
    rating: review.starRating,
    reviewText: review.reviewText,
    summary: analysis.summary,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    riskLevel: analysis.riskLevel,
    requiresManualReview: analysis.requiresManualReview
  };

  const customerFirstName = extractCustomerFirstName(review.reviewerName);
  if (customerFirstName) {
    payload.customerFirstName = customerFirstName;
  }

  const trimmedBrandVoice = settings.brandVoice.trim();
  if (trimmedBrandVoice && trimmedBrandVoice !== DEFAULT_BRAND_VOICE) {
    payload.brandVoice = trimmedBrandVoice;
  }

  const trimmedSignoffName = settings.signoffName.trim();
  if (trimmedSignoffName) {
    payload.signoffName = trimmedSignoffName;
  }

  const trimmedEscalationMessage = settings.escalationMessage.trim();
  if (
    trimmedEscalationMessage &&
    trimmedEscalationMessage !== DEFAULT_ESCALATION_MESSAGE
  ) {
    payload.escalationMessage = trimmedEscalationMessage;
  }

  if (settings.allowedPromises.length > 0) {
    payload.allowedPromises = settings.allowedPromises;
  }

  if (settings.bannedPhrases.length > 0) {
    payload.bannedPhrases = settings.bannedPhrases;
  }

  if (analysis.issueTags.length > 0) {
    payload.issueTags = analysis.issueTags;
  }

  return payload;
}

export async function analyzeReviewWithAI(
  review: Review,
  options: { vertical?: string | null } = {}
) {
  const fallbackBase = buildFallbackAnalysis(review);
  const fallback = applyOffTopicSpamOverride(review, fallbackBase);
  if (!getEnv('OPENAI_API_KEY') || !review.reviewText) {
    return fallback;
  }

  try {
    const serviceContext = resolveServicePromptContext(options.vertical);
    const result = await fetchOpenAIJson<AnalysisResult>([
      {
        role: 'system',
        content:
          [
            `You classify customer reviews for a ${serviceContext.displayLabel} business in the home services industry.`,
            'Return valid JSON only with keys: sentiment, urgency, riskLevel, issueTags, summary, actionRecommendation, confidence, requiresManualReview.',
            'Allowed sentiment: positive|neutral|negative|mixed|rating_only.',
            'Allowed urgency/riskLevel: low|medium|high|critical.',
            'Allowed actionRecommendation: publish_safe_reply|owner_review_required|owner_review_and_offline_resolution|skip_reply.',
            'Use the provided vertical to tailor terminology lightly while keeping the same shared workflow and safety rules.',
            'If content is off-topic or promotional spam (including coding/homework requests), return actionRecommendation=skip_reply and include issueTags containing off_topic_spam.',
            'Confidence must be an integer 0-100.',
            'Never invent facts.'
          ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify(buildAnalysisPromptPayload(review, options.vertical))
      }
    ]);

    if (!result.data) {
      return fallback;
    }

    const modelName = result.modelName ?? getConfiguredOpenAIModel();
    const mergedResult: AnalysisResult = {
      ...fallbackBase,
      ...result.data,
      modelName,
      rawOutput: {
        source: 'openai',
        promptVersion: ANALYSIS_PROMPT_VERSION,
        modelName,
        usage: result.usage
      }
    };

    return applyOffTopicSpamOverride(review, mergedResult);
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
  if (!getEnv('OPENAI_API_KEY')) {
    return {
      ...fallback,
      generationMetadata: {
        ...fallback.generationMetadata,
        reason: 'missing_openai_key'
      }
    };
  }

  if (analysis.riskLevel === 'critical') {
    return {
      ...fallback,
      generationMetadata: {
        ...fallback.generationMetadata,
        reason: 'critical_risk_gate'
      }
    };
  }

  try {
    const serviceContext = resolveServicePromptContext(business.vertical);
    const result = await fetchOpenAIJson<{
      draftText: string;
      tone: string;
      ctaType: string;
      safetyNotes: string[];
    }>([
      {
        role: 'system',
        content:
          [
            `You write safe review replies for ${serviceContext.displayLabel} businesses in the home services industry.`,
            'Return valid JSON only with keys: draftText, tone, ctaType, safetyNotes.',
            'Allowed ctaType: none|offline_contact|follow_up.',
            'Use the provided vertical to tailor terminology lightly while keeping the same shared workflow and safety rules.',
            'Use natural, human wording and avoid robotic phrasing.',
            'If customerFirstName is provided, address the customer by first name once.',
            'Do not invent facts, admit liability, promise refunds, or mention compensation unless explicitly provided.'
          ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify(
          buildDraftPromptPayload({
            review,
            business,
            settings,
            analysis
          })
        )
      }
    ]);

    if (!result.data?.draftText) {
      return fallback;
    }

    const modelName = result.modelName ?? getConfiguredOpenAIModel();
    const resolvedSignoffName = settings.signoffName.trim() || business.name;
    return {
      draftText: ensureSignoff(
        sanitizeDraftText(result.data.draftText, settings),
        resolvedSignoffName
      ),
      tone: result.data.tone || fallback.tone,
      ctaType: result.data.ctaType || fallback.ctaType,
      safetyNotes:
        result.data.safetyNotes?.length > 0
          ? result.data.safetyNotes
          : fallback.safetyNotes,
      modelName,
      generationMetadata: {
        source: 'openai',
        promptVersion: DRAFT_PROMPT_VERSION,
        modelName,
        usage: result.usage
      }
    };
  } catch (error) {
    const openaiError = extractOpenAIErrorMetadata(error);
    if (openaiError) {
      console.error('OpenAI draft generation failed', openaiError);
    }

    return {
      ...fallback,
      generationMetadata: {
        ...fallback.generationMetadata,
        reason: 'openai_request_failed',
        ...(openaiError ? { openaiError } : {})
      }
    };
  }
}
