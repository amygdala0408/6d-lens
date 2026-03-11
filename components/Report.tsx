'use client';

import { useRef, useState, useCallback } from 'react';
import type { EvaluationResult } from '@/lib/types';
import { getClassificationLabel, getClassificationDescription } from '@/lib/scoring';

// ─── Dimension Metadata ───────────────────────────────────
const DIMENSION_META: Record<string, { name: string; fullName: string; weight: string; description: string }> = {
  ldi: {
    name: 'LDI',
    fullName: 'Learning Design Integrity',
    weight: '25%',
    description: 'Is the tool instructionally sound and aligned with learning science? Evaluates alignment with Hattie, Marzano, Bloom/Webb, UDL, TPACK, and SAMR.',
  },
  efficacy: {
    name: 'EFF',
    fullName: 'Instructional Efficacy',
    weight: '20%',
    description: 'Is there credible evidence it improves learning outcomes? Score is capped by the tool\'s research evidence tier \u2014 no tool can out-claim its evidence.',
  },
  fa: {
    name: 'F&A',
    fullName: 'Feedback & Assessment',
    weight: '15%',
    description: 'Does it provide meaningful, actionable feedback? Evaluates timeliness, specificity, teacher dashboards, and support for formative assessment cycles.',
  },
  equity: {
    name: 'EQU',
    fullName: 'Equity & Access',
    weight: '15%',
    description: 'Can ALL students \u2014 regardless of background, ability, or language \u2014 benefit? Evaluates accessibility, multilingual support, cultural responsiveness, and affordability.',
  },
  tech: {
    name: 'T&E',
    fullName: 'Tech & Ethical Design',
    weight: '15%',
    description: 'Is the tool ethically built, transparent, and user-safe? Evaluates data practices, dark patterns, manipulative design, and terms of service clarity.',
  },
  integration: {
    name: 'INT',
    fullName: 'Integration & Usability',
    weight: '10%',
    description: 'Does it integrate smoothly into educator workflows? Evaluates LMS compatibility, setup time, learning curve, and documentation quality.',
  },
};

const GATEKEEPER_META: Record<string, { name: string; description: string }> = {
  accessibility: {
    name: 'ACCESSIBILITY',
    description: 'WCAG 2.1 Level AA compliance, VPAT availability, screen reader support, keyboard navigation.',
  },
  privacy: {
    name: 'PRIVACY & SECURITY',
    description: 'FERPA/COPPA compliance, transparent data practices, DPA availability, no student data sold.',
  },
  aiResponsibility: {
    name: 'RESPONSIBLE AI',
    description: 'AI labeled and explainable, bias auditing, human override capability, content guardrails.',
  },
  contentSafety: {
    name: 'CONTENT & SAFETY',
    description: 'Age-appropriate content, moderation systems, no dark patterns or predatory monetization.',
  },
};

// ─── Props ────────────────────────────────────────────────
interface ReportProps {
  result: EvaluationResult;
  onNewEvaluation: () => void;
}

