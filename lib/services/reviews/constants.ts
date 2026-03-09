export const HOME_SERVICE_ISSUE_TAGS = [
  'no_show',
  'late_arrival',
  'scheduling',
  'pricing_surprise',
  'quote_dispute',
  'problem_not_fixed',
  'repeat_visit_required',
  'poor_workmanship',
  'mess_left_behind',
  'technician_professionalism',
  'communication',
  'upsell_pressure',
  'emergency_response',
  'billing_issue',
  'damage_claim',
  'safety_concern'
] as const;

export type HomeServiceIssueTag = (typeof HOME_SERVICE_ISSUE_TAGS)[number];

export const REVIEW_WORKFLOW_STATUSES = [
  'new',
  'analyzed',
  'draft_ready',
  'needs_attention',
  'approved',
  'posted_manual',
  'rejected'
] as const;

export const NEGATIVE_RISK_KEYWORDS = [
  'damage',
  'damaged',
  'unsafe',
  'dangerous',
  'injury',
  'injured',
  'fraud',
  'scam',
  'chargeback',
  'lawyer',
  'attorney',
  'bbb',
  'refund',
  'refunds',
  'discrimination',
  'rude'
];

export const ISSUE_TAG_PATTERNS: Record<HomeServiceIssueTag, string[]> = {
  no_show: ['never showed', 'no show', 'did not show', 'didn’t show'],
  late_arrival: ['late', 'delayed', 'hours late', 'showed up late'],
  scheduling: ['schedule', 'scheduling', 'appointment', 'reschedule'],
  pricing_surprise: ['expensive', 'charged more', 'price changed', 'overpriced'],
  quote_dispute: ['quote', 'estimate', 'quoted', 'bait and switch'],
  problem_not_fixed: ['not fixed', 'still leaking', 'did not fix', 'same issue'],
  repeat_visit_required: ['came back', 'second visit', 'third visit', 'multiple visits'],
  poor_workmanship: ['poor workmanship', 'sloppy', 'bad install', 'poor quality'],
  mess_left_behind: ['mess', 'dirty', 'cleanup', 'left behind'],
  technician_professionalism: ['professional', 'courteous', 'friendly', 'respectful'],
  communication: ['communication', 'did not call', 'no update', 'unresponsive'],
  upsell_pressure: ['upsell', 'pressure', 'pushed', 'tried to sell'],
  emergency_response: ['emergency', 'same day', 'after hours', 'urgent'],
  billing_issue: ['billing', 'invoice', 'charge', 'charged'],
  damage_claim: ['damage', 'damaged', 'broke', 'scratch'],
  safety_concern: ['unsafe', 'dangerous', 'gas leak', 'fire', 'hazard']
};

export const POSITIVE_KEYWORDS = [
  'great',
  'excellent',
  'professional',
  'quick',
  'helpful',
  'friendly',
  'honest',
  'recommend'
];

export const NEGATIVE_KEYWORDS = [
  'terrible',
  'awful',
  'horrible',
  'late',
  'expensive',
  'bad',
  'rude',
  'never',
  'worst',
  'unhappy'
];
