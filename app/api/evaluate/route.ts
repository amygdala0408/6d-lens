import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE_BASE } from '@/lib/knowledge-base';
import { getToolAudience, getEvaluationContextNote, DIMENSION_INTERPRETATIONS } from '@/lib/types';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateEvaluationInput } from '@/lib/validate';

// ─── Rate Limit Config ────────────────────────────────────
// 5 evaluations per hour per IP (each costs ~$0.05-0.10 in API usage)
const RATE_LIMIT = { limit: 5, windowSeconds: 3600 };

// ─── Anthropic Client ─────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Audience Guidance Generator ──────────────────────────
function generateAudienceGuidance(category: string): string {
  const audience = getToolAudience(category);
  const audienceLabel = audience === 'teacher-facing'
    ? 'TEACHER-FACING TOOL - Use decision-support interpretation'
    : 'STUDENT-FACING TOOL - Use standard instructional interpretation';

  let guidance = `\n\n## AUDIENCE-SPECIFIC EVALUATION GUIDANCE\n\n${audienceLabel}\n\n`;

  const dimensions = ['ldi', 'efficacy', 'fa', 'equity', 'tech', 'integration'];
  const dimensionNames: Record<string, string> = {
    ldi: 'Learning Design Integrity',
    efficacy: 'Instructional Efficacy',
    fa: 'Feedback & Assessment',
    equity: 'Equity & Access',
    tech: 'Tech & Ethical Design',
    integration: 'Integration & Usability',
  };

  for (const dim of dimensions) {
    const interp = DIMENSION_INTERPRETATIONS[dim][audience];
    guidance += `### ${dimensionNames[dim]}\n`;
    guidance += `**Core Question:** ${interp.question}\n`;
    guidance += `**Consider:**\n`;
    for (const item of interp.guidance) {
      guidance += `- ${item}\n`;
    }
    guidance += '\n';
  }

  return guidance;
}

