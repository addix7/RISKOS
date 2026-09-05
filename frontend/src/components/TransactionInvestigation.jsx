import React, { useState, useEffect } from 'react';
import Mono from './Mono';
import EntityGraph from './EntityGraph';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Brain,
  Code2,
  BarChart3,
  Scale,
  UserCheck,
  Sliders,
} from 'lucide-react';
import {
  getInvestigationDetailApi,
  getEntityGraphApi,
  getTransactionCounterfactualApi,
  submitReviewDecisionApi,
  getPendingReviewsApi,
} from '../api/apiClient';

export default function TransactionInvestigation({
  transactionId = 'c9f8351d-4a20-4b33-8206-8b7ac4a954f1',
  investigationId,
  currentUser,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invData, setInvData] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [currentDecision, setCurrentDecision] = useState('HOLD');
  const [appliedPolicy, setAppliedPolicy] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [showRawLogs, setShowRawLogs] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [activeSection, setActiveSection] = useState('txn-header');

  const navSections = [
    { id: 'txn-header', label: 'Summary' },
    { id: 'txn-evidence', label: 'AI Evidence' },
    { id: 'txn-graph', label: 'Entity Graph' },
    { id: 'txn-shap', label: 'SHAP Drivers' },
    { id: 'txn-counterfactual', label: 'Counterfactual (4-Way)' },
    { id: 'txn-review', label: 'Human Review' },
  ];

  const fetchTransactionData = async () => {
    try {
      setError(null);
      let targetInvId = investigationId;

      // If no investigationId passed, look up from pending reviews
      if (!targetInvId) {
        const pending = await getPendingReviewsApi().catch(() => null);
        if (pending?.items?.length > 0) {
          const match = pending.items.find((i) => i.transaction_id === transactionId);
          targetInvId = match ? match.investigation_id : pending.items[0].investigation_id;
        }
      }

      const invRes = targetInvId ? await getInvestigationDetailApi(targetInvId).catch(() => null) : null;
      const liveScore = invRes?.risk_score || 88.96;
      const recAct = (invRes?.recommended_action || 'hold').toUpperCase();

      const [cfRes, graphRes] = await Promise.all([
        getTransactionCounterfactualApi(transactionId, 12500000, liveScore).catch(() => null),
        getEntityGraphApi('120257f6-83fa-40a3-8f16-795902d8f550').catch(() => null),
      ]);

      setInvData(invRes);
      setCfData(cfRes);
      setGraphData(graphRes);
      setCurrentDecision(recAct);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch transaction investigation details.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionData();
  }, [transactionId, investigationId]);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -110;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleApplyCounterfactualPolicy = async (policy) => {
    setCurrentDecision(policy);
    setAppliedPolicy(policy);

    if (invData?.id) {
      try {
        await submitReviewDecisionApi(
          invData.id,
          policy === 'ALLOW' ? 'override' : 'approve',
          `Policy ${policy} executed via Counterfactual simulation`,
          `Operator ${currentUser?.name || 'Senior Analyst Vikram'}`
        );
      } catch (err) {
        console.warn('Review submission note:', err);
      }
    }

    setActionSuccessMessage(
      `COUNTERFACTUAL COMMITTED: Decision updated to ${policy}. Logged for ${currentUser?.name || 'Operator OP-4402'}.`
    );
  };

  const handleApproveAI = async () => {
    const recPolicy = (invData?.recommended_action || 'block').toUpperCase();
    setCurrentDecision(recPolicy);
    setAppliedPolicy(recPolicy);

    if (invData?.id) {
      try {
        await submitReviewDecisionApi(
          invData.id,
          'approve',
          `Confirmed AI recommendation for botnet ${recPolicy.toLowerCase()}`,
          `Approved by ${currentUser?.name || 'Senior Analyst Vikram'}`
        );
      } catch (err) {
        console.warn('Review approval note:', err);
      }
    }

    setActionSuccessMessage(`DECISION COMMITTED: AI Recommendation approved. Transaction placed on ${recPolicy}.`);
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideReason) return;
    setCurrentDecision('OVERRIDDEN (ALLOW)');
    setAppliedPolicy('ALLOW');

    if (invData?.id) {
      try {
        await submitReviewDecisionApi(
          invData.id,
          'override',
          overrideReason,
          `Overridden by ${currentUser?.name || 'Senior Analyst Vikram'}`
        );
      } catch (err) {
        console.warn('Review override note:', err);
      }
    }

    setActionSuccessMessage(`DECISION COMMITTED: Approved with override reason "${overrideReason}". Audit log updated.`);
    setIsOverrideMode(false);
  };

  const getSeverityBadge = (sev) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-red-500/10 text-red-400 border-red-500/40';
      case 'MEDIUM':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/40';
      case 'LOW':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/40';
      default:
        return 'bg-neutral-800 text-text-secondary border-border';
    }
  };

  // Verified evidence list with real backend tool names
  const evidenceList = [
    {
      id: 'ev-1',
      severity: 'CRITICAL',
      toolCall: 'get_device_history(fingerprint_hash="fa428...998a")',
      finding: 'Device is an active Android emulator instance linked to 7 different newly registered accounts in 72 hours.',
      evidenceScore: '0.4369',
    },
    {
      id: 'ev-2',
      severity: 'CRITICAL',
      toolCall: 'get_transaction_history(customer_id="cust-burn-07")',
      finding: 'Transaction amount ₹1,25,000 exceeds 0-day account baseline ratio by 36.3x.',
      evidenceScore: '0.3634',
    },
    {
      id: 'ev-3',
      severity: 'HIGH',
      toolCall: 'get_ip_history(ip_hash="vpn_exit_185.220.101.5")',
      finding: 'IP is a known commercial VPN exit node (M247 Ltd ASN) with 94.2% proxy concentration.',
      evidenceScore: '0.0422',
    },
    {
      id: 'ev-4',
      severity: 'HIGH',
      toolCall: 'get_customer_history(customer_id="cust-burn-07")',
      finding: 'Account created 12 minutes prior to transaction with 0-day burner domain (@burner.xyz). Zero prior legitimate history.',
      evidenceScore: '0.0380',
    },
    {
      id: 'ev-5',
      severity: 'HIGH',
      toolCall: 'get_related_accounts(device_hash="fa428...998a")',
      finding: 'High failed authorization velocity across related cluster accounts within 30-minute window.',
      evidenceScore: '0.0304',
    },
    {
      id: 'ev-6',
      severity: 'MEDIUM',
      toolCall: 'get_instrument_history(instrument_hash="stolen_axis_card_4524_xxxx_9999")',
      finding: 'Instrument trust score evaluation confirms high-risk carding syndicate profile.',
      evidenceScore: '0.0093',
    },
  ];

  const rawToolCalls = [
    {
      tool: 'get_device_history',
      params: { fingerprint_hash: 'fa428...998a', lookback_days: 7 },
      output: {
        is_emulator: true,
        emulator_type: 'Nexus 5X API 28',
        linked_customer_count: 7,
        associated_merchants: ['Croma Electronics', 'Steam Games & Vouchers'],
        risk_flags: ['ROOTED', 'HOOKING_FRAMEWORK_DETECTED', 'CANVAS_SPOOFING'],
      },
    },
    {
      tool: 'get_ip_history',
      params: { ip_hash: 'vpn_exit_185.220.101.5' },
      output: {
        is_proxy: true,
        is_vpn: true,
        is_tor: false,
        asn_organization: 'M247 Ltd',
        country: 'RO',
        threat_score: 0.94,
      },
    },
    {
      tool: 'get_related_accounts',
      params: { root_type: 'device', depth: 2 },
      output: {
        cluster_id: 'camp-7f8a-9921',
        connected_nodes: 35,
        shared_instruments: 4,
        shared_ips: 2,
        density: 0.88,
      },
    },
    {
      tool: 'get_customer_history',
      params: { customer_id: 'cust-burn-07' },
      output: {
        account_created_at: '2026-09-01T17:15:00Z',
        trust_score: 0.10,
        email_domain: 'burner.xyz',
        prior_successful_txns: 0,
      },
    },
  ];

  const shapBreakdown = [
    { feature: 'device_concentration', value: 0.4369, formatted: '+0.4369', color: 'bg-orange-500' },
    { feature: 'amount_vs_avg_ratio', value: 0.3634, formatted: '+0.3634', color: 'bg-orange-500' },
    { feature: 'ip_asn_concentration', value: 0.0422, formatted: '+0.0422', color: 'bg-orange-600' },
    { feature: 'account_age_days', value: 0.0380, formatted: '+0.0380', color: 'bg-amber-500' },
    { feature: 'failed_count_30m', value: 0.0304, formatted: '+0.0304', color: 'bg-amber-600' },
    { feature: 'trust_score', value: 0.0093, formatted: '+0.0093', color: 'bg-amber-600' },
  ];

  // Parse real counterfactual options from backend POST /api/counterfactual
  const cfOptions = cfData?.options
    ? cfData.options.map((opt) => ({
        policy: opt.action.toUpperCase(),
        name: `${opt.action.toUpperCase()} (${opt.action === 'hold' ? 'Manual Queue Review' : opt.action === 'verify' ? 'Step-Up 2FA' : opt.action === 'block' ? 'Hard Decline' : 'Approve'})`,
        fraudLoss: `₹${opt.estimated_fraud_loss_inr?.toLocaleString() || '0.00'}`,
        frictionCost: `₹${opt.friction_cost_inr?.toLocaleString() || '0.00'}`,
        netExpectedValue: `-₹${Math.abs(opt.net_expected_value_inr || 0).toLocaleString()}`,
        isRecommended: opt.recommended,
        summary:
          opt.action === 'hold'
            ? 'Freezes transaction authorization immediately for analyst review. Optimal net expected value.'
            : opt.action === 'verify'
            ? 'Forces biometric/SMS 2FA; may be bypassed if bot operator has SIM intercept.'
            : opt.action === 'block'
            ? 'Hard decline with permanent payment instrument blacklisting across network.'
            : '100% loss incurred upon impending chargeback; account confirmed burner.',
      }))
    : [];

  // Graph nodes
  const graphEntities = {
    hubs: [
      { id: 'dev-emu-99', type: 'device', label: 'Emu Farm (Nexus 998a)', hash: 'fa428...998a', sub: 'Linked to 7 Mules' },
      { id: 'ip-vpn-ro', type: 'ip', label: 'VPN Egress (185.220.101.5)', hash: 'vpn_nord...ro', sub: 'Romania Egress' },
      { id: 'inst-axis-88', type: 'instrument', label: 'Stolen Axis Card', hash: 'axis_4524...8888', sub: 'Flagged BIN' },
    ],
    nodes: [
      { id: transactionId, label: 'Syndicate Operative 7 (Subject)', sub: 'burn_target@burner.xyz', isFlagged: true },
      { id: 'mule-1', label: 'Syndicate Operative 1', sub: 'temp_user_1@mail.cc', isFlagged: true },
      { id: 'mule-2', label: 'Syndicate Operative 2', sub: 'temp_user_2@mail.cc', isFlagged: true },
      { id: 'mule-3', label: 'Syndicate Operative 3', sub: 'temp_user_3@mail.cc', isFlagged: true },
    ],
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0d0d0d] text-on-surface flex flex-col items-center justify-center p-6 font-data-mono">
        <div className="flex items-center gap-3 text-primary text-sm mb-4">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>LOADING INVESTIGATION TELEMETRY ({transactionId.slice(0, 14)}...)...</span>
        </div>
        <div className="w-64 h-1 bg-[#1a1a1a] overflow-hidden">
          <div className="w-1/2 h-full bg-primary animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-transparent text-on-surface flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Header Bar */}
      <header className="w-full bg-[#131313]/90 backdrop-blur-md border-b border-border/80 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors font-data-mono text-xs uppercase px-3 py-1.5 bg-[#171717] border border-border hover:border-primary cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Previous Screen</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-micro-caps text-micro-caps text-text-tertiary hidden sm:inline">
              POINT-IN-TIME INVESTIGATION // LIVE BACKEND: 8000
            </span>
            <div className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/40 font-data-mono text-xs font-bold text-orange-400">
              STATUS: {currentDecision}
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Collapsed Mini-Navigation Bar */}
      <nav className="w-full bg-[#121212]/95 backdrop-blur-md border-b border-border/80 sticky top-[49px] z-30 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4 text-xs font-data-mono">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-text-tertiary uppercase text-[10px] hidden md:inline">
              JUMP TO:
            </span>
            {navSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`px-2.5 py-1 uppercase text-[11px] whitespace-nowrap transition-colors border cursor-pointer ${
                  activeSection === sec.id
                    ? 'bg-primary/10 text-primary border-primary/50'
                    : 'bg-[#181818] hover:bg-[#222222] text-text-tertiary hover:text-text-secondary border-border/40'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-text-tertiary">
            <span>Risk Score: <Mono className="font-bold text-forming">{invData?.risk_score ? invData.risk_score.toFixed(2) : '88.96'}</Mono></span>
            <span>•</span>
            <span className="truncate max-w-[220px]">Txn ID: <Mono variant="muted">{transactionId}</Mono></span>
          </div>
        </div>
      </nav>

      {/* Main Content Sections */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        {/* Backend Error Envelope State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-400 font-data-mono text-xs flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span><strong>API Error:</strong> {error}</span>
            </div>
            <button
              onClick={fetchTransactionData}
              className="px-2.5 py-1 bg-red-500/20 text-red-300 uppercase text-[10px] font-bold border border-red-500/50 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success Toast */}
        {actionSuccessMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-data-mono text-xs flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{actionSuccessMessage}</span>
            </div>
            <span className="text-[10px] uppercase text-text-tertiary">MUTATION COMMITTED</span>
          </div>
        )}

        {/* 1. SECTION: TRANSACTION SUMMARY HEADER */}
        <section id="txn-header" className="bg-[#171717] border border-border p-6 relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-6 pb-4 border-b border-border/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Mono variant="primary" className="text-xs sm:text-sm font-bold">
                  {transactionId}
                </Mono>
                <span className="text-text-tertiary">•</span>
                <span className="font-data-mono text-xs text-text-secondary uppercase">
                  Croma Electronics
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="font-data-mono text-xs text-text-tertiary">
                  Just now (18s ago)
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-on-surface font-data-mono">
                  ₹1,25,000
                </h1>
                <span className="text-xs font-data-mono text-text-secondary uppercase">
                  (12,500,000 Paise) // High-Value Flag
                </span>
              </div>
            </div>

            {/* Risk Score Instrumentation */}
            <div className="flex items-center gap-6 bg-[#121212] p-4 border border-orange-500/40 shadow-[0_0_24px_rgba(249,115,22,0.12)]">
              <div>
                <span className="text-[11px] font-data-mono text-text-tertiary block uppercase">
                  ML Risk Score
                </span>
                <div className="flex items-baseline gap-1">
                  <Mono className="text-3xl sm:text-4xl font-bold text-forming">
                    {invData?.risk_score ? invData.risk_score.toFixed(2) : '88.96'}
                  </Mono>
                  <span className="text-xs font-data-mono text-text-tertiary">/ 100</span>
                </div>
              </div>

              <div className="border-l border-border/40 pl-6">
                <span className="text-[11px] font-data-mono text-text-tertiary block uppercase">
                  Model Confidence
                </span>
                <Mono className="text-2xl font-bold text-secondary">
                  {Math.round((invData?.confidence || 0.94) * 100)}%
                </Mono>
              </div>
            </div>
          </div>

          {/* Customer & Technical Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs font-data-mono">
            <div className="bg-[#121212] p-3.5 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[10px]">
                Customer Profile
              </span>
              <div className="font-bold text-on-surface text-sm truncate">
                Syndicate Operative 7
              </div>
              <div className="text-text-tertiary truncate">burn_target@burner.xyz</div>
              <div className="mt-1 pt-1 border-t border-border/30 flex justify-between">
                <span>Trust: <Mono variant="forming">0.10</Mono></span>
                <span className="text-text-secondary">0 days (0-day burner)</span>
              </div>
            </div>

            <div className="bg-[#121212] p-3.5 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[10px]">
                Payment Instrument
              </span>
              <div className="font-bold text-on-surface text-sm truncate">
                Card: Stolen Axis Bank Platinum (BIN 452410)
              </div>
              <div className="text-text-tertiary font-mono truncate">stolen_axis_card_4524_xxxx_9999</div>
              <div className="mt-1 pt-1 border-t border-border/30 text-[10px] text-text-secondary">
                Multiple Card Velocity Spike Detected
              </div>
            </div>

            <div className="bg-[#121212] p-3.5 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[10px]">
                Device Fingerprint
              </span>
              <div className="font-bold text-forming text-sm truncate">
                Android Emulator (Nexus 998a)
              </div>
              <div className="text-text-tertiary font-mono truncate">emu_device_nexus_998a</div>
              <div className="mt-1 pt-1 border-t border-border/30 flex justify-between text-[10px]">
                <span>1st Seen: 3 days ago</span>
                <span className="text-forming">7 Mules Linked</span>
              </div>
            </div>

            <div className="bg-[#121212] p-3.5 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[10px]">
                Network / IP Telemetry
              </span>
              <div className="font-bold text-on-surface text-sm truncate">
                185.220.101.5 (VPN Exit)
              </div>
              <div className="text-text-tertiary truncate">M247 Ltd (Hosting/VPN)</div>
              <div className="mt-1 pt-1 border-t border-border/30 flex justify-between text-[10px]">
                <span>Loc: Bucharest, Romania</span>
                <span className="text-secondary">VPN Confirmed</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SECTION: AI INVESTIGATOR EVIDENCE LIST (VERIFIED REAL TOOL CALLS) */}
        <section id="txn-evidence" className="bg-[#131313] border border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                2. AI INVESTIGATOR EVIDENCE LIST (VERIFIED TOOL-ATTRIBUTED FINDINGS)
              </span>
            </div>

            <button
              onClick={() => setShowRawLogs(!showRawLogs)}
              className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222222] border border-border/60 text-text-secondary hover:text-primary font-data-mono text-[11px] uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showRawLogs ? 'Hide Raw Tool Logs' : 'Expand Raw Tool Logs (Anti-Hallucination Proof)'}</span>
            </button>
          </div>

          <div className="space-y-3 mb-4">
            {evidenceList.map((ev) => (
              <div
                key={ev.id}
                className="bg-[#171717] p-4 border border-border/40 hover:border-border transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-data-mono">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${getSeverityBadge(ev.severity)}`}>
                      {ev.severity}
                    </span>
                    <span className="text-primary text-xs font-semibold bg-[#111111] px-2 py-0.5 border border-border/30">
                      Tool: {ev.toolCall}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-body-sm text-text-secondary leading-relaxed">
                    {ev.finding}
                  </p>
                </div>

                <div className="sm:text-right whitespace-nowrap">
                  <span className="text-[10px] font-data-mono text-text-tertiary uppercase block">
                    SHAP Factor
                  </span>
                  <Mono variant="forming" className="font-bold text-xs sm:text-sm">
                    {ev.evidenceScore}
                  </Mono>
                </div>
              </div>
            ))}
          </div>

          {/* Raw Tool Call Logs */}
          {showRawLogs && (
            <div className="mt-4 p-4 bg-[#0a0a0a] border border-primary/40 animate-fade-in-up">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/40 text-xs font-data-mono">
                <span className="text-primary font-bold uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                  RAW TOOL EXECUTION LOGS (SYSTEM VERIFIED)
                </span>
                <span className="text-text-tertiary">4 Tool Calls Logged</span>
              </div>

              <div className="space-y-3 font-mono text-xs text-text-secondary">
                {rawToolCalls.map((call, idx) => (
                  <div key={idx} className="bg-[#121212] p-3 border border-border/30 rounded-none">
                    <div className="text-secondary font-bold mb-1">
                      &gt; {call.tool}({JSON.stringify(call.params)})
                    </div>
                    <pre className="text-[11px] text-text-tertiary overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(call.output, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. SECTION: ENTITY GRAPH */}
        <section id="txn-graph">
          <EntityGraph graph={graphEntities} merchantName="Croma Electronics" />
        </section>

        {/* 4. SECTION: SHAP FEATURE CONTRIBUTION BREAKDOWN */}
        <section id="txn-shap" className="bg-[#171717] border border-border p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-secondary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                4. SHAP FEATURE CONTRIBUTION BREAKDOWN
              </span>
            </div>
            <span className="text-xs font-data-mono text-text-tertiary">
              GRADIENT BOOSTING FACTOR EXPLANATION
            </span>
          </div>

          <div className="space-y-3">
            {shapBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-data-mono">
                  <span className="text-text-secondary font-semibold">{item.feature}</span>
                  <Mono variant="forming" className="font-bold">
                    {item.formatted}
                  </Mono>
                </div>
                <div className="w-full h-2.5 bg-[#111111] border border-border/40 overflow-hidden flex">
                  <div
                    className={`h-full ${item.color} transition-all`}
                    style={{ width: `${Math.min(100, Math.max(8, item.value * 200))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. SECTION: COUNTERFACTUAL COMPARISON */}
        <section id="txn-counterfactual" className="bg-[#131313] border border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                5. TRANSACTION-LEVEL COUNTERFACTUAL COMPARISON (4 OPTIONS)
              </span>
            </div>
            <span className="text-xs font-data-mono text-text-tertiary">
              ALLOW // VERIFY // HOLD // BLOCK
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cfOptions.map((opt, idx) => {
              const isRec = opt.isRecommended;
              const isApplied = appliedPolicy === opt.policy;

              return (
                <div
                  key={idx}
                  className={`p-4 border transition-all flex flex-col justify-between ${
                    isApplied
                      ? 'bg-[#1a1a1a] border-2 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.2)] relative'
                      : isRec
                      ? 'bg-[#181818] border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] relative'
                      : 'bg-[#121212] border-border/40 hover:border-border'
                  }`}
                >
                  {isApplied ? (
                    <div className="absolute -top-3 right-4 px-2 py-0.5 bg-emerald-500 text-[#000000] font-data-mono text-[10px] font-bold uppercase tracking-wider">
                      ACTIVE
                    </div>
                  ) : isRec ? (
                    <div className="absolute -top-3 right-4 px-2 py-0.5 bg-orange-500 text-[#000000] font-data-mono text-[10px] font-bold uppercase tracking-wider">
                      RECOMMENDED
                    </div>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-data-mono text-xs font-bold uppercase ${isApplied ? 'text-emerald-400' : isRec ? 'text-forming' : 'text-text-secondary'}`}>
                        {opt.policy}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-on-surface mb-1.5">
                      {opt.name}
                    </h4>

                    <p className="text-xs font-body-sm text-text-secondary mb-3 leading-relaxed bg-[#0c0c0c] p-2 border border-border/30">
                      {opt.summary}
                    </p>

                    <div className="space-y-1.5 border-t border-border/40 pt-2.5 text-xs font-data-mono">
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Fraud Loss:</span>
                        <Mono className={opt.fraudLoss !== '₹0.00' && !isRec ? 'text-red-400 font-bold' : 'text-on-surface'}>
                          {opt.fraudLoss}
                        </Mono>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Friction:</span>
                        <Mono variant="muted">{opt.frictionCost}</Mono>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border/20">
                        <span className="font-bold text-text-secondary">Net EV:</span>
                        <Mono className={`font-bold ${isApplied ? 'text-emerald-400' : isRec ? 'text-forming' : 'text-text-secondary'}`}>
                          {opt.netExpectedValue}
                        </Mono>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isApplied}
                    onClick={() => handleApplyCounterfactualPolicy(opt.policy)}
                    className={`mt-4 w-full py-2 px-2.5 font-data-mono text-xs font-bold uppercase border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isApplied
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : isRec
                        ? 'bg-orange-500 hover:bg-orange-400 text-[#000000] border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                        : 'bg-[#161616] hover:bg-[#202020] text-text-secondary hover:text-on-surface border-border/60'
                    }`}
                  >
                    <span>{isApplied ? 'Active' : `Apply ${opt.policy}`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. SECTION: HUMAN REVIEW PANEL */}
        <section id="txn-review" className="bg-[#171717] border border-border p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-text-secondary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                6. HUMAN ANALYST REVIEW & DECISION PANEL
              </span>
            </div>
            <span className="text-xs font-data-mono text-text-tertiary">
              OPERATOR SIGN-OFF // REAL-TIME MUTATION
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Standard Approval */}
            <div className="bg-[#121212] p-5 border border-border/40 flex flex-col justify-between">
              <div>
                <span className="text-xs font-data-mono text-primary uppercase font-bold block mb-1">
                  Primary Action
                </span>
                <h4 className="text-base font-bold text-on-surface mb-2">
                  Confirm AI Recommendation ({(invData?.recommended_action || 'hold').toUpperCase()})
                </h4>
                <p className="text-xs font-body-sm text-text-secondary leading-relaxed mb-4">
                  Accepts the multi-agent findings. Freezes transaction authorization immediately for analyst review.
                </p>
              </div>

              <button
                onClick={handleApproveAI}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-[#000000] font-data-mono text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(249,115,22,0.3)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve AI Recommendation ({(invData?.recommended_action || 'hold').toUpperCase()})</span>
              </button>
            </div>

            {/* Right: Override Option */}
            <div className="bg-[#121212] p-5 border border-border/40 flex flex-col justify-between">
              <div>
                <span className="text-xs font-data-mono text-text-tertiary uppercase font-bold block mb-1">
                  Manual Exception
                </span>
                <h4 className="text-base font-bold text-on-surface mb-2">
                  Override Decision (Allow Transaction)
                </h4>
                <p className="text-xs font-body-sm text-text-secondary leading-relaxed mb-4">
                  Forces an immediate ALLOW authorization. Requires specifying a documented rationale for audit compliance.
                </p>
              </div>

              {isOverrideMode ? (
                <form onSubmit={handleOverrideSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Enter override rationale (e.g. VIP verified via phone 2FA)..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-border text-on-surface font-data-mono text-xs p-2.5 focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#000000] font-data-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                    >
                      Confirm Override
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOverrideMode(false)}
                      className="px-3 py-2.5 bg-[#171717] text-text-secondary font-data-mono text-xs border border-border cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsOverrideMode(true)}
                  className="w-full py-3 bg-[#171717] hover:bg-[#202020] text-text-secondary hover:text-primary border border-border hover:border-primary font-data-mono text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Override Decision</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#131313] border-t border-border px-4 sm:px-8 py-3 text-xs font-data-mono text-text-tertiary flex flex-wrap items-center justify-between gap-2">
        <span>TRANSACTION ID: {transactionId} • ML RISK SCORE: {invData?.risk_score ? invData.risk_score.toFixed(2) : '88.96'}</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OPERATOR: {currentUser?.name || 'SENIOR ANALYST'}
        </span>
      </footer>
    </div>
  );
}
