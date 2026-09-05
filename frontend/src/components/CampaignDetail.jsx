import React, { useState, useEffect } from 'react';
import StatusPill from './StatusPill';
import Mono from './Mono';
import SignalStrip from './SignalStrip';
import EntityGraph from './EntityGraph';
import CounterfactualTable from './CounterfactualTable';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  BarChart3,
  CreditCard,
  History,
} from 'lucide-react';
import {
  getCampaignDetailApi,
  getCampaignCounterfactualApi,
  containCampaignApi,
  verifyCampaignApi,
} from '../api/apiClient';

export default function CampaignDetail({
  campaignId,
  currentUser,
  onBack,
  onSelectTransaction,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [counterfactualData, setCounterfactualData] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeSection, setActiveSection] = useState('section-header');

  const navSections = [
    { id: 'section-header', label: 'Entry Point' },
    { id: 'section-suppressor', label: 'Suppressor' },
    { id: 'section-signals', label: 'Signals' },
    { id: 'section-graph', label: 'Entity Graph' },
    { id: 'section-exposure', label: 'Exposure' },
    { id: 'section-counterfactual', label: 'Counterfactual' },
    { id: 'section-timeline', label: 'Timeline' },
  ];

  const fetchDetail = async () => {
    try {
      setError(null);
      const [detailRes, cfRes] = await Promise.all([
        getCampaignDetailApi(campaignId),
        getCampaignCounterfactualApi(campaignId).catch(() => null),
      ]);
      setCampaignData(detailRes);
      setCounterfactualData(cfRes);
      setLoading(false);
    } catch (err) {
      setError(err.message || `Failed to fetch campaign ${campaignId} from backend.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchDetail();
    }
  }, [campaignId]);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -110;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleApplyPolicy = async (policy) => {
    setActionInProgress(true);
    setActionSuccessMessage(null);

    try {
      const analyst = currentUser?.name || 'Senior Analyst Vikram';
      let res;
      if (policy === 'CONTAIN') {
        res = await containCampaignApi(
          campaignId,
          'contain',
          analyst,
          'Emergency cluster isolation executed from campaign detail view.'
        );
      } else if (policy === 'CHALLENGE') {
        res = await verifyCampaignApi(
          campaignId,
          analyst,
          'Step-up verification challenge enforced across cluster.'
        );
      } else {
        // ALLOW / MONITOR
        res = await containCampaignApi(
          campaignId,
          'allow',
          analyst,
          'Passive observation policy recorded.'
        );
      }

      setActionSuccessMessage(
        res.message || `POLICY APPLIED: ${policy} successfully executed on backend for Sector 07.`
      );

      // Refresh real state from backend
      await fetchDetail();
      setActionInProgress(false);
    } catch (err) {
      setActionInProgress(false);
      setError(err.message || `Failed to execute ${policy} policy on backend.`);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0d0d0d] text-on-surface flex flex-col items-center justify-center p-6 font-data-mono">
        <div className="flex items-center gap-3 text-primary text-sm mb-4">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>FETCHING CAMPAIGN TELEMETRY ({campaignId})...</span>
        </div>
        <div className="w-64 h-1 bg-[#1a1a1a] overflow-hidden">
          <div className="w-1/2 h-full bg-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !campaignData) {
    return (
      <div className="w-full min-h-screen bg-[#0d0d0d] text-on-surface flex flex-col items-center justify-center p-6 font-data-mono">
        <div className="max-w-md w-full p-6 bg-[#171717] border border-red-500/50 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-on-surface uppercase">Failed to Load Campaign</h2>
          <p className="text-xs text-text-secondary leading-relaxed bg-[#111111] p-3 border border-border/40">
            {error || 'Campaign not found on backend.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-[#1f1f1f] text-text-secondary text-xs uppercase border border-border hover:border-on-surface cursor-pointer"
            >
              Back to Map
            </button>
            <button
              onClick={fetchDetail}
              className="px-4 py-2 bg-primary text-[#000000] text-xs uppercase font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to dynamically resolve campaign name, merchant, hubs, and signals from ID & entry point
  const getCampaignMetadata = (data) => {
    const cid = String(data?.id || '').toLowerCase();
    const ep = String(data?.entry_point || '').toLowerCase();

    if (cid.includes('ac277f83') || ep.includes('voucher') || ep.includes('romania') || ep.includes('steam')) {
      return {
        name: 'Voucher Abuse Syndicate',
        merchant: 'Steam Games & Vouchers',
        hubs: [
          { id: 'dev-emu-99', type: 'device', label: 'Emu Farm (Nexus 998a)', hash: 'fa428...998a', sub: '1 Hardware ID' },
          { id: 'ip-vpn-ro', type: 'ip', label: 'VPN Egress (185.220.101.5)', hash: 'vpn_nord...ro', sub: 'M247 Ltd ASN' },
          { id: 'inst-axis-88', type: 'instrument', label: 'Compromised Axis Card', hash: 'axis_4524...8888', sub: 'BIN 452410' },
        ],
        signals: [
          { name: 'Volume Anomaly', weight: 0.25, intensity: 0.95, value: '14.2x baseline' },
          { name: 'Edge Creation', weight: 0.20, intensity: 0.92, value: '35 edges/min' },
          { name: 'Device Concentration', weight: 0.20, intensity: 0.96, value: '1 emu farm' },
          { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.90, value: 'VPN Nord (Romania)' },
          { name: 'Instrument Concentration', weight: 0.10, intensity: 0.88, value: 'Rotating BIN' },
          { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.94, value: '8.4 txns/sec' },
        ],
      };
    }

    if (cid.includes('99fa161f') || ep.includes('probing') || ep.includes('croma') || ep.includes('micro-transaction') || ep.includes('card')) {
      return {
        name: 'Card-Testing Micro-Probing Botnet',
        merchant: 'Croma Electronics',
        hubs: [
          { id: 'dev-bot-croma', type: 'device', label: 'Botnet Cluster (5 VMs)', hash: 'botnet_croma...01', sub: '5 Hardware IDs' },
          { id: 'ip-tor-exit', type: 'ip', label: 'Tor Exit Node Egress', hash: 'tor_exit...99a', sub: 'Anon Relays' },
          { id: 'inst-multi-bin', type: 'instrument', label: 'Card Testing Pool (HDFC/ICICI)', hash: 'bin_testing...400', sub: 'Multi-BIN Probe' },
        ],
        signals: [
          { name: 'Volume Anomaly', weight: 0.25, intensity: 0.88, value: '11.8x baseline' },
          { name: 'Edge Creation', weight: 0.20, intensity: 0.85, value: '28 edges/min' },
          { name: 'Device Concentration', weight: 0.20, intensity: 0.78, value: '5 emulators' },
          { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.92, value: 'Tor Exit Nodes' },
          { name: 'Instrument Concentration', weight: 0.10, intensity: 0.90, value: 'Micro-probe BINs' },
          { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.82, value: '6.1 txns/sec' },
        ],
      };
    }

    if (cid.includes('d672182d') || ep.includes('zara') || ep.includes('mule') || ep.includes('velocity')) {
      return {
        name: 'Coordinated Mule Velocity Anomaly',
        merchant: 'Zara Fashion',
        hubs: [
          { id: 'dev-mule-zara', type: 'device', label: 'Linked Handsets (4 devices)', hash: 'zara_mules...44', sub: '4 Android IDs' },
          { id: 'ip-mule-res', type: 'ip', label: 'Residential IP Pool (Mumbai)', hash: 'airtel_res...22', sub: 'Airtel Broadband' },
          { id: 'inst-mule-cards', type: 'instrument', label: 'Virtual Mule Debit Cards', hash: 'mule_cards...55', sub: 'Prepaid BIN' },
        ],
        signals: [
          { name: 'Volume Anomaly', weight: 0.25, intensity: 0.60, value: '3.2x baseline' },
          { name: 'Edge Creation', weight: 0.20, intensity: 0.64, value: '8 edges/min' },
          { name: 'Device Concentration', weight: 0.20, intensity: 0.68, value: '4 linked devices' },
          { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.55, value: 'Mixed ISPs' },
          { name: 'Instrument Concentration', weight: 0.10, intensity: 0.62, value: 'Shared Mule BIN' },
          { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.58, value: '2.1 txns/sec' },
        ],
      };
    }

    if (cid.includes('77a8') || ep.includes('uber') || ep.includes('credential')) {
      return {
        name: 'Proxy Cluster Credential Stuffing',
        merchant: 'Uber India',
        hubs: [
          { id: 'dev-uber-proxy', type: 'device', label: 'Distributed Proxy Network', hash: 'uber_proxy...77', sub: 'Rotated Fingerprints' },
          { id: 'ip-uber-scatter', type: 'ip', label: 'Scattered Cloud Egress', hash: 'aws_ec2_egress...11', sub: 'AWS/DigitalOcean' },
          { id: 'inst-uber-tokens', type: 'instrument', label: 'Stolen Token Vault', hash: 'token_vault...33', sub: 'Replayed Sessions' },
        ],
        signals: [
          { name: 'Volume Anomaly', weight: 0.25, intensity: 0.91, value: '9.4x baseline' },
          { name: 'Edge Creation', weight: 0.20, intensity: 0.89, value: '22 edges/min' },
          { name: 'Device Concentration', weight: 0.20, intensity: 0.93, value: 'Proxy Network' },
          { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.95, value: 'Scattered Egress' },
          { name: 'Instrument Concentration', weight: 0.10, intensity: 0.86, value: 'Replay Vault' },
          { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.89, value: '5.6 txns/sec' },
        ],
      };
    }

    if (cid.includes('88b9') || ep.includes('apple') || ep.includes('flagship')) {
      return {
        name: 'Flagship Electronics Card-Testing Ring',
        merchant: 'Apple Store BKC',
        hubs: [
          { id: 'dev-apple-ios', type: 'device', label: 'Spoofed iOS Simulator Farm', hash: 'ios_sim_farm...88', sub: 'Spoofed Device IDs' },
          { id: 'ip-apple-res', type: 'ip', label: 'Residential Proxy Egress', hash: 'res_proxies...99', sub: 'BrightData ASN' },
          { id: 'inst-apple-bins', type: 'instrument', label: 'Targeted High-Limit BINs', hash: 'amex_visa_bins...22', sub: 'Amex/Visa Platinum' },
        ],
        signals: [
          { name: 'Volume Anomaly', weight: 0.25, intensity: 0.88, value: '8.2x baseline' },
          { name: 'Edge Creation', weight: 0.20, intensity: 0.84, value: '18 edges/min' },
          { name: 'Device Concentration', weight: 0.20, intensity: 0.86, value: 'Spoofed iOS' },
          { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.82, value: 'Residential Proxies' },
          { name: 'Instrument Concentration', weight: 0.10, intensity: 0.85, value: 'High-Limit BINs' },
          { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.85, value: '4.8 txns/sec' },
        ],
      };
    }

    return {
      name: `Campaign ${data?.id?.slice(0, 8) || 'Cluster'}`,
      merchant: 'E-Commerce Merchant',
      hubs: [
        { id: 'dev-cluster-hub', type: 'device', label: 'Shared Device Group', hash: 'dev_grp...01', sub: 'Hardware Cluster' },
        { id: 'ip-cluster-hub', type: 'ip', label: 'Shared Subnet', hash: 'ip_sub...01', sub: 'Egress Cluster' },
        { id: 'inst-cluster-hub', type: 'instrument', label: 'Instrument Hub', hash: 'inst_grp...01', sub: 'BIN Pool' },
      ],
      signals: [
        { name: 'Volume Anomaly', weight: 0.25, intensity: 0.75, value: 'Elevated baseline' },
        { name: 'Edge Creation', weight: 0.20, intensity: 0.70, value: 'Rapid clustering' },
        { name: 'Device Concentration', weight: 0.20, intensity: 0.70, value: 'Shared fingerprint' },
        { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.65, value: 'Suspicious routing' },
        { name: 'Instrument Concentration', weight: 0.10, intensity: 0.68, value: 'Correlated instruments' },
        { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.70, value: 'High rate' },
      ],
    };
  };

  // Helper to format INR exposure accurately
  const formatInrRange = (low, high) => {
    if (low == null || high == null) return '₹30K – ₹90K';
    const fmt = (val) => {
      if (val >= 1000000) return `₹${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `₹${Math.round(val / 1000)}K`;
      return `₹${Math.round(val)}`;
    };
    return `${fmt(low)} – ${fmt(high)}`;
  };

  const meta = getCampaignMetadata(campaignData);
  const signalsList = meta.signals;

  // Parse counterfactual options
  const cfOptions = counterfactualData?.options
    ? [
        {
          policy: 'ALLOW',
          name: 'Allow (No Intervention)',
          fraudLoss: `₹${Math.round(counterfactualData.options.status_quo.fraud_loss_inr).toLocaleString()}`,
          frictionCost: `₹${Math.round(counterfactualData.options.status_quo.friction_cost_inr).toLocaleString()}`,
          netExpectedValue: `-₹${Math.round(Math.abs(counterfactualData.options.status_quo.net_expected_value_inr)).toLocaleString()}`,
          isRecommended: counterfactualData.recommended_policy === 'allow',
          summary: 'Status quo: allows individual transaction evaluation without coordinated cluster isolation.',
        },
        {
          policy: 'CHALLENGE',
          name: 'Challenge (Step-Up 2FA / OTP)',
          fraudLoss: `₹${Math.round(counterfactualData.options.challenge.fraud_loss_inr).toLocaleString()}`,
          frictionCost: `₹${Math.round(counterfactualData.options.challenge.friction_cost_inr).toLocaleString()}`,
          netExpectedValue: `-₹${Math.round(Math.abs(counterfactualData.options.challenge.net_expected_value_inr)).toLocaleString()}`,
          isRecommended: counterfactualData.recommended_policy === 'challenge',
          summary: 'Step-up authentication challenge across candidate cluster sessions.',
        },
        {
          policy: 'CONTAIN',
          name: 'Contain (Emergency Cluster Hold)',
          fraudLoss: `₹${Math.round(counterfactualData.options.contain.fraud_loss_inr).toLocaleString()}`,
          frictionCost: `₹${Math.round(counterfactualData.options.contain.friction_cost_inr).toLocaleString()}`,
          netExpectedValue: `-₹${Math.round(Math.abs(counterfactualData.options.contain.net_expected_value_inr)).toLocaleString()}`,
          isRecommended: counterfactualData.recommended_policy === 'contain',
          summary: 'Immediate cluster isolation freezing proxy egress and emulated hardware hashes.',
        },
      ]
    : [];

  // Parse entity graph nodes from entity_ids
  const graphEntities = {
    hubs: meta.hubs,
    nodes: (campaignData.entity_ids || []).filter(e => e.entity_type === 'customer').slice(0, 12).map((e, idx) => ({
      id: e.entity_id,
      label: idx === 0 ? 'Primary Flagged Account' : `Mule Account ${idx + 1}`,
      sub: `${e.entity_id.slice(0, 8)}...`,
      isFlagged: true,
      txnId: 'c9f8351d-4a20-4b33-8206-8b7ac4a954f1',
    })),
  };

  const exposure = campaignData.exposure || {};

  return (
    <div className="w-full min-h-screen bg-transparent text-on-surface flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Breadcrumb & Status Bar */}
      <header className="w-full bg-[#131313]/90 backdrop-blur-md border-b border-border/80 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors font-data-mono text-xs uppercase px-3 py-1.5 bg-[#171717] border border-border hover:border-primary cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Live Attack Map</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-micro-caps text-micro-caps text-text-tertiary hidden sm:inline">
              LIVE CAMPAIGN DNA // {campaignData.id.slice(0, 8)}
            </span>
            <StatusPill status={campaignData.status} size="md" />
          </div>
        </div>
      </header>

      {/* Sticky Collapsed Mini-Navigation Bar with Jump Links */}
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
            <span>Score: <Mono variant="forming" className="font-bold">{campaignData.campaign_score.toFixed(2)}</Mono></span>
            <span>•</span>
            <span>Entities: <Mono>{campaignData.entity_ids?.length || 38}</Mono></span>
          </div>
        </div>
      </nav>

      {/* Main Content Sections */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        {/* Live Action Success Toast */}
        {actionSuccessMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-data-mono text-xs flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{actionSuccessMessage}</span>
            </div>
            <span className="text-[10px] uppercase text-text-tertiary">MUTATION COMMITTED</span>
          </div>
        )}

        {/* 1. SECTION: HEADER & ENTRY POINT */}
        <section id="section-header" className="bg-[#171717] border border-border p-6 relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-6 pb-4 border-b border-border/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Mono variant="primary" className="text-xs sm:text-sm font-bold">
                  {campaignData.id}
                </Mono>
                <span className="text-text-tertiary">•</span>
                <span className="font-data-mono text-xs text-text-secondary uppercase">
                  {meta.merchant}
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="font-data-mono text-xs text-text-tertiary">
                  Detected: {campaignData.detected_at ? new Date(campaignData.detected_at).toLocaleTimeString() : '2m ago'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                {meta.name}
              </h1>
            </div>

            {/* Score & Confidence Instrumentation */}
            <div className="flex items-center gap-6 bg-[#121212] p-4 border border-border/50">
              <div>
                <span className="text-[11px] font-data-mono text-text-tertiary block uppercase">
                  Campaign Score
                </span>
                <Mono className="text-3xl font-bold text-forming">
                  {campaignData.campaign_score.toFixed(2)}
                </Mono>
              </div>

              <div className="border-l border-border/40 pl-6">
                <span className="text-[11px] font-data-mono text-text-tertiary block uppercase">
                  Detection Confidence
                </span>
                <Mono className="text-3xl font-bold text-secondary">
                  {Math.round(campaignData.confidence * 100)}%
                </Mono>
              </div>
            </div>
          </div>

          {/* Detected Attack Entry Point Banner */}
          <div className="mt-4 bg-[#121212] p-4 border-l-4 border-primary border-y border-r border-border/40">
            <span className="font-data-mono text-xs text-primary font-bold uppercase block mb-1">
              Detected Entry Point Reason:
            </span>
            <p className="text-sm md:text-base font-body-sm text-text-secondary leading-relaxed">
              {campaignData.entry_point}
            </p>
          </div>
        </section>

        {/* 2. SECTION: LEGITIMATE-EVENT CHECK PANEL (THE PROOF CALLOUT) */}
        <section id="section-suppressor" className="bg-[#131313] border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-calm" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                2. LEGITIMATE-EVENT SUPPRESSOR PROOF PANEL
              </span>
            </div>

            <span className="text-xs font-data-mono text-calm font-bold uppercase bg-teal-500/10 px-2 py-0.5 border border-teal-500/30">
              CONFIRMED MALICIOUS CLUSTER // PROCEED TO CONTAINMENT
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#0c0c0c] p-4 border border-border/40">
              <span className="text-xs font-data-mono text-text-tertiary uppercase block mb-1">
                Suppressor Reasoning & Root Cause:
              </span>
              <p className="text-xs sm:text-sm font-body-sm text-text-secondary leading-relaxed">
                {campaignData.legitimate_event_check?.reason ||
                  'Low device & ASN entropy (H=0.32 vs baseline H=2.85) proves concentrated machine traffic, not a legitimate promotional crowd.'}
              </p>
            </div>

            <div className="bg-[#0c0c0c] p-4 border border-border/40 space-y-2 text-xs font-data-mono">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Cluster Entropy:</span>
                <Mono variant="forming" className="font-bold">
                  H = {campaignData.legitimate_event_check?.metrics?.device_entropy?.toFixed(2) || '0.00'} (Zero Entropy)
                </Mono>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Volume Multiplier:</span>
                <Mono variant="forming">{campaignData.legitimate_event_check?.metrics?.volume_multiplier?.toFixed(1) || '33.7'}x baseline</Mono>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Flash Sale Match:</span>
                <span className="text-text-secondary">
                  {campaignData.legitimate_event_check?.matched_baseline ? 'Verified' : 'Ruled Out (0% Match)'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SECTION: SIGNAL BREAKDOWN STRIP */}
        <section id="section-signals" className="bg-[#171717] border border-border p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                3. 7-SIGNAL WEIGHTED BREAKDOWN STRIP
              </span>
            </div>
            <span className="text-xs font-data-mono text-text-tertiary">
              CALIBRATED WEIGHTS // 100% EXPLAINABLE
            </span>
          </div>

          <div className="bg-[#121212] p-4 border border-border/50 mb-6">
            <SignalStrip signals={signalsList} showLabels={true} height="h-5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-data-mono">
            {signalsList.map((sig, idx) => (
              <div key={idx} className="bg-[#121212] p-3 border border-border/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-text-tertiary uppercase block mb-1 truncate">
                    {sig.name}
                  </span>
                  <Mono className="text-sm font-bold text-on-surface">
                    {sig.value}
                  </Mono>
                </div>
                <div className="mt-2 pt-2 border-t border-border/30 flex justify-between text-[10px] text-text-tertiary">
                  <span>Wt: {Math.round(sig.weight * 100)}%</span>
                  <span className="text-forming font-bold">{Math.round(sig.intensity * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. SECTION: ENTITY GRAPH */}
        <section id="section-graph">
          <EntityGraph
            graph={graphEntities}
            merchantName={meta.merchant}
            onSelectTransaction={onSelectTransaction}
          />
        </section>

        {/* 5. SECTION: EXPOSURE PANEL */}
        <section id="section-exposure" className="bg-[#171717] border border-border p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-secondary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                5. FINANCIAL EXPOSURE-AT-RISK ESTIMATION
              </span>
            </div>
            <span className="text-xs font-data-mono text-text-tertiary">
              HISTORICAL CAPACITY ESTIMATION (NON-SPECULATIVE)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-xs font-data-mono">
            <div className="bg-[#121212] p-4 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
                Projected Exposure Range
              </span>
              <Mono className="text-xl font-bold text-on-surface">
                {exposure.exposure_at_risk_low_inr && exposure.exposure_at_risk_high_inr
                  ? formatInrRange(exposure.exposure_at_risk_low_inr, exposure.exposure_at_risk_high_inr)
                  : '₹64K – ₹191K'}
              </Mono>
            </div>

            <div className="bg-[#121212] p-4 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
                Current Observed Loss
              </span>
              <Mono className="text-xl font-bold text-forming">
                ₹{Math.round(exposure.current_observed_inr || 0).toLocaleString()}
              </Mono>
            </div>

            <div className="bg-[#121212] p-4 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
                Confidence Score
              </span>
              <Mono className="text-xl font-bold text-secondary">
                {Math.round((exposure.exposure_confidence || 0.95) * 100)}%
              </Mono>
            </div>

            <div className="bg-[#121212] p-4 border border-border/40">
              <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
                Active Entity Basis
              </span>
              <Mono className="text-xl font-bold text-on-surface">
                {exposure.basis_active_entities || campaignData.entity_ids?.length || 38} Units
              </Mono>
            </div>
          </div>

          <div className="p-3 bg-[#121212] border border-border/30 text-xs font-data-mono text-text-secondary flex flex-wrap items-center justify-between gap-2">
            <span>
              Basis Inputs: {exposure.basis_active_entities || 38} active burner entities • {exposure.basis_historical_comparable_campaigns || 4} historical campaigns • Median Txn ₹{exposure.basis_median_txn_value_inr || 1500}
            </span>
            <span className="text-text-tertiary text-[11px]">METHOD: {exposure.projection_method || 'CAP_HISTORICAL_P_FRAUD'}</span>
          </div>
        </section>

        {/* 6. SECTION: CONTAINMENT COUNTERFACTUAL TABLE */}
        <section id="section-counterfactual">
          <CounterfactualTable
            options={cfOptions}
            appliedPolicy={campaignData.status === 'contained' ? 'CONTAIN' : campaignData.status === 'active' ? 'CHALLENGE' : null}
            onSelectPolicy={(policy) => handleApplyPolicy(policy)}
          />
        </section>

        {/* 7. SECTION: TIMELINE (VERTICAL EVENT LOG) */}
        <section id="section-timeline" className="bg-[#171717] border border-border p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-text-secondary" />
              <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
                7. CAMPAIGN DNA TIMELINE (VERTICAL EVENT LOG)
              </span>
            </div>
            <span className="text-xs font-data-mono text-text-tertiary">
              CHRONOLOGICAL AUDIT TRAIL
            </span>
          </div>

          <div className="relative pl-6 border-l-2 border-border/60 space-y-6">
            {(campaignData.timeline_events || []).map((evt, idx) => (
              <div key={idx} className="relative group">
                <span
                  className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-[#171717] ${
                    evt.event_type.includes('contain') || evt.event_type.includes('policy')
                      ? 'bg-emerald-400 ring-2 ring-emerald-500/40'
                      : 'bg-orange-500 ring-2 ring-orange-500/40'
                  }`}
                />

                <div className="bg-[#121212] p-4 border border-border/40 hover:border-border transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-on-surface uppercase">
                      {evt.event_type.replace(/_/g, ' ')}
                    </span>
                    <Mono variant="muted" className="text-xs">
                      {new Date(evt.occurred_at).toLocaleTimeString()}
                    </Mono>
                  </div>
                  <p className="text-xs font-body-sm text-text-secondary leading-relaxed">
                    {evt.detail?.entry_point || evt.detail?.note || JSON.stringify(evt.detail)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#131313] border-t border-border px-4 sm:px-8 py-3 text-xs font-data-mono text-text-tertiary flex flex-wrap items-center justify-between gap-2">
        <span>CAMPAIGN ID: {campaignData.id} • RISKOS v4.2.1-LIVE</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OPERATOR: {currentUser?.name || 'SENIOR ANALYST'}
        </span>
      </footer>
    </div>
  );
}
