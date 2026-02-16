/**
 * Input validation and sanitization for evaluation requests.
 */

/** Maximum lengths for user-provided strings */
const MAX_TOOL_NAME = 200;
const MAX_URL = 500;
const MAX_EVIDENCE_FIELD = 5000;

/** Allowed categories (matches TOOL_CATEGORIES from types.ts) */
const VALID_CATEGORIES = new Set([
  'Learning Experience Designers',
  'Assessment and Feedback Innovators',
  'Learning Analytics and Data Insights',
  'Inclusive Learning Aids',
  'Multilingual Learning Allies',
  'Educator Copilots',
  'AI Tutors and Student Mentors',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: {
    toolName: string;
    toolUrl?: string;
    category?: string;
    providedEvidence?: Record<string, string>;
  };
}

/**
 * Strip HTML tags and trim whitespace.
 */
function sanitizeString(input: string, maxLength: number): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Strip control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a URL string.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize evaluation request input.
 */
export function validateEvaluationInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body.' };
  }

  const data = body as Record<string, unknown>;

  // Tool name — required
  if (!data.toolName || typeof data.toolName !== 'string') {
    return { valid: false, error: 'Tool name is required.' };
  }

  const toolName = sanitizeString(data.toolName, MAX_TOOL_NAME);

  if (toolName.length < 1) {
    return { valid: false, error: 'Tool name is required.' };
  }

  if (toolName.length > MAX_TOOL_NAME) {
    return { valid: false, error: `Tool name must be under ${MAX_TOOL_NAME} characters.` };
  }

  // Tool URL — optional
  let toolUrl: string | undefined;
  if (data.toolUrl && typeof data.toolUrl === 'string') {
    const trimmedUrl = data.toolUrl.trim();
    if (trimmedUrl.length > 0) {
      if (!isValidUrl(trimmedUrl)) {
        return { valid: false, error: 'Please enter a valid URL (https://...).' };
      }
      if (trimmedUrl.length > MAX_URL) {
        return { valid: false, error: 'URL is too long.' };
      }
      toolUrl = trimmedUrl;
    }
  }

  // Category — optional, must be from valid list
  let category: string | undefined;
  if (data.category && typeof data.category === 'string') {
    const trimmedCategory = data.category.trim();
    if (trimmedCategory.length > 0) {
      if (!VALID_CATEGORIES.has(trimmedCategory)) {
        return { valid: false, error: 'Invalid category selected.' };
      }
      category = trimmedCategory;
    }
  }

  // Provided evidence — optional object with string fields
  let providedEvidence: Record<string, string> | undefined;
  if (data.providedEvidence && typeof data.providedEvidence === 'object') {
    const evidence = data.providedEvidence as Record<string, unknown>;
    const sanitizedEvidence: Record<string, string> = {};
    const validFields = ['accessibility', 'privacy', 'aiResponsibility', 'contentSafety', 'pricing', 'research'];

    for (const field of validFields) {
      if (evidence[field] && typeof evidence[field] === 'string') {
        sanitizedEvidence[field] = sanitizeString(evidence[field] as string, MAX_EVIDENCE_FIELD);
      }
    }

    if (Object.keys(sanitizedEvidence).length > 0) {
      providedEvidence = sanitizedEvidence;
    }
  }

  return {
    valid: true,
    sanitized: {
      toolName,
      toolUrl,
      category,
      providedEvidence,
    },
  };
}
