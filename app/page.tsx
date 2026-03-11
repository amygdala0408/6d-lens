'use client';

import { useState, useEffect, useCallback } from 'react';
import Report from '@/components/Report';
import type { EvaluationResult } from '@/lib/types';
import { TOOL_CATEGORIES } from '@/lib/types';

type Phase = 'home' | 'evaluating' | 'report' | 'error';

// ─── Evaluation Steps (shown during loading) ─────────────
const EVALUATION_STEPS = [
  { label: 'Checking accessibility compliance', delay: 0 },
  { label: 'Reviewing privacy & data practices', delay: 3000 },
  { label: 'Evaluating AI responsibility', delay: 6000 },
  { label: 'Assessing content safety', delay: 9000 },
  { label: 'Scoring 6 dimensions of learning design', delay: 12000 },
  { label: 'Calculating evidence tier & efficacy cap', delay: 18000 },
  { label: 'Generating final classification', delay: 24000 },
];

// ─── Category Descriptions ────────────────────────────────
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Learning Experience Designers':
    'Tools that help plan, design, and deliver lessons and curriculum, such as Nearpod, Eduaide.AI, and Canva for Education.',
  'Assessment and Feedback Innovators':
    'Tools focused on grading, quizzing, and providing feedback, including platforms like Turnitin, Gradescope, and Formative.',
  'Learning Analytics and Data Insights':
    'Tools that track student progress and visualize performance data to inform instructional decisions, such as PowerSchool and Otus.',
  'Inclusive Learning Aids':
    'Tools designed for accessibility, accommodations, and special education, including Texthelp, Bookshare, and platforms centering disability justice.',
  'Multilingual Learning Allies':
    'Tools that support translation, language learning, and multilingual classrooms, serving students whose linguistic diversity is an asset.',
  'Educator Copilots':
    'Tools for teacher productivity, planning, and administration that support educators in focusing their time on instruction, such as MagicSchool and Brisk Teaching.',
  'AI Tutors and Student Mentors':
    'AI-powered instructional tools that work directly with students, such as Khanmigo and Cognii.',
};

// ─── Session Cache Helpers ────────────────────────────────
const CACHE_KEY = '6dlens_cache';
const CACHE_MAX_AGE = 1000 * 60 * 60; // 1 hour

interface CacheEntry {
  result: EvaluationResult;
  timestamp: number;
}

function getCachedResult(toolName: string): EvaluationResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Record<string, CacheEntry> = JSON.parse(raw);
    const key = toolName.toLowerCase().trim();
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_MAX_AGE) {
      delete cache[key];
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function setCachedResult(toolName: string, result: EvaluationResult) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const cache: Record<string, CacheEntry> = raw ? JSON.parse(raw) : {};
    cache[toolName.toLowerCase().trim()] = {
      result,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorage full or unavailable — silent fail
  }
}

