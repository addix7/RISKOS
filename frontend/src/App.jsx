import { useState, useEffect } from 'react';
import Galaxy from './components/Galaxy';
import SentinelSilhouette from './components/SentinelSilhouette';
import ScrollReveal from './components/ScrollReveal';
import Lightfall from './components/Lightfall';
import BorderGlow from './components/BorderGlow';
import LiveAttackMap from './components/LiveAttackMap';
import CampaignDetail from './components/CampaignDetail';
import TransactionInvestigation from './components/TransactionInvestigation';
import ReviewQueue from './components/ReviewQueue';
import ModelHealth from './components/ModelHealth';
import AboutRiskos from './components/AboutRiskos';
import AboutMe from './components/AboutMe';
import FadeContent from './components/FadeContent';
import ShinyText from './components/ShinyText';
import LightRays from './components/LightRays';
import {
  ArrowRight,
  ChevronDown,
  Terminal,
  User,
  Key,
  RefreshCw,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import {
  loginApi,
  getStoredToken,
  getStoredUser,
  removeStoredToken,
  getCurrentUserApi,
} from './api/apiClient';

export default function App() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [emailInput, setEmailInput] = useState('analyst@riskos.ai');
  const [passwordInput, setPasswordInput] = useState('analyst_demo_secret_2026');
  const [authStatus, setAuthStatus] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getStoredToken());
  const [activeTab, setActiveTab] = useState('attack_map'); // 'attack_map' | 'review_queue' | 'model_health'
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Validate stored JWT on initial mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      getCurrentUserApi()
        .then((res) => {
          if (res.user) {
            setCurrentUser(res.user);
            setIsAuthenticated(true);
          }
        })
        .catch(() => {
          // Token expired or invalid
          removeStoredToken();
          setIsAuthenticated(false);
          setCurrentUser(null);
        });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthStatus('VERIFYING CREDENTIALS WITH RISKOS BACKEND...');
    setIsSubmitting(true);

    try {
      // Map shorthand operator ID if typed
      let email = emailInput.trim();
      if (!email.includes('@')) {
        email = 'analyst@riskos.ai';
      }

      const res = await loginApi(email, passwordInput);
      setAuthStatus(`ACCESS GRANTED (${res.user?.name || 'Operator'}) - INITIALIZING SECTOR 07...`);
      setCurrentUser(res.user);

      setTimeout(() => {
        setIsAuthenticated(true);
        setAuthStatus(null);
        setIsSubmitting(false);
      }, 400);
    } catch (err) {
      setIsSubmitting(false);
      setAuthStatus(null);
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleSignOut = () => {
    removeStoredToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedCampaignId(null);
    setSelectedTransactionId(null);
    setSelectedInvestigationId(null);
    setActiveTab('attack_map');
  };

  const scrollToTransition = (e) => {
    e.preventDefault();
    const target = document.getElementById('connecting-section');
    if (target) {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  // Authenticated Console Router:
  // 1. Transaction Investigation Screen (Point-in-time)
  // 2. Campaign Detail Screen (Cluster/Campaign DNA)
  // 3. Human Review Queue (Mixed pending cases)
  // 4. Model Health & Efficacy (Statistical reporting)
  // 5. Live Attack Map (Home overview)
  if (isAuthenticated) {
    let currentScreen = null;

    if (selectedTransactionId || selectedInvestigationId) {
      currentScreen = (
        <TransactionInvestigation
          transactionId={selectedTransactionId}
          investigationId={selectedInvestigationId}
          currentUser={currentUser}
          onBack={() => {
            setSelectedTransactionId(null);
            setSelectedInvestigationId(null);
          }}
        />
      );
    } else if (selectedCampaignId) {
      currentScreen = (
        <CampaignDetail
          campaignId={selectedCampaignId}
          currentUser={currentUser}
          onBack={() => setSelectedCampaignId(null)}
          onSelectTransaction={(txnId, invId) => {
            setSelectedTransactionId(txnId);
            setSelectedInvestigationId(invId || null);
          }}
        />
      );
    } else if (activeTab === 'review_queue') {
      currentScreen = (
        <ReviewQueue
          currentUser={currentUser}
          onNavigateToLiveMap={() => setActiveTab('attack_map')}
          onNavigateToModelHealth={() => setActiveTab('model_health')}
          onNavigateToAboutRiskos={() => setActiveTab('about_riskos')}
          onNavigateToAboutMe={() => setActiveTab('about_me')}
          onSelectCampaign={(campId) => setSelectedCampaignId(campId)}
          onSelectTransaction={(txnId, invId) => {
            setSelectedTransactionId(txnId);
            setSelectedInvestigationId(invId);
          }}
          onSignOut={handleSignOut}
        />
      );
    } else if (activeTab === 'model_health') {
      currentScreen = (
        <ModelHealth
          currentUser={currentUser}
          onNavigateToLiveMap={() => setActiveTab('attack_map')}
          onNavigateToReviewQueue={() => setActiveTab('review_queue')}
          onNavigateToAboutRiskos={() => setActiveTab('about_riskos')}
          onNavigateToAboutMe={() => setActiveTab('about_me')}
          onSignOut={handleSignOut}
        />
      );
    } else if (activeTab === 'about_riskos') {
      currentScreen = (
        <AboutRiskos
          currentUser={currentUser}
          onNavigateToLiveMap={() => setActiveTab('attack_map')}
          onNavigateToReviewQueue={() => setActiveTab('review_queue')}
          onNavigateToModelHealth={() => setActiveTab('model_health')}
          onNavigateToAboutMe={() => setActiveTab('about_me')}
          onSignOut={handleSignOut}
        />
      );
    } else if (activeTab === 'about_me') {
      currentScreen = (
        <AboutMe
          currentUser={currentUser}
          onNavigateToLiveMap={() => setActiveTab('attack_map')}
          onNavigateToReviewQueue={() => setActiveTab('review_queue')}
          onNavigateToModelHealth={() => setActiveTab('model_health')}
          onNavigateToAboutRiskos={() => setActiveTab('about_riskos')}
          onSignOut={handleSignOut}
        />
      );
    } else {
      currentScreen = (
        <LiveAttackMap
          currentUser={currentUser}
          onSelectCampaign={(id) => setSelectedCampaignId(id)}
          onSelectTransaction={(txnId, invId) => {
            setSelectedTransactionId(txnId);
            setSelectedInvestigationId(invId || null);
          }}
          onNavigateToReviewQueue={() => setActiveTab('review_queue')}
          onNavigateToModelHealth={() => setActiveTab('model_health')}
          onNavigateToAboutRiskos={() => setActiveTab('about_riskos')}
          onNavigateToAboutMe={() => setActiveTab('about_me')}
          onSignOut={handleSignOut}
        />
      );
    }

    return (
      <div className="relative min-h-screen bg-[#0a0a0a]">
        {/* Layer 0: Authenticated Ambient Background Light Rays */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-90">
          <LightRays
            raysOrigin="top-center"
            raysColor="#8e6d04"
            raysSpeed={1}
            lightSpread={0.65}
            rayLength={3.2}
            followMouse={!prefersReducedMotion}
            mouseInfluence={0.12}
            noiseAmount={0}
            distortion={0}
            className="w-full h-full"
            pulsating={false}
            fadeDistance={1}
            saturation={1.1}
          />
        </div>

        {/* Screen Content Layer */}
        <div className="relative z-10">
          {currentScreen}
        </div>
      </div>
    );
  }

  // Unauthenticated Public / Landing View (Hero, Connecting Tagline, Sign-In Console)
  return (
    <div className="bg-background text-on-surface font-body-sm antialiased m-0 p-0 overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Hero Section */}
      <section
        className="relative w-full h-screen flex flex-col justify-between items-center overflow-hidden bg-[#0a0a0a]"
        id="hero-section"
      >
        {/* Layer 0a: Galaxy WebGL Star Background */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-75">
          <Galaxy
            mouseRepulsion
            mouseInteraction={!prefersReducedMotion}
            density={0.8}
            glowIntensity={0.25}
            saturation={0.2}
            hueShift={260}
            twinkleIntensity={0.35}
            rotationSpeed={0.2}
            repulsionStrength={2.2}
            autoCenterRepulsion={0}
            starSpeed={0.8}
            speed={1.0}
            disableAnimation={prefersReducedMotion}
            transparent={true}
          />
        </div>

        {/* Layer 0b: Visible Falling Light Streams behind Galactus */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Lightfall
            colors={['#A6C8FF', '#5227FF', '#FF9FFC']}
            backgroundColor="#000000"
            speed={0.6}
            streakCount={4}
            streakWidth={1.2}
            streakLength={1.3}
            glow={1.4}
            density={0.6}
            twinkle={1}
            zoom={2.6}
            backgroundGlow={0}
            opacity={0.85}
            transparent={true}
            mouseInteraction={!prefersReducedMotion}
            mouseStrength={0.4}
            mouseRadius={0.3}
          />
        </div>

        {/* Layer 1: High-Contrast Galactus with Tightly Focused Eyes & Frequent Blink */}
        <SentinelSilhouette prefersReducedMotion={prefersReducedMotion} />

        {/* Layer 2: Seamless cosmic downward fade blending directly into lower stream */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent z-20 pointer-events-none" />

        {/* Top Header Status Tag & Quick Access */}
        <div className="relative z-30 pt-8 flex items-center justify-between w-full max-w-6xl px-6 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest/80 border border-border backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-micro-caps text-micro-caps text-text-secondary tracking-widest">
              MONITORING SECTOR 07 // LIVE BACKEND: 8000
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const target = document.getElementById('signin-console');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#171717]/80 hover:bg-surface-container-low border border-border hover:border-primary text-text-secondary hover:text-primary transition-colors font-data-mono text-xs uppercase cursor-pointer backdrop-blur-sm"
            >
              <span>Access Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Layer 3: Foreground Hero Branding with Centered FadeContent Animation */}
        <FadeContent
          blur={true}
          duration={1000}
          ease="power2.out"
          initialOpacity={0}
          className="relative z-30 flex flex-col items-center justify-center text-center px-4 max-w-5xl w-full my-auto pb-8"
        >
          <h1 className="font-headline-lg text-[56px] sm:text-[78px] md:text-[100px] lg:text-[118px] font-extrabold tracking-tight sm:tracking-tighter text-on-background mb-4 drop-shadow-[0_4px_40px_rgba(0,0,0,1)] select-none leading-none">
            <ShinyText
              text="RISKOS"
              speed={4.5}
              delay={1}
              color="#b5b5b5"
              shineColor="#ffffff"
              spread={120}
              direction="left"
              yoyo={false}
              pauseOnHover={false}
              disabled={prefersReducedMotion}
            />
          </h1>
          <p className="font-data-mono text-xs sm:text-data-mono md:text-base text-text-secondary max-w-2xl mx-auto uppercase tracking-widest drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
            The Silent Observer. Detecting coordinated fraud before it manifests.
          </p>

          {/* Scroll Affordance Button */}
          <div className={`mt-8 ${prefersReducedMotion ? '' : 'animate-pulse-slow'}`}>
            <a
              aria-label="Scroll down to sign in"
              className="text-text-secondary hover:text-primary transition-colors duration-300 flex items-center justify-center p-2 cursor-pointer focus:outline-none focus:text-primary"
              href="#connecting-section"
              onClick={scrollToTransition}
            >
              <ChevronDown className="w-9 h-9" />
            </a>
          </div>
        </FadeContent>
      </section>

      {/* Unified Lower Container with Continuous Lightfall Theme */}
      <div className="relative w-full overflow-hidden bg-[#000000]">
        {/* Layer 0: Continuous Full-Bleed Lightfall Background Theme */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Lightfall
            colors={['#A6C8FF', '#5227FF', '#FF9FFC']}
            backgroundColor="#000000"
            speed={0.55}
            streakCount={4}
            streakWidth={1.1}
            streakLength={1.2}
            glow={1.2}
            density={0.65}
            twinkle={1}
            zoom={2.8}
            backgroundGlow={0.6}
            opacity={1}
            mouseInteraction={!prefersReducedMotion}
            mouseStrength={0.5}
            mouseRadius={0.35}
          />
        </div>

        {/* Ambient Top Vignette Transition */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent z-10 pointer-events-none" />

        {/* Ambient Global Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#000000]/20 to-[#000000]/60 z-10 pointer-events-none" />

        {/* Connecting Bridge Section: ScrollReveal Tagline */}
        <section
          className="relative w-full min-h-[70vh] py-32 sm:py-36 px-6 md:px-12 flex flex-col items-center justify-center text-center z-20"
          id="connecting-section"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-micro-caps text-micro-caps text-text-secondary tracking-[0.25em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                OBSERVER CORE // CONTINUOUS VIGILANCE
              </span>
            </div>

            <ScrollReveal
              baseOpacity={0.12}
              enableBlur={true}
              baseRotation={2.5}
              blurStrength={4}
              containerClassName="my-6"
              textClassName="font-headline-lg font-bold text-[32px] sm:text-[46px] md:text-[56px] leading-[1.25] tracking-tight text-on-surface drop-shadow-[0_4px_24px_rgba(0,0,0,1)]"
            >
              Fraud doesn't start with a transaction. It starts with a pattern.
            </ScrollReveal>

            <p className="mt-6 text-text-secondary font-body-sm text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              Detect coordinated attacks before they become losses.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-text-tertiary text-xs font-data-mono uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-calm" /> ZERO LATENCY
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-forming" /> DEEP GRAPH TRACING
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-watchlist" /> ACTIVE CONTAINMENT
              </span>
            </div>
          </div>
        </section>

        {/* Sign-in Section: Powered by Lightfall Theme */}
        <section
          className="relative w-full min-h-screen flex items-center justify-center py-20 px-4 md:px-8 z-20"
          id="signin-console"
        >
          {/* Centered Sign-in Console Terminal wrapped in BorderGlow */}
          <div className="w-full max-w-[500px]">
            <BorderGlow
              edgeSensitivity={20}
              glowColor="35 90 60"
              backgroundColor="#171717"
              borderRadius={0}
              glowRadius={70}
              glowIntensity={1.3}
              coneSpread={25}
              animated={false}
              colors={['#f97316', '#fbbf24', '#134e4a']}
              fillOpacity={0.28}
              className="w-full shadow-[0_0_60px_rgba(0,0,0,0.95)]"
            >
              {/* Console Header Bar */}
              <div className="flex items-center justify-between border-b border-border px-card-px py-3 bg-[#171717]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="font-micro-caps text-micro-caps text-text-secondary">SYSTEM ACCESS</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-text-secondary"></div>
                  <div className="w-2 h-2 bg-text-secondary"></div>
                  <div className="w-2 h-2 bg-text-secondary"></div>
                </div>
              </div>

              {/* Form Container */}
              <div className="p-card-px md:p-[40px] bg-[#171717]">
                <div className="mb-8 border-l-2 border-primary pl-4">
                  <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
                    AUTHENTICATION REQUIRED
                  </h2>
                  <p className="font-data-mono text-data-mono text-text-tertiary">
                    Enter your analyst credentials to access the live engine.
                  </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-2 animate-fade-in-up">
                    <label
                      className="block font-label-xs text-label-xs text-text-secondary uppercase"
                      htmlFor="analyst_email"
                    >
                      Analyst Email / Operator ID
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary select-none" />
                      <input
                        className="w-full bg-[#131313] border border-border text-on-surface font-data-mono text-data-mono tabular-nums pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        id="analyst_email"
                        name="analyst_email"
                        placeholder="analyst@riskos.ai"
                        required
                        type="text"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 animate-fade-in-up">
                    <label
                      className="block font-label-xs text-label-xs text-text-secondary uppercase"
                      htmlFor="analyst_password"
                    >
                      Passphrase
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary select-none" />
                      <input
                        className="w-full bg-[#131313] border border-border text-on-surface font-data-mono text-data-mono tabular-nums pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        id="analyst_password"
                        name="analyst_password"
                        placeholder="••••••••••••"
                        required
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {authStatus && (
                    <div className="p-3 bg-surface-container-low border border-primary/30 text-primary font-data-mono text-xs flex items-center gap-2 animate-fade-in-up">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>{authStatus}</span>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 font-data-mono text-xs flex items-center gap-2 animate-fade-in-up">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="font-label-xs text-label-xs text-text-tertiary">
                      Seeded: <span className="text-text-secondary font-mono">analyst@riskos.ai</span>
                    </span>
                    <button
                      disabled={isSubmitting}
                      className="w-full sm:w-auto bg-[#131313] border border-border hover:border-primary text-text-secondary hover:text-primary font-data-mono text-data-mono tabular-nums px-6 py-3 transition-colors flex items-center justify-center gap-2 group hover:bg-surface-container-low active:opacity-80 cursor-pointer disabled:opacity-50"
                      type="submit"
                    >
                      <span>{isSubmitting ? 'AUTHENTICATING...' : 'ACCESS CONSOLE'}</span>
                      <LogIn className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Footer Info Strip */}
              <div className="border-t border-border px-card-px py-2 bg-[#171717] flex justify-between items-center">
                <span className="font-micro-caps text-micro-caps text-text-tertiary">
                  FASTAPI 0.115 // BACKEND: ONLINE
                </span>
                <span className="font-micro-caps text-micro-caps text-text-tertiary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-calm inline-block"></span> JWT: HS256
                </span>
              </div>
            </BorderGlow>
          </div>
        </section>
      </div>
    </div>
  );
}
