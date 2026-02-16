// ===========================================
// EVIDENCE ARCHIVE TYPES (for internal records)
// ===========================================

export interface EvidenceItem {
  type: 'url' | 'quote' | 'policy_excerpt';
  source: string;        // URL or "Privacy Policy" etc.
  content: string;       // The actual quote or excerpt
  capturedAt: string;    // ISO date when captured
}

// ===========================================
// VAULT-COMPATIBLE EXPORT FORMAT (ToolDetailed)
// This is the exact format The Pedagogical Vault hub expects
// ===========================================

export interface ToolDetailed {
  // Basic Information
  name: string;
  slug: string;  // URL-friendly: lowercase with hyphens
  category: string;  // One of 7 categories
  audience: 'teacher' | 'student' | 'both';
  isAI: boolean;
  description: string;  // 1-2 sentences
  standouts: string;  // What makes it pedagogically unique
  
  // Cost and Evidence
  cost: string;  // e.g., "Free", "$10/month"
  costRating: number;  // 1-5
  dataPractices: string;  // Privacy compliance summary
  dataRating: number;  // 1-5
  evidenceTier: string;  // Research tier description
  evidenceRating: number;  // 1-5
  
  // Four Gatekeepers (all must pass)
  gatekeepers: {
    accessibility: { pass: boolean; rationale: string };
    privacy: { pass: boolean; rationale: string };
    aiResponsibility: { pass: boolean | null; rationale: string | null };  // null if not AI
    contentSafety: { pass: boolean; rationale: string };
  };
  
  // Six Scoring Dimensions (1-5 each) with Rationales
  scores: {
    ldi: { score: number; rationale: string };  // Learning Design Integrity
    efficacy: { score: number; rationale: string };  // Instructional Efficacy
    fa: { score: number; rationale: string };  // Feedback and Assessment
    equity: { score: number; rationale: string };  // Equity and Access
    tech: { score: number; rationale: string };  // Tech and Ethical Design
    integration: { score: number; rationale: string };  // Integration and Usability
  };
  
  // Summary
  bottomLine: string;  // Paragraph for educators
  strengths: string[];  // Top 3 strengths
  improvements: string[];  // Top 2 areas for improvement
  
  // Calculated (auto-compute these)
  overallScore: number;  // 0-100 scale
  passesAllGatekeepers: boolean;
  qualifiesForVault: boolean;  // true if passesAllGatekeepers AND overallScore >= 70
}

// ===========================================
// ARCHIVE FORMAT (extends ToolDetailed with evidence)
// ===========================================

export interface ToolArchive extends ToolDetailed {
  // Archive metadata
  archivedAt: string;  // ISO date
  evaluatorNotes?: string;
  
  // Evidence for gatekeepers (internal audit trail)
  gatekeeperEvidence: {
    accessibility: EvidenceItem[];
    privacy: EvidenceItem[];
    aiResponsibility: EvidenceItem[];
    contentSafety: EvidenceItem[];
  };
  
  // Evidence for scores (internal audit trail)
  scoreEvidence: {
    ldi: EvidenceItem[];
    efficacy: EvidenceItem[];
    fa: EvidenceItem[];
    equity: EvidenceItem[];
    tech: EvidenceItem[];
    integration: EvidenceItem[];
  };
  
  // Verification checklist
  verificationChecklist?: {
    privacyPolicyVerified: boolean;
    accessibilityClaimsVerified: boolean;
    pricingVerified: boolean;
    researchEvidenceVerified: boolean;
  };
}

// ===========================================
// INPUT FORM STATE (for collecting user evidence before evaluation)
// ===========================================

export interface GatekeeperInput {
  providedEvidence: string;  // User-pasted content
  sourceUrl?: string;
}

export interface EvaluationInput {
  toolName: string;
  toolUrl: string;
  category: string;
  
  // Optional gatekeeper evidence (strongly encouraged)
  gatekeeperEvidence?: {
    accessibility?: GatekeeperInput;
    privacy?: GatekeeperInput;
    aiResponsibility?: GatekeeperInput;
    contentSafety?: GatekeeperInput;
  };
  
  // Optional additional context
  pricingInfo?: string;
  researchLinks?: string;
}

// ===========================================
// REVIEW STATE (working state during review/edit)
// ===========================================

