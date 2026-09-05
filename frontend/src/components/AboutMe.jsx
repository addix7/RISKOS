import React from 'react';
import BorderGlow from './BorderGlow';
import Mono from './Mono';
import {
  User,
  Shield,
  Cpu,
  Code,
  Lightbulb,
  BookOpen,
  Mail,
  Phone,
  LogOut,
  Terminal,
  ArrowUpRight,
  Quote,
} from 'lucide-react';

export default function AboutMe({
  currentUser,
  onNavigateToLiveMap,
  onNavigateToReviewQueue,
  onNavigateToModelHealth,
  onNavigateToAboutRiskos,
  onSignOut,
}) {
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
                ENGINEER PROFILE
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
              <button
                onClick={onNavigateToAboutRiskos}
                className="px-3 py-1.5 font-data-mono text-xs uppercase text-text-tertiary hover:text-on-surface hover:bg-[#181818] border border-transparent transition-colors cursor-pointer"
              >
                About RISKOS
              </button>
              <button className="px-3 py-1.5 font-data-mono text-xs uppercase font-bold text-primary bg-primary/10 border border-primary/40 cursor-default">
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
              PORTFOLIO // BIOGRAPHY & CAPABILITIES
            </span>
          </div>
          <h1 className="font-headline-lg text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            About Me
          </h1>
        </div>

        {/* Main Biography Card */}
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
          <div className="p-6 sm:p-10 space-y-8">
            {/* Terminal Top Info Strip */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-xs font-data-mono text-text-secondary">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-on-surface font-bold">KALP PATHAK</span>
                <span className="text-text-tertiary">//</span>
                <span className="text-text-tertiary">CYBERSECURITY, AI & SOFTWARE DEVELOPMENT</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <div className="w-2 h-2 bg-text-tertiary"></div>
                <div className="w-2 h-2 bg-text-tertiary"></div>
                <div className="w-2 h-2 bg-text-tertiary"></div>
              </div>
            </div>

            {/* Intro Paragraphs */}
            <div className="space-y-4 text-on-surface/90 text-sm sm:text-base leading-relaxed font-body-sm">
              <p>
                Hi, I’m <span className="font-semibold text-on-surface">Kalp Pathak</span>, a student interested in{' '}
                <span className="text-primary font-medium">Cybersecurity, AI, and Software Development</span>.
              </p>

              <p>
                I enjoy understanding how systems work, finding where they can fail, and building practical solutions
                around those problems. My interests lie particularly in{' '}
                <strong className="text-on-surface font-semibold">
                  cybersecurity, threat detection, fraud and risk management, and AI-powered security systems
                </strong>
                .
              </p>

              <p>
                I’ve been working on projects that combine software engineering, security, and AI, with a focus on
                turning technical concepts into practical, working solutions. I enjoy exploring how AI can be applied to
                areas such as{' '}
                <strong className="text-on-surface font-semibold">
                  threat detection, security analysis, automation, and intelligent decision-making
                </strong>
                .
              </p>

              <p>
                Alongside project work, I’m building my fundamentals in networking, operating systems, security
                concepts, programming, and secure software development. I believe that strong cybersecurity comes from
                understanding the underlying technology rather than simply relying on security tools.
              </p>

              <p>
                I’m currently looking for an internship where I can learn from experienced engineers, work on
                real-world problems, and contribute to meaningful technical projects.
              </p>
            </div>

            {/* What I Bring Section */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  CORE COMPETENCIES
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                What I Bring
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-[#161616] border border-border/80 flex items-start gap-3">
                  <div className="p-2 bg-primary/10 border border-primary/30 text-primary mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-data-mono text-sm font-bold text-on-surface">Cybersecurity</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Security fundamentals, threat detection, risk analysis
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#161616] border border-border/80 flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-data-mono text-sm font-bold text-on-surface">AI/ML</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Practical use of AI for detection, investigation, and decision-making
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#161616] border border-border/80 flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mt-0.5">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-data-mono text-sm font-bold text-on-surface">Software Development</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Python, Java, APIs, backend development
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#161616] border border-border/80 flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 mt-0.5">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-data-mono text-sm font-bold text-on-surface">Problem Solving</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Breaking complex problems into practical, buildable solutions
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#161616] border border-border/80 flex items-start gap-3 md:col-span-2">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-data-mono text-sm font-bold text-on-surface">Learning Mindset</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Constantly improving my technical fundamentals and exploring new technologies
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Blockquote / Engineering Philosophy */}
            <div className="p-6 bg-[#161616] border-l-2 border-primary border-y border-r border-border/60 space-y-4">
              <div className="flex items-start gap-3">
                <Quote className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-3 text-sm leading-relaxed text-on-surface">
                  <p>
                    <strong className="text-primary font-semibold font-data-mono">My goal is simple:</strong> build
                    things that work, understand why they work, and keep getting better at building secure systems.
                  </p>
                  <p>
                    <strong className="text-primary font-semibold font-data-mono">
                      The way I work is simple: I believe hard work and consistency beat talent.
                    </strong>{' '}
                    I may not know everything today, but I believe in showing up, putting in the work, learning from
                    mistakes, and getting better every day.
                  </p>
                </div>
              </div>
            </div>

            {/* Let's Connect Section */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-micro-caps text-micro-caps text-primary uppercase tracking-wider">
                  OPPORTUNITIES & CONTACT
                </span>
              </div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
                Let’s Connect
              </h2>

              <p className="text-sm text-on-surface font-semibold leading-relaxed font-body-sm">
                I’m always open to internship opportunities, technical discussions, collaborations, and opportunities to learn.
              </p>

              <p className="text-sm text-on-surface font-semibold leading-relaxed font-body-sm">
                Feel free to reach out to me through the contact details provided on this portfolio. I’d be happy to
                connect and have a conversation.
              </p>

              {/* Direct Contact Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Phone */}
                <a
                  href="tel:+917428996511"
                  className="p-4 bg-[#161616] hover:bg-[#1c1c1c] border border-border hover:border-primary transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1f1f1f] border border-border text-primary group-hover:border-primary/50 transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-micro-caps text-[10px] text-text-tertiary uppercase tracking-wider">
                        PHONE
                      </span>
                      <span className="font-data-mono text-sm text-on-surface group-hover:text-primary transition-colors">
                        +91 7428996511
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                {/* Gmail Directly */}
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=kalppathak2006@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-[#161616] hover:bg-[#1c1c1c] border border-border hover:border-primary transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1f1f1f] border border-border text-primary group-hover:border-primary/50 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-micro-caps text-[10px] text-text-tertiary uppercase tracking-wider">
                        GMAIL
                      </span>
                      <span className="font-data-mono text-sm text-on-surface group-hover:text-primary transition-colors">
                        kalppathak2006@gmail.com
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/kalp-pathak/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-[#161616] hover:bg-[#1c1c1c] border border-border hover:border-blue-400 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1f1f1f] border border-border text-blue-400 group-hover:border-blue-400/50 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.32a1.65 1.65 0 0 0-1.66 1.65 1.65 1.65 0 0 0 1.66 1.65 1.65 1.65 0 0 0 1.66-1.65A1.65 1.65 0 0 0 7.86 6.32Z" />
                      </svg>
                    </div>
                    <div>
                      <span className="block font-micro-caps text-[10px] text-text-tertiary uppercase tracking-wider">
                        LINKEDIN
                      </span>
                      <span className="font-data-mono text-sm text-on-surface group-hover:text-blue-400 transition-colors">
                        linkedin.com/in/kalp-pathak
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-tertiary group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com/addix7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-[#161616] hover:bg-[#1c1c1c] border border-border hover:border-emerald-400 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1f1f1f] border border-border text-emerald-400 group-hover:border-emerald-400/50 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="block font-micro-caps text-[10px] text-text-tertiary uppercase tracking-wider">
                        GITHUB
                      </span>
                      <span className="font-data-mono text-sm text-on-surface group-hover:text-emerald-400 transition-colors">
                        github.com/addix7
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-tertiary group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </BorderGlow>
      </main>
    </div>
  );
}