// ─── Component ────────────────────────────────────────────
export default function Home() {
  const [phase, setPhase] = useState<Phase>('home');
  const [toolName, setToolName] = useState('');
  const [toolUrl, setToolUrl] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Cooldown timer
  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const isCoolingDown = cooldownRemaining > 0;

  // Update cooldown display
  useEffect(() => {
    if (!isCoolingDown) return;
    const timer = setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCoolingDown, cooldownUntil]);

  // Step-by-step progress during evaluation
  useEffect(() => {
    if (phase !== 'evaluating') return;
    const timers: NodeJS.Timeout[] = [];

    EVALUATION_STEPS.forEach((step, i) => {
      const timer = setTimeout(() => setCurrentStep(i), step.delay);
      timers.push(timer);
    });

    // Elapsed time counter
    const start = Date.now();
    const elapsedTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(elapsedTimer);
    };
  }, [phase]);

  const handleEvaluate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) {
      setError('Tool name is required.');
      return;
    }

    // Check sessionStorage cache first
    const cached = getCachedResult(toolName);
    if (cached) {
      setResult(cached);
      setPhase('report');
      window.scrollTo(0, 0);
      return;
    }

    setPhase('evaluating');
    setError('');
    setCurrentStep(0);
    setElapsed(0);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: toolName.trim(),
          toolUrl: toolUrl.trim() || undefined,
          category: category || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        const data = await res.json();
        const retryAfter = data.retryAfter || 3600;
        setCooldownUntil(Date.now() + retryAfter * 1000);
        throw new Error(
          'You\u2019ve reached the evaluation limit (5 per hour). Please try again later.'
        );
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Evaluation failed.' }));
        throw new Error(data.error || 'Evaluation failed.');
      }

      const data: EvaluationResult = await res.json();
      setCachedResult(toolName, data);
      setResult(data);
      setPhase('report');

      // 15-second cooldown between evaluations (client-side)
      setCooldownUntil(Date.now() + 15000);

      window.scrollTo(0, 0);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('The evaluation took too long. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
      setPhase('error');
    }
  }, [toolName, toolUrl, category]);

  const handleNewEvaluation = useCallback(() => {
    setToolName('');
    setToolUrl('');
    setCategory('');
    setResult(null);
    setError('');
    setCurrentStep(0);
    setElapsed(0);
    setPhase('home');
    window.scrollTo(0, 0);
  }, []);

  const handleRetry = useCallback(() => {
    setError('');
    setPhase('home');
  }, []);

  // =============================================
  // REPORT PHASE
  // =============================================
  if (phase === 'report' && result) {
    return <Report result={result} onNewEvaluation={handleNewEvaluation} />;
  }

  // =============================================
  // ERROR PHASE
  // =============================================
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6 fade-in">
          <div className="w-16 h-16 mx-auto mb-6 border-3 border-lens-red flex items-center justify-center">
            <span className="font-display text-3xl text-lens-red">!</span>
          </div>
          <div className="font-display text-4xl mb-3">EVALUATION FAILED</div>
          <p className="text-sm text-lens-grey leading-relaxed mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-lens-ink text-white font-display text-xl tracking-wider hover:bg-lens-red transition-colors"
            >
              TRY AGAIN
            </button>
            <button
              onClick={handleNewEvaluation}
              className="px-6 py-3 border-2 border-lens-ink font-display text-xl tracking-wider hover:bg-lens-ink hover:text-white transition-colors"
            >
              START OVER
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // EVALUATING PHASE
  // =============================================
  if (phase === 'evaluating') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-lg px-6">
          {/* Brutalist loading bars */}
          <div className="mb-8 flex items-end justify-center">
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
          </div>
          <div className="font-display text-4xl mb-3">EVALUATING</div>
          <div className="font-display text-2xl text-lens-red mb-6">
            {toolName.toUpperCase()}
          </div>

          {/* Step progress */}
          <div className="text-left max-w-sm mx-auto mb-6 space-y-2">
            {EVALUATION_STEPS.slice(0, currentStep + 1).map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm step-enter ${
                  i === currentStep ? 'text-lens-ink font-semibold' : 'text-lens-grey'
                }`}
              >
                <span
                  className={`w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    i < currentStep
                      ? 'bg-lens-ink text-white'
                      : i === currentStep
                        ? 'border-2 border-lens-red text-lens-red'
                        : 'border border-lens-grey text-lens-grey'
                  }`}
                >
                  {i < currentStep ? '\u2713' : (i + 1)}
                </span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-lens-grey mt-4">
            {elapsed}s elapsed. Typically takes 15 to 30 seconds.
          </p>
        </div>
      </div>
    );
  }

  // =============================================
  // HOME PHASE (Hero + Form)
  // =============================================
  return (
    <div>
      {/* Skip to content link (accessibility) */}
      <a href="#evaluate" className="skip-link">
        Skip to evaluation form
      </a>

      {/* ===== HERO ===== */}
      <header className="border-b-3 border-lens-ink">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-stretch gap-8 md:gap-12">

            {/* Left column: branding + headline */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-5 fade-in-up">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-lens-ink flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-3xl md:text-4xl text-lens-red leading-none">6D</span>
                </div>
                <div className="border-l-3 border-lens-red pl-4">
                  <span className="font-display text-4xl md:text-5xl tracking-tight leading-none">THE 6D LENS</span>
                  <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-lens-grey mt-0.5">
                    Evaluating EdTech for Instructional Design &amp; Pedagogy
                  </div>
                </div>
              </div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight fade-in-up stagger-1">
                IS YOUR EDTECH GROUNDED IN{' '}
                <span className="text-lens-red">RESEARCH AND BEST PRACTICE?</span>
              </h1>
              <p className="mt-4 text-base text-lens-grey max-w-xl leading-relaxed fade-in-up stagger-2">
                A structured evaluation framework grounded in decades of learning science, including
                Hattie, Marzano, UDL, and TPACK. We prioritize equity, student safety, and
                evidence-based instructional design across six weighted dimensions.
              </p>
              <a
                href="#evaluate"
                className="inline-block mt-6 px-8 py-4 bg-lens-ink text-white font-display text-2xl tracking-wider hover:bg-lens-red transition-colors fade-in-up stagger-3"
              >
                EVALUATE A TOOL &darr;
              </a>
            </div>

            {/* Right column: dimension badge grid */}
            <div className="hidden md:flex flex-col justify-center fade-in-up stagger-2">
              <div className="grid grid-cols-2 gap-2 w-56">
                {[
                  { tag: 'LDI', label: 'Learning Design', weight: '25%' },
                  { tag: 'EFF', label: 'Efficacy', weight: '20%' },
                  { tag: 'F&A', label: 'Feedback', weight: '15%' },
                  { tag: 'EQU', label: 'Equity', weight: '15%' },
                  { tag: 'T&E', label: 'Tech Ethics', weight: '15%' },
                  { tag: 'INT', label: 'Integration', weight: '10%' },
                ].map((dim) => (
                  <div
                    key={dim.tag}
                    className="border-2 border-lens-ink p-2.5 hover:border-lens-red transition-colors group"
                  >
                    <div className="font-display text-lg text-lens-red leading-none group-hover:text-lens-ink transition-colors">
                      {dim.tag}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-lens-grey mt-1 leading-tight">
                      {dim.label}
                    </div>
                    <div className="text-[10px] text-lens-grey/60 mt-0.5">{dim.weight}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lens-grey">
                  6 Dimensions &middot; 4 Gatekeepers &middot; Evidence-Capped
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ===== HOW IT WORKS STRIP ===== */}
      <section className="bg-lens-ink text-white border-b-3 border-lens-red" aria-label="How it works">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            {[
              {
                num: '01',
                title: 'GATEKEEPER CHECK',
                desc: 'Accessibility, privacy, AI ethics, content safety. All four must pass before scoring begins.',
              },
              {
                num: '02',
                title: '6 DIMENSIONS SCORED',
                desc: 'Learning design, efficacy, feedback, equity, tech ethics, and integration. Weighted by impact.',
              },
              {
                num: '03',
                title: 'EVIDENCE-CAPPED',
                desc: 'Efficacy scores are capped by research tier. No tool can out-claim its evidence base.',
              },
              {
                num: '04',
                title: 'CLASSIFICATION',
                desc: 'Exemplar, Strong, Adequate, or Weak. Transparent methodology. Defensible results.',
              },
            ].map((item) => (
              <div key={item.num}>
                <div className="font-display text-3xl text-lens-red mb-1">{item.num}</div>
                <div className="font-semibold uppercase tracking-wider">{item.title}</div>
                <div className="text-gray-400 mt-1 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== THE FRAMEWORK ===== */}
      <section className="border-b-3 border-lens-ink" aria-label="The Framework">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="font-display text-4xl mb-6">THE FRAMEWORK</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-2">Every evaluation asks two questions:</h3>
              <div className="space-y-4">
                <div className="border-l-3 border-lens-red pl-4">
                  <div className="font-display text-2xl">INTENTION</div>
                  <p className="text-sm text-lens-grey">Was learning the central purpose behind every design decision?</p>
                </div>
                <div className="border-l-3 border-lens-ink pl-4">
                  <div className="font-display text-2xl">INTEGRITY</div>
                  <p className="text-sm text-lens-grey">Was it built with equity, student safety, and ethical responsibility at its foundation?</p>
                </div>
              </div>
              <p className="mt-6 text-sm text-lens-grey leading-relaxed">
                A tool that passes both tests demonstrates{' '}
                <strong className="text-lens-ink">pedagogical intentionality</strong>: evidence
                that educators and learners were centered in every design decision, supported by
                research that points toward meaningful student outcomes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Why this matters:</h3>
              <div className="space-y-3 text-sm">
                {[
                  { stat: '2,739', desc: 'distinct EdTech tools accessed by the average K-12 district annually' },
                  { stat: '32%', desc: 'of the most-used EdTech tools have published research meeting ESSA evidence tiers' },
                  { stat: '10%', desc: 'of EdTech applications meet minimum criteria for privacy transparency' },
                  { stat: '16%', desc: 'of educators describe EdTech as \u201cvery effective\u201d' },
                ].map((item) => (
                  <div key={item.stat} className="flex items-start gap-3">
                    <span className="font-display text-xl text-lens-red flex-shrink-0">{item.stat}</span>
                    <span className="text-lens-grey">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== EVALUATION FORM ===== */}
      <section id="evaluate" className="border-b-3 border-lens-ink" aria-label="Evaluate a tool">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="font-display text-5xl mb-2">EVALUATE A TOOL</h2>
          <p className="text-sm text-lens-grey mb-4 max-w-xl">
            Enter a tool name to receive preliminary evaluation data across all four gatekeepers
            and six dimensions. Results provide a strong starting point for your own research
            and due diligence. Typically takes 15 to 30 seconds.
          </p>
          <div className="border-l-3 border-lens-grey pl-4 py-2 mb-8 max-w-xl">
            <p className="text-xs text-lens-grey leading-relaxed">
              <strong className="text-lens-ink">A note for educators:</strong> These evaluations are intended as a
              starting point for informed decision-making, not a final verdict. We encourage you to verify findings
              against primary sources and conduct your own research before adopting any tool in your classroom or district.
            </p>
          </div>

          <form onSubmit={handleEvaluate} className="max-w-2xl" noValidate>
            <div className="space-y-6">
              {/* Tool Name */}
              <div>
                <label htmlFor="tool-name" className="block text-sm font-semibold uppercase tracking-widest mb-2">
                  Tool Name <span className="text-lens-red">*</span>
                </label>
                <input
                  id="tool-name"
                  type="text"
                  value={toolName}
                  onChange={(e) => { setToolName(e.target.value); setError(''); }}
                  placeholder="e.g., Khanmigo, Nearpod, Turnitin"
                  className="w-full px-4 py-4 bg-white border-3 border-lens-ink text-lg placeholder:text-lens-grey/50"
                  required
                  maxLength={200}
                  autoComplete="off"
                />
              </div>

              {/* Tool URL */}
              <div>
                <label htmlFor="tool-url" className="block text-sm font-semibold uppercase tracking-widest mb-2">
                  Official URL{' '}
                  <span className="text-lens-grey font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="tool-url"
                  type="url"
                  value={toolUrl}
                  onChange={(e) => setToolUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-white border-2 border-lens-ink placeholder:text-lens-grey/50"
                  maxLength={500}
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="tool-category" className="block text-sm font-semibold uppercase tracking-widest mb-2">
                  Category{' '}
                  <span className="text-lens-grey font-normal normal-case tracking-normal">
                    (optional, auto-detected if blank)
                  </span>
                </label>
                <select
                  id="tool-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-lens-ink appearance-none cursor-pointer"
                >
                  <option value="">Auto-detect category</option>
                  {TOOL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Category description */}
                {category && CATEGORY_DESCRIPTIONS[category] && (
                  <div className="mt-3 border-l-3 border-lens-red pl-4 py-2 fade-in">
                    <p className="text-sm text-lens-grey leading-relaxed">
                      {CATEGORY_DESCRIPTIONS[category]}
                    </p>
                  </div>
                )}
              </div>

              {/* Error display */}
              {error && phase === 'home' && (
                <div className="border-3 border-lens-red p-4 bg-red-50 fade-in" role="alert">
                  <p className="text-sm text-lens-red font-semibold">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isCoolingDown || !toolName.trim()}
                className="w-full py-5 bg-lens-ink text-white font-display text-3xl tracking-wider hover:bg-lens-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-lens-ink"
              >
                {isCoolingDown
                  ? `PLEASE WAIT (${cooldownRemaining}s)`
                  : 'GENERATE EVALUATION REPORT'}
              </button>

              {isCoolingDown && (
                <p className="text-xs text-lens-grey text-center">
                  Brief cooldown between evaluations to maintain service quality.
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ===== DIMENSION DESCRIPTIONS ===== */}
      <section className="border-b-3 border-lens-ink bg-lens-light" aria-label="The six dimensions">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="font-display text-4xl mb-2">THE SIX DIMENSIONS</h2>
          <p className="text-sm text-lens-grey mb-8">
            Every tool is scored across these six weighted dimensions, grounded in established learning science.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: 'Learning Design Integrity',
                weight: '25%',
                tag: 'LDI',
                desc: 'Is the tool instructionally sound? Grounded in Hattie, Marzano, Bloom, Webb, UDL, TPACK, and SAMR.',
              },
              {
                name: 'Instructional Efficacy',
                weight: '20%',
                tag: 'EFF',
                desc: 'Is there credible evidence it works? Capped by ESSA evidence tier \u2014 marketing claims get a ceiling of 1/5.',
              },
              {
                name: 'Feedback & Assessment',
                weight: '15%',
                tag: 'F&A',
                desc: 'Does it provide meaningful, actionable feedback? Timely, specific, and growth-oriented.',
              },
              {
                name: 'Equity & Access',
                weight: '15%',
                tag: 'EQU',
                desc: 'Can ALL students benefit? Evaluates accessibility, multilingual support, cultural responsiveness, affordability.',
              },
              {
                name: 'Tech & Ethical Design',
                weight: '15%',
                tag: 'T&E',
                desc: 'Is it ethically built? No dark patterns, transparent data practices, user-safe by design.',
              },
              {
                name: 'Integration & Usability',
                weight: '10%',
                tag: 'INT',
                desc: 'Does it fit into teacher workflows? LMS integration, reasonable learning curve, helpful documentation.',
              },
            ].map((dim) => (
              <div key={dim.tag} className="border-2 border-lens-ink bg-white p-5 hover:border-lens-red transition-colors">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-display text-xl text-lens-red">{dim.tag}</span>
                  <span className="text-xs text-lens-grey font-semibold uppercase">{dim.weight}</span>
                </div>
                <div className="font-semibold text-sm mb-2">{dim.name}</div>
                <p className="text-sm text-lens-grey leading-relaxed">{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== METHODOLOGY SECTION ===== */}
      <section className="border-b-3 border-lens-ink" aria-label="Methodology">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="font-display text-4xl mb-6">METHODOLOGY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-widest mb-3">Research Foundations</h3>
              <div className="space-y-2 text-sm text-lens-grey leading-relaxed">
                <p>
                  <strong className="text-lens-ink">Hattie&apos;s Visible Learning:</strong>{' '}
                  2,100+ meta-analyses encompassing 300M+ students. The 0.4 effect size threshold identifies strategies with meaningful impact.
                </p>
                <p>
                  <strong className="text-lens-ink">Marzano&apos;s High-Yield Strategies:</strong>{' '}
                  332 research-based strategies across 43 elements of effective teaching.
                </p>
                <p>
                  <strong className="text-lens-ink">Universal Design for Learning:</strong>{' '}
                  CAST&apos;s UDL Guidelines 3.0, the standard for inclusive and equitable learning design.
                </p>
                <p>
                  <strong className="text-lens-ink">TPACK Framework:</strong>{' '}
                  Mishra &amp; Koehler&apos;s model for meaningful integration of content, pedagogy, and technology knowledge.
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-widest mb-3">Evidence Standards</h3>
              <div className="space-y-2 text-sm text-lens-grey leading-relaxed">
                <p>
                  <strong className="text-lens-ink">ESSA Evidence Tiers:</strong>{' '}
                  From logic models (Tier 4) to randomized controlled trials (Tier 1). Tools are held to the standard their evidence supports.
                </p>
                <p>
                  <strong className="text-lens-ink">Evidence Capping:</strong>{' '}
                  A tool&apos;s efficacy score cannot exceed its research evidence tier. Marketing claims alone cap at 1/5.
                </p>
                <p>
                  <strong className="text-lens-ink">WCAG 2.1 AA:</strong>{' '}
                  The DOJ-mandated accessibility standard for public schools, with an April 2026 compliance deadline.
                </p>
                <p>
                  <strong className="text-lens-ink">FERPA / COPPA:</strong>{' '}
                  Federal privacy standards that protect student data. Non-negotiable for any tool used in K-12 settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-lens-ink text-white" role="contentinfo">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <div className="font-display text-3xl mb-2">THE 6D LENS</div>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                Evaluating educational technology for instructional design, pedagogy, equity,
                and student safety. Built by educators, for educators. Grounded in research
                that supports meaningful student outcomes.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">
                Framework created by Amy Henderson
              </p>
              <p className="text-sm text-gray-400">
                National Board Certified Exceptional Needs Specialist
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 leading-relaxed max-w-3xl">
              <strong className="text-gray-400">Disclaimer:</strong> Evaluations generated by The 6D Lens
              are intended as a starting point for professional decision-making. They should not replace
              independent research, direct review of vendor documentation, or district-level vetting processes.
              Educators are encouraged to verify all findings against primary sources before making adoption decisions.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              The Pedagogical Vault
            </p>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Amy Henderson. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