export interface ReviewState {
  // Basic info
  name: string;
  slug: string;
  category: string;
  audience: 'teacher' | 'student' | 'both';
  isAI: boolean;
  description: string;
  standouts: string;
  
  // Cost and data
  cost: string;
  costRating: number;
  dataPractices: string;
  dataRating: number;
  evidenceTier: string;
  evidenceRating: number;
  
  // Gatekeepers with evidence
  gatekeepers: {
    accessibility: { pass: boolean; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    privacy: { pass: boolean; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    aiResponsibility: { pass: boolean | null; rationale: string | null; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    contentSafety: { pass: boolean; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
  };
  
  // Scores with evidence
  scores: {
    ldi: { score: number; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    efficacy: { score: number; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    fa: { score: number; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    equity: { score: number; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    tech: { score: number; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
    integration: { score: number; rationale: string; confidence: 'high' | 'medium' | 'low'; evidence: EvidenceItem[] };
  };
  
  // Summary
  bottomLine: string;
  strengths: string[];
  improvements: string[];
  
  // Calculated (auto-updated)
  overallScore: number;
  passesAllGatekeepers: boolean;
  qualifiesForVault: boolean;
  
  // Verification
  verificationChecklist: {
    privacyPolicyVerified: boolean;
    accessibilityClaimsVerified: boolean;
    pricingVerified: boolean;
    researchEvidenceVerified: boolean;
  };
}

// ===========================================
// LEGACY TYPES (kept for backwards compatibility)
// ===========================================

export interface GatekeeperResult {
  passes: boolean | 'N/A';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  notes: string;
}

export interface ResearchLink {
  title: string;
  url: string;
  description?: string;
}

export interface DimensionScore {
  score: number;
  rawScore?: number;
  cappedScore?: number;
  rationale: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  frameworksApplied?: string[];
  researchLinks?: ResearchLink[];  // Links to studies/research for this dimension
}

export interface EvaluationResult {
  toolName: string;
  slug: string;
  officialUrl: string;
  category: string;
  audience: 'teacher' | 'student' | 'both';
  isAI: boolean;
  description: string;
  standouts: string;
  
  cost: string;
  costRating: number;
  
  gatekeepers: {
    accessibility: GatekeeperResult;
    privacy: GatekeeperResult;
    aiResponsibility: GatekeeperResult;
    contentSafety: GatekeeperResult;
  };
  
  evidenceTier: number;
  evidenceTierRationale: string;
  efficacyCap: number;
  researchStudies?: ResearchLink[];  // Links to efficacy research/studies
  
  dimensions: {
    ldi: DimensionScore;
    efficacy: DimensionScore;
    fa: DimensionScore;
    equity: DimensionScore;
    tech: DimensionScore;
    integration: DimensionScore;
  };
  
  overallScore: number;
  classification: 'exemplar' | 'strong' | 'adequate' | 'weak';
  qualifiesForVault: boolean;
  
  bottomLine: string;
  strengths: string[];
  improvements: string[];
  
  dataPractices: string;
  dataRating: number;
  
  sourceUrls: string[];
  
  // Evaluation context for audience-specific interpretation
  evaluationContext?: {
    primaryAudience: 'student-facing' | 'teacher-facing';
    interpretationNote: string;
  };
}

export type ToolCategory =
  | 'Learning Experience Designers'
  | 'Assessment & Feedback Innovators'
  | 'Learning Analytics & Data Insights'
  | 'Inclusive Learning Aids'
  | 'Multilingual Learning Allies'
  | 'Educator Copilots'
  | 'AI Tutors & Student Mentors';

// Hub-compatible JSON format for Vercel curation site
export interface HubToolData {
  // Basic Information
  name: string;
  slug: string;
  category: string;
  audience: 'teacher' | 'student' | 'both';
  isAI: boolean;
  description: string;
  standouts: string;

  // Cost and Evidence
  cost: string;
  costRating: number;
  dataPractices: string;
  dataRating: number;
  evidenceTier: string;
  evidenceRating: number;
  researchStudies?: ResearchLink[];

  // Four Gatekeepers
  gk_accessibility: boolean;
  gk_privacy: boolean;
  gk_aiResponsibility: boolean | null;
  gk_contentSafety: boolean;

  // Six Scoring Dimensions
  ldi: number;
  efficacy: number;
  fa: number;
  equity: number;
  tech: number;
  integration: number;

  // Rationales
  ldiRationale: string;
  efficacyRationale: string;
  faRationale: string;
  equityRationale: string;
  techRationale: string;
  integrationRationale: string;

  // Evidence Screenshots (optional arrays)
  ldiEvidence: string[];
  efficacyEvidence: string[];
  faEvidence: string[];
  equityEvidence: string[];
  techEvidence: string[];
  integrationEvidence: string[];

  // Summary
  bottomLine: string;
  strengths: string[];
  improvements: string[];

  // Calculated Fields
  overallScore: number;
  passesAllGatekeepers: boolean;
  qualifiesForVault: boolean;
  
  // Evaluation context
  evaluationContext?: {
    primaryAudience: 'student-facing' | 'teacher-facing';
    interpretationNote: string;
  };
}

// Categories matching hub spec
export const TOOL_CATEGORIES = [
  'Learning Experience Designers',
  'Assessment and Feedback Innovators',
  'Learning Analytics and Data Insights',
  'Inclusive Learning Aids',
  'Multilingual Learning Allies',
  'Educator Copilots',
  'AI Tutors and Student Mentors',
] as const;

// Evidence tier descriptions
export const EVIDENCE_TIERS: Record<number, string> = {
  0: 'No evidence - Marketing claims only',
  1: 'Tier 1 - Logic model or theory of action only',
  2: 'Tier 2 - Correlational studies showing associations',
  3: 'Tier 3 - Quasi-experimental studies with comparison groups',
  4: 'Tier 4 - Randomized controlled trials showing positive effects',
  5: 'Tier 5 - Multiple RCTs or meta-analysis',
};

// Tool Audience Classification
export type ToolAudienceType = 'student-facing' | 'teacher-facing';

export const TOOL_AUDIENCE_MAP: Record<string, ToolAudienceType> = {
  // Student-Facing (default rubric interpretation)
  'AI Tutors and Student Mentors': 'student-facing',
  'AI Tutors & Student Mentors': 'student-facing',
  'Learning Experience Designers': 'student-facing',
  'Assessment and Feedback Innovators': 'student-facing',
  'Assessment & Feedback Innovators': 'student-facing',
  'Inclusive Learning Aids': 'student-facing',
  'Multilingual Learning Allies': 'student-facing',
  
  // Teacher-Facing (decision-support interpretation)
  'Learning Analytics and Data Insights': 'teacher-facing',
  'Learning Analytics & Data Insights': 'teacher-facing',
  'Educator Copilots': 'teacher-facing',
};

export function getToolAudience(category: string): ToolAudienceType {
  return TOOL_AUDIENCE_MAP[category] || 'student-facing';
}

// Dimension Interpretation Guidance
export interface DimensionInterpretation {
  question: string;
  guidance: string[];
}

export const DIMENSION_INTERPRETATIONS: Record<string, Record<ToolAudienceType, DimensionInterpretation>> = {
  ldi: {
    'student-facing': {
      question: 'Is the tool instructionally sound and aligned with learning science?',
      guidance: [
        'Does it scaffold higher-order thinking (Bloom\'s Analyze, Evaluate, Create)?',
        'Does it align with UDL principles (multiple means of engagement, representation, expression)?',
        'Does it support high-effect-size strategies from Hattie/Marzano?',
        'What DOK level does it support (1-4)?',
        'Does it enable SAMR Modification/Redefinition level use?',
      ],
    },
    'teacher-facing': {
      question: 'Does the tool surface pedagogically meaningful data that supports instructional decisions?',
      guidance: [
        'Does it organize data around learning objectives and standards?',
        'Does it help teachers identify skill gaps and plan targeted instruction?',
        'Does it provide actionable insights (not just raw data)?',
        'Does it align metrics with what matters for learning (not just engagement)?',
        'Does it support data-driven instructional planning?',
      ],
    },
  },
  
  efficacy: {
    'student-facing': {
      question: 'Is there credible evidence it improves learning outcomes?',
      guidance: [
        'What ESSA evidence tier does it meet (1-4)?',
        'Are there peer-reviewed studies showing learning gains?',
        'Is there evidence beyond marketing claims?',
        'Do case studies show measurable improvement?',
        'Is evidence from similar contexts (grade level, subject, demographics)?',
      ],
    },
    'teacher-facing': {
      question: 'Is there evidence teachers make better instructional decisions when using this tool?',
      guidance: [
        'Do teachers report making more targeted interventions?',
        'Is there evidence of improved instructional planning efficiency?',
        'Do teachers identify at-risk students earlier?',
        'Is there time savings WITHOUT sacrificing instructional quality?',
        'Do teachers report increased confidence in data-driven decisions?',
      ],
    },
  },
  
  fa: {
    'student-facing': {
      question: 'Does it provide meaningful, actionable feedback to learners?',
      guidance: [
        'Is feedback timely (immediate or near-immediate)?',
        'Is feedback specific and actionable (not just correct/incorrect)?',
        'Does it explain WHY answers are correct/incorrect?',
        'Does it suggest next steps for improvement?',
        'Does it support student self-assessment and metacognition?',
      ],
    },
    'teacher-facing': {
      question: 'Does it provide clear, interpretable reporting that enables teacher action?',
      guidance: [
        'Are reports easy to interpret without extensive training?',
        'Does it flag at-risk students automatically?',
        'Can teachers drill down from class-level to individual student data?',
        'Does it show progress over time (not just snapshots)?',
        'Does it suggest instructional interventions based on data?',
      ],
    },
  },
  
  equity: {
    'student-facing': {
      question: 'Can all students—regardless of background, ability, or language—use and benefit?',
      guidance: [
        'Does it meet WCAG 2.1 AA accessibility standards?',
        'Does it support multilingual learners?',
        'Is content culturally responsive and representative?',
        'Does it work on low-bandwidth connections and older devices?',
        'Does it avoid bias in content and algorithms?',
      ],
    },
    'teacher-facing': {
      question: 'Does the tool surface equitable data views and avoid algorithmic bias?',
      guidance: [
        'Can data be disaggregated by student subgroups?',
        'Does it flag equity gaps in performance?',
        'Are algorithms audited for bias across demographics?',
        'Is the dashboard itself accessible (WCAG compliant)?',
        'Does it avoid reinforcing deficit-based views of students?',
      ],
    },
  },
  
  tech: {
    'student-facing': {
      question: 'Is the tool ethically built, transparent, and user-safe?',
      guidance: [
        'Is it FERPA/COPPA compliant?',
        'Is AI use clearly labeled and explainable?',
        'Can humans override AI decisions?',
        'Are there content safety guardrails?',
        'Is there no dark pattern or predatory design?',
      ],
    },
    'teacher-facing': {
      question: 'Does the tool meet data governance standards and integrate ethically?',
      guidance: [
        'Is it FERPA/COPPA compliant with clear data retention policies?',
        'Does it support standard data interoperability (LTI, OneRoster, SIF)?',
        'Is student data protected during transfer and storage?',
        'Are data sources and calculations transparent?',
        'Does it allow data export and portability?',
      ],
    },
  },
  
  integration: {
    'student-facing': {
      question: 'Does it integrate smoothly into student learning workflows?',
      guidance: [
        'Is the interface intuitive for the target age group?',
        'Does it work within existing classroom routines?',
        'Is the learning curve reasonable?',
        'Does it minimize distractions and cognitive load?',
        'Does it support offline use if needed?',
      ],
    },
    'teacher-facing': {
      question: 'Does it integrate into teacher workflows and save time?',
      guidance: [
        'Does it integrate with existing LMS/SIS systems?',
        'How much setup time is required?',
        'Does it reduce (not add to) teacher administrative burden?',
        'Can teachers customize views and reports?',
        'Is there a measurable "minutes saved per week" benefit?',
      ],
    },
  },
};

// Helper to get interpretation for a dimension
export function getDimensionInterpretation(
  dimension: string,
  category: string
): DimensionInterpretation {
  const audience = getToolAudience(category);
  return DIMENSION_INTERPRETATIONS[dimension]?.[audience] || DIMENSION_INTERPRETATIONS[dimension]?.['student-facing'];
}

// Get evaluation context note
export function getEvaluationContextNote(category: string): string {
  const audience = getToolAudience(category);
  return audience === 'teacher-facing'
    ? 'This tool was evaluated using the teacher-facing interpretation of the 6D Framework, which assesses decision-support quality rather than direct instructional delivery.'
    : 'This tool was evaluated using the standard student-facing interpretation of the 6D Framework.';
}
