import React from 'react';
import BorderGlow from './BorderGlow';
import Mono from './Mono';
import {
  Shield,
  Layers,
  Cpu,
  Activity,
  Terminal,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  LogOut,
  Network,
  Scale,
  Brain,
  Database,
  ArrowRight,
} from 'lucide-react';

export default function AboutRiskos({
  currentUser,
  onNavigateToLiveMap,
  onNavigateToReviewQueue,
  onNavigateToModelHealth,
  onNavigateToAboutMe,
  onSignOut,
}) {
  const steps = [
    {
      num: '01',
      title: 'Point-in-Time ML Scoring',
      desc: 'A payment is scored by a trained ML model using 13 behavioral, device, and network features.',
    },
    {
      num: '02',
      title: 'Velocity Spike Monitoring',
      desc: 'Transaction velocity is monitored for sudden spikes against rolling baselines.',
    },
    {
      num: '03',
      title: 'Campaign Detection Layer',
      desc: 'In parallel, a campaign detection layer tracks rolling time windows across devices, IPs, and account clusters for coordinated patterns.',
    },
    {
      num: '04',
      title: 'Legitimacy & Entropy Check',
      desc: 'A legitimacy check runs first — distinguishing real traffic spikes (like flash sales) from fraud rings, using infrastructure diversity (entropy) as the key signal.',
    },
    {
      num: '05',
      title: 'Grounded Financial Exposure',
      desc: 'If a real campaign is detected, financial exposure is estimated as a range, grounded in real historical data — never a single fabricated number.',
    },
    {
      num: '06',
      title: 'Deterministic AI Case Files',
      desc: 'An AI investigator queries the actual database and builds a plain-English case file, with every finding traceable to a real query.',
    },
    {
      num: '07',
      title: 'Entity Link Graph Visualization',
      desc: 'An entity graph visually maps connections between customers, devices, IPs, and payment instruments to reveal fraud rings.',
    },
    {
      num: '08',
      title: 'Expected Value Action Optimization',
      desc: 'Instead of a binary allow/block, the system compares expected outcomes across four responses (Allow, Verify, Hold, Block) and recommends whichever has the best expected outcome.',
    },
    {
      num: '09',
      title: 'Human-in-the-Loop Oversight',
      desc: 'A human analyst can review and override any AI decision.',
    },
    {
      num: '10',
      title: 'Precedent Memory & Retrieval',
      desc: 'The system remembers past human decisions and surfaces similar prior cases automatically.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-transparent text-on-surface flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Application Header Bar */}
      <header className="w-full bg-[#131313]/90 backdrop-blur-md border-b border-border sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-base sm:text-lg font-bold tracking-tight text-on-surface">
                RISKOS
              </span>
              <span className="font-micro-caps text-micro-caps text-text-tertiary uppercase px-1.5 py-0.5 bg-[#1a1a1a] border border-border">
                SYSTEM DOCUMENTATION
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-2">
              <button
                onClick={onNavigateToLiveMap}
                className="px-3 py-1.5 font-data-mono text-xs uppercase text-text-tertiary hover:text-on-surface hover:bg-[#181818] border border-transparent transition-colors cursor-pointer"
              >
                Live Attack Map
              </button>
              <button
                onClick={onNavigateToReviewQueue}
                className="px-3 py-1.5 font-data-mono text-xs uppercase text-text-tertiary hover:text-on-surface hover:bg-[#181818] border border-transparent transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Review Queue</span>
                <span className="px-1.5 py-0.2 bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/40 rounded-none">
                  4
                </span>
              </button>
              <button
                onClick={onNavigateToModelHealth}
                className="px-3 py-1.5 font-data-mono text-xs uppercase text-text-tertiary hover:text-on-surface hover:bg-[#181818] border border-transparent transition-colors cursor-pointer"
              >
                Model Health
              </button>
              <button className="px-3 py-1.5 font-data-mono text-xs uppercase font-bold text-primary bg-primary/10 border border-primary/40 cursor-default">
                About RISKOS
              </button>
              <button
                onClick={onNavigateToAboutMe}
                className="px-3 py-1.5 font-data-mono text-xs uppercase text-text-tertiary hover:text-on-surface hover:bg-[#181818] border border-transparent transition-colors cursor-pointer"
              >
                About Me
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-[#171717] border border-border/80 text-text-secondary text-xs font-data-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentUser?.name || 'OPERATOR OP-4402'}</span>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-text-secondary hover:text-red-400 transition-colors font-data-mono text-xs uppercase px-2.5 py-1.5 bg-[#171717] border border-border hover:border-red-500/40 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col space-y-8">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col space-y-2 border-b border-border/60 pb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-primary inline-block"></span>
            <span className="font-micro-caps text-micro-caps text-text-tertiary uppercase tracking-widest">
              ARCHITECTURE // DUAL-LAYER DEFENSE ARCHITECTURE
            </span>
          </div>
          <h1 className="font-headline-lg text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            About RISKOS
          </h1>
        </div>

        {/* Main Documentation Card */}
        <BorderGlow
          edgeSensitivity={15}
          glowColor="35 90 60"
          backgroundColor="#111111"
          borderRadius={0}
          glowRadius={60}
          glowIntensity={0.8}
          coneSpread={30}
          animated={false}
          colors={['#f97316', '#fbbf24', '#134e4a']}
          fillOpacity={0.12}
          className="w-full border border-border bg-[#111111] shadow-2xl"
        >
          <div className="p-6 sm:p-10 space-y-10">
            {/* Terminal Info Strip */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-xs font-data-mono text-text-secondary">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-on-surface font-bold">RISKOS CORE ENGINE</span>
                <span className="text-text-tertiary">//</span>
                <span className="text-text-tertiary">CONCURRENT FRAUD & CAMPAIGN DETECTION OPERATING SYSTEM</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <div className="w-2 h-2 bg-primary"></div>
                <div className="w-2 h-2 bg-text-tertiary"></div>
                <div className="w-2 h-2 bg-text-tertiary"></div>
              </div>
            </div>

            {/* Section 1: The Problem */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  01 // INDUSTRY DEFICIENCY
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                The Problem
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-on-surface/90 font-body-sm">
                Most fraud detection systems ask one question: <strong className="text-on-surface font-semibold">is this transaction risky?</strong> They score payments one at a time and miss the bigger picture. Real fraud rarely happens as a single transaction — it happens as a coordinated campaign, where one group creates many fake accounts, shares devices and cards, and hits a merchant repeatedly before anyone notices the pattern.
              </p>
            </div>

            {/* Section 2: What RISKOS Does */}
            <div className="space-y-3 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  02 // PARADIGM SHIFT
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                What RISKOS Does
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-on-surface/90 font-body-sm">
                RISKOS asks two questions instead of one: <strong className="text-on-surface font-semibold">is this transaction risky</strong>, AND <strong className="text-on-surface font-semibold">is a coordinated attack forming across many accounts?</strong> For both, it explains its reasoning, shows the math behind its decision, and recommends the least disruptive response instead of defaulting to a block.
              </p>
            </div>

            {/* Section 3: Two Layers */}
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  03 // DUAL LAYER DETECTION
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                Two Layers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-5 bg-[#161616] border border-border/80 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-data-mono text-sm font-bold">
                    <Shield className="w-4 h-4" />
                    <span>Point-in-Time Risk</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Investigates individual transactions like a detective: pulls customer history, device history, IP history, and related accounts, then produces a risk score with a plain-English explanation.
                  </p>
                </div>

                <div className="p-5 bg-[#161616] border border-border/80 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-data-mono text-sm font-bold">
                    <Network className="w-4 h-4" />
                    <span>Campaign Detection</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Watches patterns across many transactions and accounts over time, catching coordinated fraud rings forming before every transaction in the group is confirmed fraudulent.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: How It Works */}
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  04 // PIPELINE WORKFLOW
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                How It Works
              </h2>

              <div className="space-y-2.5 pt-2">
                {steps.map((step) => (
                  <div
                    key={step.num}
                    className="p-3.5 bg-[#161616] border border-border/70 flex items-start gap-3.5"
                  >
                    <span className="font-data-mono text-xs font-bold px-2 py-1 bg-[#1f1f1f] text-primary border border-border shrink-0 mt-0.5">
                      {step.num}
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="font-data-mono text-xs sm:text-sm font-bold text-on-surface">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Honest Metrics */}
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  05 // EMPIRICAL VALIDATION
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                Honest Metrics
              </h2>

              <div className="p-5 bg-[#161616] border-l-2 border-primary border-y border-r border-border/60 space-y-3">
                <p className="text-xs sm:text-sm leading-relaxed text-on-surface/90 font-body-sm">
                  <strong className="text-primary font-semibold font-data-mono">Point-in-time model</strong> (evaluated on 3,479 held-out transactions, zero data leakage via entity-cluster splitting):{' '}
                  <span className="font-data-mono text-on-surface font-semibold">Precision 61.30%</span>,{' '}
                  <span className="font-data-mono text-on-surface font-semibold">Recall 98.55%</span>,{' '}
                  <span className="font-data-mono text-on-surface font-semibold">F1 75.59%</span>,{' '}
                  <span className="font-data-mono text-on-surface font-semibold">AUC-ROC 0.9598</span>,{' '}
                  <span className="font-data-mono text-on-surface font-semibold">False Positive Rate 11.76%</span>.
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-text-secondary font-body-sm">
                  The model is deliberately tuned to prioritize recall — missing a fraud case costs real money, while a false positive only triggers step-up verification, not a hard decline.
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-on-surface/90 font-body-sm pt-2 border-t border-border/40">
                  <strong className="text-primary font-semibold font-data-mono">Campaign detection</strong>:{' '}
                  average time-to-containment of <span className="font-data-mono text-on-surface font-semibold">141.5 seconds</span>, tested against real fraud scenarios and correctly ignoring simulated legitimate traffic spikes with zero false alarms.
                </p>
              </div>
            </div>

            {/* Section 6: Tech Stack */}
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  06 // TECHNOLOGY INFRASTRUCTURE
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                Tech Stack
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-[#161616] border border-border/80 space-y-2">
                  <div className="flex items-center gap-2 font-data-mono text-xs uppercase font-bold text-primary">
                    <Server className="w-4 h-4" />
                    <span>Backend</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Python, FastAPI, PostgreSQL, SQLAlchemy, scikit-learn/XGBoost, SHAP, Claude (Anthropic) for AI investigation.
                  </p>
                </div>

                <div className="p-4 bg-[#161616] border border-border/80 space-y-2">
                  <div className="flex items-center gap-2 font-data-mono text-xs uppercase font-bold text-primary">
                    <FileCode className="w-4 h-4" />
                    <span>Frontend</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    React, Tailwind CSS.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 7: How to Run It Locally */}
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  07 // LOCAL DEPLOYMENT
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                How to Run It Locally
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Backend block */}
                <div className="p-4 bg-[#141414] border border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-data-mono text-primary font-bold">
                    <span>BACKEND SETUP</span>
                    <span className="text-[10px] text-text-tertiary">PYTHON 3.11+</span>
                  </div>
                  <pre className="p-3 bg-[#0a0a0a] border border-border text-[11px] font-data-mono text-on-surface/90 overflow-x-auto leading-relaxed">
{`cd backend
pip install -r requirements.txt --break-system-packages
python -m scripts.seed
uvicorn app.main:app --reload --port 8000`}
                  </pre>
                </div>

                {/* Frontend block */}
                <div className="p-4 bg-[#141414] border border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-data-mono text-primary font-bold">
                    <span>FRONTEND SETUP</span>
                    <span className="text-[10px] text-text-tertiary">NODE 18+ / VITE</span>
                  </div>
                  <pre className="p-3 bg-[#0a0a0a] border border-border text-[11px] font-data-mono text-on-surface/90 overflow-x-auto leading-relaxed">
{`cd frontend
npm install
npm run dev`}
                  </pre>
                </div>
              </div>

              {/* Endpoint URLs & Seed Account */}
              <div className="p-4 bg-[#161616] border border-border text-xs sm:text-sm text-text-secondary leading-relaxed font-data-mono">
                <p>
                  Backend runs at <span className="text-primary font-bold">http://localhost:8000</span> (interactive API docs at <span className="text-primary">/docs</span>).
                </p>
                <p className="mt-1">
                  Frontend runs at <span className="text-primary font-bold">http://localhost:5173</span>. Sign in with the seeded analyst account:{' '}
                  <span className="text-on-surface font-bold bg-[#1f1f1f] px-1.5 py-0.5 border border-border">analyst@riskos.ai</span>
                </p>
              </div>
            </div>
          </div>
        </BorderGlow>
      </main>
    </div>
  );
}