// ─── Component ────────────────────────────────────────────
export default function Report({ result, onNewEvaluation }: ReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());
  const [copiedToast, setCopiedToast] = useState(false);

  const toggleDimension = useCallback((key: string) => {
    setExpandedDimensions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedDimensions(new Set(Object.keys(DIMENSION_META)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedDimensions(new Set());
  }, []);

  const allExpanded = expandedDimensions.size === Object.keys(DIMENSION_META).length;

  // ─── Share as Text ────────────────────────────────────
  const handleShare = useCallback(async () => {
    const classification = getClassificationLabel(result.classification);
    const text = [
      `${result.toolName}: The 6D Lens Evaluation Report`,
      `Score: ${result.overallScore}/100 (${classification})`,
      ``,
      `${result.bottomLine}`,
      ``,
      `Strengths:`,
      ...result.strengths.map(s => `  + ${s}`),
      ``,
      `Areas for improvement:`,
      ...result.improvements.map(i => `  - ${i}`),
      ``,
      `Evaluated by The 6D Lens | The Pedagogical Vault`,
      `Note: This evaluation is a starting point. Verify findings with primary sources.`,
    ].join('\n');

    // Try native share first, fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: `${result.toolName}: The 6D Lens Report`, text });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      // Fallback: select text in a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  }, [result]);

  // ─── PDF Download ─────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setDownloading(true);

    try {
      setExpandedDimensions(new Set(Object.keys(DIMENSION_META)));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Hide UI-only elements before capture
      const noPrintEls = reportRef.current.querySelectorAll('.no-print');
      noPrintEls.forEach(el => ((el as HTMLElement).style.display = 'none'));

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F0EDEB',
        logging: false,
        windowWidth: 1200,
      });

      noPrintEls.forEach(el => ((el as HTMLElement).style.display = ''));

      const margin = 10; // mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // How many source pixels fit on one page of content
      const mmPerPx = contentWidth / canvas.width;
      const pxPerPage = Math.floor(contentHeight / mmPerPx);
      const totalPages = Math.ceil(canvas.height / pxPerPage);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const srcY = page * pxPerPage;
        const srcH = Math.min(pxPerPage, canvas.height - srcY);

        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = srcH;
        const ctx = slice.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        }

        const sliceImg = slice.toDataURL('image/png');
        const sliceHeight = srcH * mmPerPx;
        pdf.addImage(sliceImg, 'PNG', margin, margin, contentWidth, sliceHeight);
      }

      pdf.save(`${result.slug || 'evaluation'}-6d-report.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  }, [result.slug]);

  // ─── Helpers ──────────────────────────────────────────
  const classification = result.classification;
  const classificationLabel = getClassificationLabel(classification);
  const classificationDesc = getClassificationDescription(classification);

  const getScore = (dim: string): number => {
    const d = result.dimensions[dim as keyof typeof result.dimensions];
    if (dim === 'efficacy') {
      return ('cappedScore' in d ? d.cappedScore : d.score) ?? d.score;
    }
    return d.score;
  };

  const getRationale = (dim: string): string => {
    return result.dimensions[dim as keyof typeof result.dimensions].rationale;
  };

  const getEvidence = (dim: string): string => {
    return result.dimensions[dim as keyof typeof result.dimensions].evidence;
  };

  const getConfidence = (dim: string): string => {
    return result.dimensions[dim as keyof typeof result.dimensions].confidence;
  };

  const getFrameworks = (dim: string): string[] => {
    const d = result.dimensions[dim as keyof typeof result.dimensions];
    return ('frameworksApplied' in d && d.frameworksApplied) ? d.frameworksApplied : [];
  };

  return (
    <div>
      {/* ── Copied Toast ── */}
      {copiedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-lens-ink text-white text-sm font-semibold shadow-lg toast-enter">
          Report summary copied to clipboard
        </div>
      )}

      {/* ── Action Bar (sticky) ── */}
      <div className="no-print sticky top-0 z-50 bg-lens-ink text-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={onNewEvaluation}
            className="text-sm font-semibold uppercase tracking-wider hover:text-lens-red transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span>&larr;</span> NEW EVALUATION
          </button>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <span className="text-sm text-gray-400 hidden sm:block">
              {result.toolName} &middot; {result.overallScore}/100
            </span>
            <button
              onClick={handleShare}
              className="px-4 py-2 border border-gray-600 text-white font-semibold text-sm uppercase tracking-wider hover:border-lens-red hover:text-lens-red transition-colors"
              title="Share report summary"
            >
              SHARE
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-5 py-2 bg-lens-red text-white font-semibold text-sm uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {downloading ? 'GENERATING...' : 'DOWNLOAD PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Report Content ── */}
      <div ref={reportRef} className="bg-lens-paper">

        {/* ===== REPORT HEADER ===== */}
        <div className="border-b-3 border-lens-ink">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold uppercase tracking-widest text-lens-grey mb-2">
                  THE 6D LENS EVALUATION REPORT
                </div>
                <h1 className="font-display text-5xl md:text-7xl leading-none mb-3">
                  {result.toolName.toUpperCase()}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="px-3 py-1 border-2 border-lens-ink font-semibold">
                    {result.category}
                  </span>
                  {result.isAI && (
                    <span className="px-3 py-1 border-2 border-lens-red text-lens-red font-semibold">
                      AI-POWERED
                    </span>
                  )}
                  <span className="text-lens-grey">
                    {result.audience === 'teacher'
                      ? 'Teacher-Facing'
                      : result.audience === 'student'
                        ? 'Student-Facing'
                        : 'Teacher & Student'}
                  </span>
                </div>
                <p className="mt-4 text-lens-grey max-w-xl leading-relaxed">
                  {result.description}
                </p>
                {result.evaluationContext && (
                  <p className="mt-2 text-xs text-lens-grey italic">
                    {result.evaluationContext.interpretationNote}
                  </p>
                )}
              </div>

              {/* Score block */}
              <div className="text-right flex-shrink-0">
                <div className="font-display text-8xl md:text-9xl leading-none">
                  {result.overallScore}
                </div>
                <div className="text-sm text-lens-grey -mt-1">OUT OF 100</div>
                <div
                  className={`inline-block mt-3 px-5 py-2 font-display text-2xl tracking-wider badge-${classification}`}
                >
                  {classificationLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== CLASSIFICATION CONTEXT ===== */}
        <div className="bg-lens-ink text-white">
          <div className="max-w-5xl mx-auto px-6 py-5">
            <p className="text-sm leading-relaxed max-w-3xl">{classificationDesc}</p>
            {result.qualifiesForVault && (
              <p className="text-lens-red font-semibold text-sm mt-2 uppercase tracking-wider">
                Vault Qualified: Passes all gatekeepers with score &ge; 70
              </p>
            )}
          </div>
        </div>

        {/* ===== GATEKEEPERS ===== */}
        <div className="border-b-3 border-lens-ink">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <h2 className="font-display text-4xl mb-2">GATEKEEPERS</h2>
            <p className="text-sm text-lens-grey mb-6 max-w-2xl">
              Four non-negotiable requirements every tool must pass before dimensional scoring.
              A failure on any gatekeeper is a fundamental concern regardless of other scores.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(GATEKEEPER_META).map(([key, meta]) => {
                const gk = result.gatekeepers[key as keyof typeof result.gatekeepers];
                const passes = gk.passes;
                const isNA = passes === 'N/A';
                const isPassing = passes === true;

                return (
                  <div key={key} className="border-2 border-lens-ink">
                    <div
                      className={`px-4 py-3 font-semibold text-sm uppercase tracking-wider ${
                        isNA ? 'gk-na' : isPassing ? 'gk-pass' : 'gk-fail'
                      }`}
                    >
                      {isNA ? 'N/A' : isPassing ? 'PASS' : 'FAIL'}: {meta.name}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-lens-grey mb-2">{meta.description}</p>
                      <p className="text-sm leading-relaxed">{gk.notes || gk.evidence}</p>
                      <div className="mt-2 text-xs uppercase tracking-wider text-lens-grey">
                        Confidence: {gk.confidence}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== DIMENSION SCORES ===== */}
        <div className="border-b-3 border-lens-ink">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <div>
                <h2 className="font-display text-4xl">SIX DIMENSIONS</h2>
                <p className="text-sm text-lens-grey mt-1">
                  Scored 1&ndash;5 across weighted dimensions. Click to expand detailed analysis.
                </p>
              </div>
              <button
                onClick={allExpanded ? collapseAll : expandAll}
                className="no-print text-sm font-semibold uppercase tracking-wider text-lens-red hover:underline"
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(DIMENSION_META).map(([key, meta]) => {
                const score = getScore(key);
                const isExpanded = expandedDimensions.has(key);
                const barWidth = (score / 5) * 100;

                return (
                  <div key={key} className="border-2 border-lens-ink">
                    {/* Score bar header */}
                    <button
                      onClick={() => toggleDimension(key)}
                      className="w-full text-left px-4 py-4 flex items-center gap-4 hover:bg-lens-light transition-colors"
                      aria-expanded={isExpanded}
                      aria-controls={`dim-${key}`}
                    >
                      <div className="font-display text-2xl w-12 flex-shrink-0 text-lens-red">
                        {meta.name}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-semibold text-sm truncate">{meta.fullName}</span>
                          <span className="text-sm text-lens-grey ml-2 flex-shrink-0">
                            {meta.weight} weight
                          </span>
                        </div>
                        <div className="score-bar">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor:
                                score >= 4
                                  ? 'var(--lens-ink)'
                                  : score >= 3
                                    ? 'var(--lens-grey)'
                                    : 'var(--lens-red)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="font-display text-4xl flex-shrink-0 w-16 text-right">
                        {score}<span className="text-lg text-lens-grey">/5</span>
                      </div>
                      <div className="no-print text-lens-grey flex-shrink-0">
                        {isExpanded ? '\u2212' : '+'}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div id={`dim-${key}`} className="px-4 pb-4 border-t-2 border-lens-ink fade-in">
                        <div className="pt-4">
                          <p className="text-sm text-lens-grey italic mb-3">{meta.description}</p>

                          {/* Rationale */}
                          <div className="bg-white border-l-3 border-lens-ink pl-4 py-3 pr-4 mb-3">
                            <p className="text-sm leading-relaxed">{getRationale(key)}</p>
                          </div>

                          {/* Evidence */}
                          {getEvidence(key) && (
                            <div className="bg-white border-l-3 border-lens-grey pl-4 py-3 pr-4 mb-3">
                              <div className="text-xs font-semibold uppercase tracking-wider text-lens-grey mb-1">Evidence</div>
                              <p className="text-sm leading-relaxed text-lens-grey">{getEvidence(key)}</p>
                            </div>
                          )}

                          {/* Frameworks applied */}
                          {getFrameworks(key).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {getFrameworks(key).map((fw, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 text-xs border border-lens-ink font-semibold uppercase tracking-wider"
                                >
                                  {fw}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Efficacy-specific: evidence tier */}
                          {key === 'efficacy' && result.evidenceTier !== undefined && (
                            <div className="mt-3 text-sm">
                              <span className="font-semibold">Evidence Tier: </span>
                              <span className="text-lens-grey">
                                {result.evidenceTierRationale || `Tier ${result.evidenceTier}`}
                              </span>
                              {result.efficacyCap && (
                                <span className="ml-2 text-lens-red font-semibold">
                                  (Efficacy capped at {result.efficacyCap}/5)
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-2 text-xs uppercase tracking-wider text-lens-grey">
                            Confidence: {getConfidence(key)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== RESEARCH STUDIES ===== */}
        {result.researchStudies && result.researchStudies.length > 0 && (
          <div className="border-b-3 border-lens-ink">
            <div className="max-w-5xl mx-auto px-6 py-10">
              <h2 className="font-display text-4xl mb-2">RESEARCH &amp; EVIDENCE</h2>
              <p className="text-sm text-lens-grey mb-6">
                Published studies and evidence sources identified for this tool.
              </p>
              <div className="space-y-3">
                {result.researchStudies.map((study, i) => (
                  <div key={i} className="border-2 border-lens-ink p-4 bg-white">
                    <div className="font-semibold text-sm mb-1">{study.title}</div>
                    {study.description && (
                      <p className="text-sm text-lens-grey leading-relaxed mb-2">{study.description}</p>
                    )}
                    {study.url && (
                      <a
                        href={study.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-lens-red font-semibold uppercase tracking-wider hover:underline"
                      >
                        View Source &rarr;
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== BOTTOM LINE ===== */}
        <div className="border-b-3 border-lens-ink">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <h2 className="font-display text-4xl mb-4">THE BOTTOM LINE</h2>
            <div className="bg-white border-3 border-lens-ink p-6">
              <p className="text-lg leading-relaxed">{result.bottomLine}</p>
            </div>
          </div>
        </div>

        {/* ===== STRENGTHS & IMPROVEMENTS ===== */}
        <div className="border-b-3 border-lens-ink">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-display text-3xl mb-4">STRENGTHS</h3>
                <ul className="space-y-3">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="font-display text-xl text-lens-green flex-shrink-0 mt-0.5">+</span>
                      <span className="text-sm leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-3xl mb-4">AREAS FOR IMPROVEMENT</h3>
                <ul className="space-y-3">
                  {result.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="font-display text-xl text-lens-red flex-shrink-0 mt-0.5">&minus;</span>
                      <span className="text-sm leading-relaxed">{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ADDITIONAL DATA ===== */}
        <div className="border-b-3 border-lens-ink">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="border-2 border-lens-ink p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-lens-grey mb-1">COST</div>
                <div className="font-semibold">{result.cost}</div>
                <div className="text-sm text-lens-grey mt-1">
                  Affordability: {result.costRating}/5
                </div>
              </div>
              <div className="border-2 border-lens-ink p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-lens-grey mb-1">DATA PRACTICES</div>
                <div className="text-sm leading-relaxed">{result.dataPractices}</div>
                <div className="text-sm text-lens-grey mt-1">
                  Rating: {result.dataRating}/5
                </div>
              </div>
              <div className="border-2 border-lens-ink p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-lens-grey mb-1">WHAT STANDS OUT</div>
                <div className="text-sm leading-relaxed">{result.standouts}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SCORE FORMULA ===== */}
        <div className="border-b-3 border-lens-ink bg-lens-light">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <h3 className="font-display text-2xl mb-3">SCORE METHODOLOGY</h3>
            <div className="text-sm text-lens-grey space-y-2">
              <p>
                <strong className="text-lens-ink">Formula:</strong>{' '}
                ((LDI &times; 0.25) + (Efficacy &times; 0.20) + (F&amp;A &times; 0.15) + (Equity &times; 0.15) + (Tech &times; 0.15) + (Integration &times; 0.10)) &times; 20
              </p>
              <p>
                <strong className="text-lens-ink">Thresholds:</strong>{' '}
                80+ = Exemplar &middot; 70-79 = Strong &middot; 50-69 = Adequate &middot; &lt;50 = Weak
              </p>
              <p>
                <strong className="text-lens-ink">Qualification:</strong>{' '}
                Score &ge; 70 AND all four gatekeepers pass
              </p>
              <p className="text-xs mt-4 pt-3 border-t border-lens-grey/30">
                Built on the 6 Dimensions of Intention &amp; Integrity in Learning Design.
                Grounded in Hattie&apos;s Visible Learning, Marzano&apos;s High-Yield Strategies,
                UDL, TPACK, SAMR, and ESSA Evidence Tiers.
              </p>
              <p className="text-xs mt-2 italic">
                This evaluation is intended as a starting point for professional decision-making.
                Educators should verify findings against primary sources and conduct independent research
                before making adoption decisions.
              </p>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="bg-lens-ink text-white">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="font-display text-2xl">THE 6D LENS</span>
              <span className="text-lens-grey text-sm ml-3">
                Evaluating EdTech for Instructional Design &amp; Pedagogy
              </span>
            </div>
            <div className="text-sm text-lens-grey">
              The Pedagogical Vault
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Action Bar ── */}
      <div className="no-print max-w-5xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={onNewEvaluation}
          className="font-semibold text-sm uppercase tracking-wider hover:text-lens-red transition-colors"
        >
          &larr; EVALUATE ANOTHER TOOL
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="px-5 py-3 border-2 border-lens-ink font-semibold text-sm uppercase tracking-wider hover:bg-lens-ink hover:text-white transition-colors"
          >
            SHARE SUMMARY
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-6 py-3 bg-lens-ink text-white font-semibold text-sm uppercase tracking-wider hover:bg-lens-red transition-colors disabled:opacity-50"
          >
            {downloading ? 'GENERATING...' : 'DOWNLOAD PDF REPORT'}
          </button>
        </div>
      </div>
    </div>
  );
}