// ─── POST Handler ─────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // ── Rate Limiting ──
    const clientIp = getClientIp(request);
    const rateResult = checkRateLimit(clientIp, RATE_LIMIT);

    if (!rateResult.allowed) {
      const retryAfter = Math.ceil((rateResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'You\u2019ve reached the evaluation limit. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateResult.resetAt / 1000)),
          },
        }
      );
    }

    // ── Input Validation ──
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request format.' },
        { status: 400 }
      );
    }

    const validation = validateEvaluationInput(body);
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        { error: validation.error || 'Invalid input.' },
        { status: 400 }
      );
    }

    const { toolName, toolUrl, category, providedEvidence } = validation.sanitized;

    // ── Environment Check ──
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'Service temporarily unavailable.' },
        { status: 503 }
      );
    }

    // ── Build Prompt ──
    const toolAudience = category ? getToolAudience(category) : 'student-facing';
    const audienceGuidance = category ? generateAudienceGuidance(category) : '';

    // Build user-provided evidence section
    let userEvidenceSection = '';
    if (providedEvidence) {
      const parts: string[] = [];
      if (providedEvidence.accessibility?.trim()) {
        parts.push(`### User-Provided Accessibility Evidence:\n${providedEvidence.accessibility}`);
      }
      if (providedEvidence.privacy?.trim()) {
        parts.push(`### User-Provided Privacy Evidence:\n${providedEvidence.privacy}`);
      }
      if (providedEvidence.aiResponsibility?.trim()) {
        parts.push(`### User-Provided AI Responsibility Evidence:\n${providedEvidence.aiResponsibility}`);
      }
      if (providedEvidence.contentSafety?.trim()) {
        parts.push(`### User-Provided Content Safety Evidence:\n${providedEvidence.contentSafety}`);
      }
      if (providedEvidence.pricing?.trim()) {
        parts.push(`### User-Provided Pricing Info:\n${providedEvidence.pricing}`);
      }
      if (providedEvidence.research?.trim()) {
        parts.push(`### User-Provided Research Links:\n${providedEvidence.research}`);
      }
      if (parts.length > 0) {
        userEvidenceSection = `\n\n## USER-PROVIDED EVIDENCE (TREAT AS PRIMARY SOURCE)\n\nThe user has provided the following evidence directly from the tool's website. USE THIS AS YOUR PRIMARY SOURCE OF TRUTH for the relevant gatekeepers and scores. If this evidence contradicts your training data, PRIORITIZE the user-provided evidence.\n\n${parts.join('\n\n')}`;
      }
    }

    const systemPrompt = `${KNOWLEDGE_BASE}
${audienceGuidance}
---

You are an expert EdTech evaluator for The Pedagogical Vault. You apply the 6D Framework with precision, cite evidence carefully, and maintain high standards.

CRITICAL INSTRUCTIONS:
1. **PRIORITIZE USER-PROVIDED EVIDENCE**: If the user has provided evidence below, use it as your PRIMARY source of truth. Only fall back to your training data when no user evidence is provided.
2. Research the tool thoroughly using your knowledge for areas without user-provided evidence
3. Apply ALL theoretical frameworks mentioned in the knowledge base
4. **IMPORTANT: Use the AUDIENCE-SPECIFIC interpretation above when scoring dimensions**
   - For teacher-facing tools: Evaluate decision-support quality, not direct instruction
   - For student-facing tools: Evaluate instructional quality and learning outcomes
5. Be conservative with scores when evidence is unclear - mark confidence as "low" rather than assuming failure
6. ALWAYS cite specific evidence for every claim
7. Apply the evidence tier cap to Efficacy score
8. If you cannot find information and no user evidence is provided, set confidence to "low" and explain in notes that verification is needed
9. Return ONLY valid JSON matching the schema below

OUTPUT SCHEMA:
{
  "toolName": "string",
  "slug": "string (lowercase, hyphens)",
  "officialUrl": "string",
  "category": "string (one of the 7 categories)",
  "audience": "teacher | student | both",
  "isAI": boolean,
  "description": "string (1-2 sentences)",
  "standouts": "string (what makes it pedagogically unique)",
  
  "cost": "string (pricing details)",
  "costRating": number (1-5),
  
  "gatekeepers": {
    "accessibility": {
      "passes": boolean,
      "confidence": "high | medium | low",
      "evidence": "string (quote with source)",
      "notes": "string"
    },
    "privacy": {
      "passes": boolean,
      "confidence": "high | medium | low", 
      "evidence": "string (quote with source)",
      "notes": "string"
    },
    "aiResponsibility": {
      "passes": boolean | "N/A",
      "confidence": "high | medium | low",
      "evidence": "string (quote with source)",
      "notes": "string"
    },
    "contentSafety": {
      "passes": boolean,
      "confidence": "high | medium | low",
      "evidence": "string (quote with source)",
      "notes": "string"
    }
  },
  
  "evidenceTier": number (0-5),
  "evidenceTierRationale": "string",
  "efficacyCap": number (1-5),
  "researchStudies": [
    {
      "title": "string (study name or article title)",
      "url": "string (direct URL to the study or publication)",
      "description": "string (brief description of findings)"
    }
  ],
  
  "dimensions": {
    "ldi": {
      "score": number (1-5),
      "rationale": "string (detailed, reference frameworks, use audience-appropriate criteria)",
      "evidence": "string",
      "confidence": "high | medium | low",
      "frameworksApplied": ["string array"]
    },
    "efficacy": {
      "rawScore": number (1-5),
      "cappedScore": number (1-5, must not exceed efficacyCap),
      "rationale": "string (use audience-appropriate efficacy criteria)",
      "evidence": "string",
      "confidence": "high | medium | low"
    },
    "fa": {
      "score": number (1-5),
      "rationale": "string (use audience-appropriate feedback criteria)",
      "evidence": "string",
      "confidence": "high | medium | low"
    },
    "equity": {
      "score": number (1-5),
      "rationale": "string (reference UDL, CRT, digital equity, use audience-appropriate criteria)",
      "evidence": "string",
      "confidence": "high | medium | low"
    },
    "tech": {
      "score": number (1-5),
      "rationale": "string (use audience-appropriate tech/ethics criteria)",
      "evidence": "string",
      "confidence": "high | medium | low"
    },
    "integration": {
      "score": number (1-5),
      "rationale": "string (use audience-appropriate integration criteria)",
      "evidence": "string",
      "confidence": "high | medium | low"
    }
  },
  
  "overallScore": number (0-100, calculated),
  "classification": "exemplar | strong | adequate | weak",
  "qualifiesForVault": boolean,
  
  "bottomLine": "string (2-3 sentence summary)",
  "strengths": ["string array, top 3"],
  "improvements": ["string array, top 2"],
  
  "dataPractices": "string (summary of privacy practices)",
  "dataRating": number (1-5),
  
  "sourceUrls": ["string array of URLs consulted"]
}`;

    const userPrompt = `Evaluate this EdTech tool using the complete 6D Framework:

TOOL NAME: ${toolName}
${toolUrl ? `OFFICIAL URL: ${toolUrl}` : ''}
${category ? `CATEGORY: ${category}` : ''}
${category ? `TOOL AUDIENCE TYPE: ${toolAudience.toUpperCase()}` : ''}
${userEvidenceSection}

Instructions:
1. Use your knowledge of this tool to gather information about:
   - The tool's purpose and target audience
   - Privacy policy and data practices
   - Accessibility features and WCAG compliance
   - Research/evidence of effectiveness (include direct URLs to studies if available)
   - AI features (if any)
   - Pricing model
   - Integration capabilities

IMPORTANT FOR RESEARCH: If you know of any published studies, efficacy reports, or research papers about this tool, include them in the "researchStudies" array with direct URLs. Common sources include:
   - Peer-reviewed journals (provide DOI links when possible)
   - WWC (What Works Clearinghouse) reports
   - ISTE studies
   - Publisher case studies with measurable outcomes
   - EdReports reviews
   - LearnPlatform research
   Only include links you are confident are valid.

2. Apply the 6D Framework rigorously:
   - Check all 4 gatekeepers
   - Score all 6 dimensions with detailed rationales
   - **USE THE AUDIENCE-SPECIFIC INTERPRETATION** for ${toolAudience} tools
   - Determine evidence tier and apply efficacy cap
   - Calculate overall score using weights: LDI(25%) + Eff(20%) + FA(15%) + Eq(15%) + Tech(15%) + Int(10%)
   - Score formula: (LDI×0.25 + Eff×0.20 + FA×0.15 + Eq×0.15 + Tech×0.15 + Int×0.10) × 20

3. Classification thresholds:
   - 80+ = exemplar
   - 70-79 = strong  
   - 50-69 = adequate
   - <50 = weak

4. Vault qualification: score >= 70 AND all gatekeepers pass

Return ONLY the JSON object, no additional text or markdown formatting.`;

    // ── Call Claude ──
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // ── Parse Response ──
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from evaluation model');
    }

    let evaluation;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse evaluation:', textContent.text.slice(0, 500));
      throw new Error('Failed to parse evaluation response');
    }

    // ── Validate Response Structure ──
    if (!evaluation.toolName || !evaluation.dimensions || !evaluation.gatekeepers) {
      throw new Error('Invalid evaluation structure');
    }

    // ── Add Evaluation Context ──
    const finalCategory = evaluation.category || category;
    if (finalCategory) {
      const audience = getToolAudience(finalCategory);
      evaluation.evaluationContext = {
        primaryAudience: audience,
        interpretationNote: getEvaluationContextNote(finalCategory),
      };
    }

    // ── Return with Rate Limit Headers ──
    return NextResponse.json(evaluation, {
      headers: {
        'X-RateLimit-Limit': String(RATE_LIMIT.limit),
        'X-RateLimit-Remaining': String(rateResult.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateResult.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error('Evaluation error:', error);

    const message =
      error instanceof Error && error.message.includes('parse')
        ? 'The evaluation could not be completed. Please try again.'
        : error instanceof Error
          ? error.message
          : 'Evaluation failed. Please try again.';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
