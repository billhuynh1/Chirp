export function isCriticalRiskReview(riskLevel?: string | null) {
  return riskLevel?.toLowerCase() === 'critical';
}
