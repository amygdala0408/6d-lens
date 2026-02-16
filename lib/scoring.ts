/**
 * Calculate overall score from dimension scores.
 * Formula: (ldi * 0.25) + (efficacy * 0.20) + (fa * 0.15) + (equity * 0.15) + (tech * 0.15) + (integration * 0.10)
 * Then multiply by 20 to convert 1-5 scale to 0-100
 */
export function calculateOverallScore(dimensions: {
  ldi: number;
  efficacy: number;
  fa: number;
  equity: number;
  tech: number;
  integration: number;
}): number {
  const weighted =
    dimensions.ldi * 0.25 +
    dimensions.efficacy * 0.2 +
    dimensions.fa * 0.15 +
    dimensions.equity * 0.15 +
    dimensions.tech * 0.15 +
    dimensions.integration * 0.1;
  return Math.round(weighted * 20);
}

/**
 * Determine classification based on score
 */
export function getClassification(score: number): 'exemplar' | 'strong' | 'adequate' | 'weak' {
  if (score >= 80) return 'exemplar';
  if (score >= 70) return 'strong';
  if (score >= 50) return 'adequate';
  return 'weak';
}

/**
 * Get human-readable classification label
 */
export function getClassificationLabel(classification: string): string {
  switch (classification) {
    case 'exemplar': return 'EXEMPLAR';
    case 'strong': return 'STRONG';
    case 'adequate': return 'ADEQUATE';
    case 'weak': return 'WEAK';
    default: return classification.toUpperCase();
  }
}

/**
 * Get classification description for public audience
 */
export function getClassificationDescription(classification: string): string {
  switch (classification) {
    case 'exemplar':
      return 'This tool demonstrates exceptional pedagogical intentionality across all dimensions. It is grounded in learning science and built with integrity.';
    case 'strong':
      return 'This tool shows strong alignment with research-backed pedagogy. Minor gaps exist but the overall design prioritizes learning.';
    case 'adequate':
      return 'This tool meets basic standards but has notable gaps in pedagogical design, evidence, or equity. Proceed with awareness of limitations.';
    case 'weak':
      return 'This tool shows significant deficiencies in learning design. Marketing claims exceed evidence. Not recommended without substantial improvements.';
    default:
      return '';
  }
}
