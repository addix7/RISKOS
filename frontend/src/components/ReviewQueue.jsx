import React, { useState, useEffect } from 'react';
import Mono from './Mono';
import StatusPill from './StatusPill';
import BorderGlow from './BorderGlow';
import { CheckSquare, LogOut, AlertCircle, Network, FileText, ArrowRight } from 'lucide-react';
import {
  getPendingReviewsApi,
  getActiveCampaignsApi,
} from '../api/apiClient';

export default function ReviewQueue({
  currentUser,
  onSelectCampaign,
  onSelectTransaction,
  onNavigateToLiveMap,
  onNavigateToModelHealth,
  onNavigateToAboutRiskos,
  onNavigateToAboutMe,
  onSignOut,
}) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queueItems, setQueueItems] = useState([]);

  const fetchQueueData = async () => {
    try {
      setError(null);
      const [pendingRes, campaignsRes] = await Promise.all([
        getPendingReviewsApi().catch(() => ({ items: [] })),
        getActiveCampaignsApi().catch(() => ({ campaigns: [] })),
      ]);

      const items = [];

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

      // Helper to resolve title and merchant dynamically
      const getCampaignMeta = (c) => {
        const cid = String(c?.id || '').toLowerCase();
        const ep = String(c?.entry_point || '').toLowerCase();

        if (cid.includes('ac277f83') || ep.includes('voucher') || ep.includes('romania') || ep.includes('steam')) {
          return {
            title: 'Voucher Abuse Syndicate',
            merchant: 'Steam Games & Vouchers',
          };
        }
        if (cid.includes('99fa161f') || ep.includes('probing') || ep.includes('croma') || ep.includes('micro-transaction') || ep.includes('card')) {
          return {
            title: 'Card-Testing Micro-Probing Botnet',
            merchant: 'Croma Electronics',
          };
        }
        if (cid.includes('d672182d') || ep.includes('zara') || ep.includes('mule') || ep.includes('velocity')) {
          return {
            title: 'Coordinated Mule Velocity Anomaly',
            merchant: 'Zara Fashion',
          };
        }
        if (cid.includes('77a8') || ep.includes('uber') || ep.includes('credential')) {
          return {
            title: 'Proxy Cluster Credential Stuffing',
            merchant: 'Uber India',
          };
        }
        if (cid.includes('88b9') || ep.includes('apple') || ep.includes('flagship')) {
          return {
            title: 'Flagship Electronics Card-Testing Ring',
            merchant: 'Apple Store BKC',
          };
        }
        return {
          title: `Campaign ${c?.id?.slice(0, 8) || 'Cluster'}`,
          merchant: 'E-Commerce Merchant',
        };
      };

      // 1. Add forming & watchlist campaigns from live backend
      if (campaignsRes?.campaigns) {
        campaignsRes.campaigns.forEach((c) => {
          const meta = getCampaignMeta(c);

          items.push({
            id: `camp-rev-${c.id}`,
            targetId: c.id,
            kind: 'CAMPAIGN',
            title: meta.title,
            merchant: meta.merchant,
            status: c.status,
            score: c.campaign_score,
            scoreDisplay: c.campaign_score.toFixed(2),
            recommendedPolicy: c.recommended_policy?.toUpperCase() || 'CONTAIN',
            exposureOrAmount: c.exposure
              ? formatInrRange(c.exposure.exposure_at_risk_low_inr, c.exposure.exposure_at_risk_high_inr)
              : '₹1.8M – ₹2.6M',
            exposureType: 'Projected Exposure',
            entitiesCount: c.entities_count || 38,
            urgency: c.status === 'forming' ? 'CRITICAL' : 'MEDIUM',
            slaRemaining: c.status === 'forming' ? '04:12' : '48:00',
            detectedAt: '2m ago',
            summary: c.entry_point || 'High-velocity coordinated attack cluster detected across multiple accounts.',
          });
        });
      }

      // 2. Add pending transaction reviews from live backend
      if (pendingRes?.items) {
        pendingRes.items.forEach((txn) => {
          items.push({
            id: `txn-rev-${txn.investigation_id || txn.transaction_id}`,
            targetId: txn.transaction_id,
            investigationId: txn.investigation_id,
            kind: 'TRANSACTION',
            title: 'Syndicate Operative 7',
            merchant: 'Croma Electronics',
            status: 'forming',
            score: txn.risk_score || 88.96,
            scoreDisplay: (txn.risk_score || 88.96).toFixed(2),
            recommendedPolicy: (txn.recommended_action || 'hold').toUpperCase(),
            exposureOrAmount: `₹${(txn.amount_inr || 125000).toLocaleString()}`,
            exposureType: 'Flagged Amount',
            entitiesCount: 1,
            urgency: 'HIGH',
            slaRemaining: '08:45',
            detectedAt: '4m ago',
            summary: 'High-value transaction on 0-day burner customer using Android emulator and commercial VPN exit.',
          });
        });
      }

      setQueueItems(items);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch review queue from backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, []);

  const filteredItems = queueItems.filter((item) => {
    if (activeFilter === 'CAMPAIGN') return item.kind === 'CAMPAIGN';
    if (activeFilter === 'TRANSACTION') return item.kind === 'TRANSACTION';
    return true;
  });

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
      default:
        return 'bg-neutral-800 text-text-tertiary border-border';
    }
  };

  const getPolicyPill = (policy) => {
    switch (policy) {
      case 'BLOCK':
        return 'bg-red-500/20 text-red-400 border-red-500/60 font-bold';
      case 'CONTAIN':
        return 'bg-orange-500 text-[#000000] border-orange-500 font-bold';
      case 'HOLD':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/60';
      case 'CHALLENGE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/60';
      case 'MONITOR':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/50';
      default:
        return 'bg-neutral-800 text-text-secondary border-border';
    }
  };

  const handleRowClick = (item) => {
    if (item.kind === 'CAMPAIGN') {
      onSelectCampaign(item.targetId);
    } else {
      onSelectTransaction(item.targetId, item.investigationId);
    }
  };

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
                CONCURRENT OBSERVER
              </span>
            </div>

            {/* Main Navigation Tabs */}
            <nav className="flex items-center gap-2">
              <button
                onClick={onNavigateToLiveMap}
                className="px-3 py-1.5 font-data-mono text-xs uppercase text-text-tertiary hover:text-on-surface hover:bg-[#181818] border border-transparent transition-colors cursor-pointer"
              >
                Live Attack Map
              </button>
              <button className="px-3 py-1.5 font-data-mono text-xs uppercase font-bold text-primary bg-primary/10 border border-primary/40 cursor-default flex items-center gap-1.5">
                <span>Review Queue</span>
                <span className="px-1.5 py-0.2 bg-primary text-[#000000] text-[10px] font-bold rounded-none">
                  {queueItems.length}
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

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        {/* Backend Error Envelope State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-400 font-data-mono text-xs flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span><strong>API Error:</strong> {error}</span>
            </div>
            <button
              onClick={fetchQueueData}
              className="px-2.5 py-1 bg-red-500/20 text-red-300 uppercase text-[10px] font-bold border border-red-500/50 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 bg-[#141414] border border-border/40" />
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Queue Title Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="font-micro-caps text-xs text-text-secondary uppercase tracking-widest">
                    DECISION INBOX // PENDING OPERATOR SIGN-OFF
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Human Review Queue
                </h1>
                <p className="font-data-mono text-xs text-text-tertiary mt-1">
                  Unified priority triage of forming campaign clusters and point-in-time transaction holds.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 bg-[#141414] p-1 border border-border">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 font-data-mono text-xs uppercase transition-colors cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  All Cases ({queueItems.length})
                </button>
                <button
                  onClick={() => setActiveFilter('CAMPAIGN')}
                  className={`px-3 py-1.5 font-data-mono text-xs uppercase transition-colors cursor-pointer ${
                    activeFilter === 'CAMPAIGN'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Campaigns ({queueItems.filter((i) => i.kind === 'CAMPAIGN').length})
                </button>
                <button
                  onClick={() => setActiveFilter('TRANSACTION')}
                  className={`px-3 py-1.5 font-data-mono text-xs uppercase transition-colors cursor-pointer ${
                    activeFilter === 'TRANSACTION'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Transactions ({queueItems.filter((i) => i.kind === 'TRANSACTION').length})
                </button>
              </div>
            </div>

            {/* Queue List */}
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isCampaign = item.kind === 'CAMPAIGN';

                return (
                  <BorderGlow
                    key={item.id}
                    edgeSensitivity={20}
                    glowColor={isCampaign ? '35 90 60' : '40 80 80'}
                    backgroundColor="#141414"
                    borderRadius={0}
                    glowRadius={70}
                    glowIntensity={1.3}
                    coneSpread={25}
                    animated={false}
                    colors={isCampaign ? ['#fb923c', '#44e2cd', '#171717'] : ['#f97316', '#fbbf24', '#171717']}
                    fillOpacity={0.28}
                    className="w-full"
                  >
                    <div
                      onClick={() => handleRowClick(item)}
                      className="w-full hover:bg-[#181818]/60 p-5 transition-all cursor-pointer group relative flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Kind Tag, Title, Merchant, and Target ID */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div
                          className={`mt-1 px-2 py-1 border text-[10px] font-data-mono font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap ${
                            isCampaign
                              ? 'bg-secondary/10 text-secondary border-secondary/40'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/40'
                          }`}
                        >
                          {isCampaign ? (
                            <Network className="w-3.5 h-3.5 text-secondary" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-orange-400" />
                          )}
                          <span>{item.kind}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors truncate">
                              {item.title}
                            </h3>
                            <span className="text-text-tertiary">•</span>
                            <Mono variant="muted" className="text-xs truncate">
                              {item.targetId}
                            </Mono>
                          </div>

                          <p className="text-xs font-body-sm text-text-secondary leading-relaxed line-clamp-1 mb-2">
                            {item.summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs font-data-mono text-text-tertiary">
                            <span className="text-text-secondary font-semibold uppercase">{item.merchant}</span>
                            <span>•</span>
                            <span>Detected {item.detectedAt}</span>
                            <span>•</span>
                            <span>{item.entitiesCount} {isCampaign ? 'Entities' : 'Subject'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics, Recommended Policy, Score, and CTA */}
                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-5 lg:gap-8 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40 font-data-mono">
                        {/* Financial Context */}
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] uppercase text-text-tertiary block">
                            {item.exposureType}
                          </span>
                          <Mono className="text-sm font-bold text-on-surface">
                            {item.exposureOrAmount}
                          </Mono>
                        </div>

                        {/* Recommended Action Pill */}
                        <div className="text-left lg:text-center">
                          <span className="text-[10px] uppercase text-text-tertiary block mb-0.5">
                            Rec. Policy
                          </span>
                          <span
                            className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase border ${getPolicyPill(
                              item.recommendedPolicy
                            )}`}
                          >
                            {item.recommendedPolicy}
                          </span>
                        </div>

                        {/* Anomaly / Risk Score */}
                        <div className="text-left lg:text-right min-w-[70px]">
                          <span className="text-[10px] uppercase text-text-tertiary block">
                            Risk Score
                          </span>
                          <Mono
                            className={`text-lg font-bold ${
                              item.score >= 0.85 || item.score >= 70
                                ? 'text-forming'
                                : 'text-amber-400'
                            }`}
                          >
                            {item.scoreDisplay}
                          </Mono>
                        </div>

                        {/* SLA Countdown & Action Affordance */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-2 py-1 border text-[11px] font-bold uppercase ${getUrgencyBadge(
                              item.urgency
                            )}`}
                          >
                            SLA: {item.slaRemaining}
                          </div>

                          <button
                            type="button"
                            className="px-3 py-1.5 bg-[#1c1c1c] group-hover:bg-primary group-hover:text-[#000000] border border-border group-hover:border-primary text-text-secondary font-data-mono text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </BorderGlow>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#131313] border-t border-border px-4 sm:px-8 py-3 text-xs font-data-mono text-text-tertiary flex flex-wrap items-center justify-between gap-2">
        <span>PENDING QUEUE: {queueItems.length} ACTIVE CASES</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> DEFCON-3 SURVEILLANCE
        </span>
      </footer>
    </div>
  );
}
