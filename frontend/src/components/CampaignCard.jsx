import React from 'react';
import StatusPill from './StatusPill';
import Mono from './Mono';
import SignalStrip from './SignalStrip';
import { ArrowRight, Shield, ChevronRight } from 'lucide-react';

export default function CampaignCard({ campaign, onSelect, onClick, density }) {
  if (!campaign) return null;

  const isForming = campaign.status === 'forming' || campaign.status === 'active';
  const isWatchlist = campaign.status === 'watchlist';
  const isContained = campaign.status === 'contained' || campaign.status === 'resolved';

  const handleClick = (e) => {
    const handler = onSelect || onClick;
    if (handler) handler(campaign.id);
  };

  // 1. Density-Ranked: Forming / Active Threat Card (Highest Visual Weight, Big Padding, Large Score)
  if (isForming) {
    return (
      <div
        onClick={handleClick}
        className="w-full bg-[#181818] border-2 border-orange-500/60 hover:border-orange-400 transition-all duration-200 p-7 md:p-8 mb-5 relative cursor-pointer group shadow-[0_0_30px_rgba(249,115,22,0.12)]"
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <StatusPill status="forming" size="lg" />
            <Mono variant="muted" className="text-xs">
              ID: {campaign.id}
            </Mono>
            <span className="text-text-tertiary text-xs">•</span>
            <span className="font-data-mono text-sm font-semibold text-text-secondary uppercase">
              {campaign.merchant}
            </span>
          </div>

          {/* Large Prominent Score Callout */}
          <div className="flex items-center gap-6 bg-[#121212] px-4 py-2 border border-orange-500/30">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-data-mono text-text-tertiary uppercase">
                Anomaly Score:
              </span>
              <Mono className="text-3xl md:text-4xl font-bold text-forming">
                {campaign.score.toFixed(2)}
              </Mono>
            </div>
            <div className="border-l border-border/40 pl-4 flex items-baseline gap-1.5">
              <span className="text-xs font-data-mono text-text-tertiary uppercase">
                Confidence:
              </span>
              <Mono className="text-sm font-semibold text-text-secondary">
                {Math.round(campaign.confidence * 100)}%
              </Mono>
            </div>
          </div>
        </div>

        {/* Campaign Title & Prominent Entry Point Banner */}
        <div className="mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors flex items-center gap-2.5">
            <span>{campaign.name}</span>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </h3>
          <div className="bg-[#121212] p-4 border-l-4 border-orange-500 border-y border-r border-border/40">
            <span className="font-data-mono text-xs text-orange-400 font-bold uppercase block mb-1">
              Detected Entry Point Vector:
            </span>
            <p className="text-sm md:text-base font-body-sm text-text-secondary leading-relaxed">
              {campaign.entryPoint}
            </p>
          </div>
        </div>

        {/* 7-Signal Weighted Breakdown Strip */}
        <div className="mb-6 bg-[#121212] p-4 border border-border/50">
          <SignalStrip signals={campaign.signals} showLabels={true} height="h-4 md:h-5" />
        </div>

        {/* Key Metrics Grid & Policy Recommendation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50 text-xs font-data-mono">
          <div className="bg-[#121212] p-3.5 border border-border/40">
            <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
              Exposure At Risk (Range)
            </span>
            <Mono className="text-base md:text-lg font-bold text-on-surface">
              {campaign.exposureFormatted || '₹1.8M – ₹2.6M'}
            </Mono>
            <span className="text-[11px] text-text-tertiary block mt-1">
              Confidence: {Math.round((campaign.exposureConfidence || 0.9) * 100)}% • Basis: {campaign.entityCount} units
            </span>
          </div>

          <div className="bg-[#121212] p-3.5 border border-border/40">
            <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
              Active Entities in Cluster
            </span>
            <Mono className="text-base md:text-lg font-bold text-secondary">
              {campaign.entityCount} Linked Entities
            </Mono>
            <span className="text-[11px] text-text-tertiary block mt-1">
              {campaign.entities?.devices || 1} dev • {campaign.entities?.ips || 1} ip • {campaign.entities?.accounts || campaign.entityCount} accts
            </span>
          </div>

          <div className="bg-[#121212] p-3.5 border border-orange-500/40">
            <span className="text-text-tertiary block mb-1 uppercase text-[11px]">
              Recommended Policy Action
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-forming text-base">
              <Shield className="w-4 h-4 text-forming" />
              {campaign.recommendedPolicy}
            </span>
            <span className="text-[11px] text-text-tertiary block mt-1 truncate">
              {campaign.recommendedPolicyDescription || 'Emergency isolation'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Density-Ranked: Watchlist Card (Noticeably Smaller, Medium Density, Quieter Amber Border)
  if (isWatchlist) {
    return (
      <div
        onClick={handleClick}
        className="w-full bg-[#161616] border border-amber-500/25 hover:border-amber-500/50 transition-all duration-200 p-4 md:p-4.5 mb-3 cursor-pointer group"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <StatusPill status="watchlist" size="sm" showPulse={false} />
            <Mono variant="muted" className="text-xs">
              {campaign.id}
            </Mono>
            <span className="text-text-tertiary text-xs">•</span>
            <span className="font-data-mono text-xs text-text-secondary">
              {campaign.merchant}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-data-mono text-text-tertiary uppercase">Score:</span>
              <Mono className="text-lg font-bold text-watchlist">
                {campaign.score.toFixed(2)}
              </Mono>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-data-mono text-text-tertiary uppercase">Entities:</span>
              <Mono className="text-xs text-text-secondary">
                {campaign.entityCount}
              </Mono>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div>
            <h4 className="text-sm md:text-base font-bold text-on-surface group-hover:text-primary transition-colors">
              {campaign.name}
            </h4>
            <p className="text-xs font-body-sm text-text-tertiary mt-0.5 line-clamp-1">
              {campaign.entryPoint}
            </p>
          </div>

          <div className="text-right whitespace-nowrap">
            <span className="text-[10px] font-data-mono text-text-tertiary uppercase block">
              Exposure Potential
            </span>
            <Mono className="text-xs font-semibold text-on-surface">
              {campaign.exposureFormatted}
            </Mono>
          </div>
        </div>

        <SignalStrip signals={campaign.signals} showLabels={false} height="h-2" />
      </div>
    );
  }

  // 3. Density-Ranked: Contained / Resolved (Compact Single-Line Strip at Bottom)
  return (
    <div
      onClick={handleClick}
      className="w-full py-2.5 px-4 bg-[#111111] border border-border/40 hover:bg-[#151515] hover:border-emerald-500/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <StatusPill status="contained" size="sm" showPulse={false} />
        <Mono variant="muted" className="text-xs">
          {campaign.id}
        </Mono>
        <span className="text-xs sm:text-sm font-semibold text-text-secondary group-hover:text-primary transition-colors truncate">
          {campaign.name}
        </span>
        <span className="text-xs font-data-mono text-text-tertiary hidden md:inline">
          [{campaign.merchant}]
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs font-data-mono whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-text-tertiary">TTC:</span>
          <Mono variant="calm" className="font-bold">
            {campaign.timeToContainment || '140s'}
          </Mono>
        </div>
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <span className="text-text-tertiary">Prevented:</span>
          <Mono variant="calm" className="font-bold">
            {campaign.exposurePrevented || '₹3.2M'}
          </Mono>
        </div>
        <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
