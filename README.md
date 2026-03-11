# 6D Lens

**Research-backed EdTech evaluation using the 6 Dimensions of Intention & Integrity in Learning Design.**

Built by [Amy Henderson](https://github.com/amyhenderson), National Board Certified Exceptional Needs Specialist.

## What It Does

6D Lens evaluates educational technology tools across a rigorous, research-grounded framework:

1. **Four Gatekeepers** — Accessibility (WCAG 2.1 AA), Privacy (FERPA/COPPA), Responsible AI, and Content Safety must all pass before scoring begins.
2. **Six Weighted Dimensions** — Learning Design Integrity (25%), Instructional Efficacy (20%), Feedback & Assessment (15%), Equity & Access (15%), Tech & Ethical Design (15%), Integration & Usability (10%).
3. **Evidence Capping** — Efficacy scores are capped by ESSA research tier. No tool can out-claim its evidence base.
4. **Classification** — Exemplar (80+), Strong (70–79), Adequate (50–69), or Weak (<50).

### Research Foundations

- Hattie's Visible Learning (2,100+ meta-analyses)
- Marzano's High-Yield Strategies
- Universal Design for Learning (CAST UDL Guidelines 3.0)
- TPACK Framework (Mishra & Koehler)
- Bloom's Revised Taxonomy & Webb's Depth of Knowledge
- ESSA Evidence Tiers & What Works Clearinghouse standards

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom design tokens
- **AI:** Anthropic Claude API for evaluations
- **PDF Export:** html2canvas + jsPDF (dynamically imported)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd 6d-lens

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL for metadata (defaults to `https://6dlens.vercel.app`) |

## Project Structure

```
6d-lens/
├── app/
│   ├── api/evaluate/     # API route — runs the 6D evaluation via Claude
│   ├── error.tsx          # Error boundary
│   ├── globals.css        # Design tokens, animations, print styles
│   ├── layout.tsx         # Root layout with SEO metadata
│   ├── not-found.tsx      # 404 page
│   └── page.tsx           # Home page — hero, form, evaluation flow
├── components/
│   └── Report.tsx         # Full evaluation report with PDF export
├── lib/
│   ├── knowledge-base.ts  # Complete 6D Framework knowledge base
│   ├── rate-limit.ts      # In-memory IP-based rate limiter
│   ├── scoring.ts         # Score calculation and classification
│   ├── types.ts           # TypeScript types and constants
│   └── validate.ts        # Input validation and sanitization
└── public/
    ├── favicon.svg        # SVG favicon
    ├── favicon.ico        # ICO fallback
    ├── og-image.png       # Social sharing image (1200×630)
    └── apple-touch-icon.png
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com/)
3. Add `ANTHROPIC_API_KEY` as an environment variable
4. Deploy

The app includes security headers, API rate limiting (5 evaluations/hour/IP), and input sanitization out of the box.

## License

All rights reserved. The 6D Framework is the intellectual property of Amy Henderson / The Pedagogical Vault.
