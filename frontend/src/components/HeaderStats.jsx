import React from 'react';
import Mono from './Mono';
import BorderGlow from './BorderGlow';
import { TrendingUp, ShieldCheck, Timer } from 'lucide-react';

export default function HeaderStats({ stats }) {
  const {
    activeThreatsCount = 2,
    exposureAtRisk = '₹3.7M – ₹5.2M',
    exposurePrevented = '₹8.9M',
    avgTimeToContainment = '141s',
  } = stats || {};

  return (
    <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 my-6">
      {/* 1. Active Threats */}
      <BorderGlow
        edgeSensitivity={20}
        glowColor="35 90 60"
        backgroundColor="#171717"
        borderRadius={0}
        glowRadius={70}
        glowIntensity={1.3}
        coneSpread={25}
        animated={false}
        colors={['#f97316', '#fb923c', '#171717']}
        fillOpacity={0.28}
        className="w-full h-full"
      >
        <div className="p-4 relative overflow-hidden flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-micro-caps text-[11px] text-text-tertiary uppercase tracking-wider">
              Active Threats Forming
            </span>
            <span className="w-2 h-2 rounded-full bg-forming animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <Mono className="text-2xl sm:text-3xl font-bold text-forming">
              {activeThreatsCount}
            </Mono>
            <span className="text-xs font-data-mono text-text-tertiary uppercase">
              Campaigns
            </span>
          </div>
          <div className="text-[11px] font-data-mono text-text-tertiary mt-2 flex items-center gap-1.5 border-t border-border/30 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-forming inline-block" />
            <span>Requires Immediate Review</span>
          </div>
        </div>
      </BorderGlow>

      {/* 2. Exposure at Risk */}
      <BorderGlow
        edgeSensitivity={20}
        glowColor="40 80 80"
        backgroundColor="#171717"
        borderRadius={0}
        glowRadius={70}
        glowIntensity={1.3}
        coneSpread={25}
        animated={false}
        colors={['#fbbf24', '#f97316', '#171717']}
        fillOpacity={0.28}
        className="w-full h-full"
      >
        <div className="p-4 relative overflow-hidden flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-micro-caps text-[11px] text-text-tertiary uppercase tracking-wider">
              Exposure At Risk (Forming)
            </span>
            <TrendingUp className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-baseline gap-1">
            <Mono className="text-xl sm:text-2xl font-bold text-on-surface">
              {exposureAtRisk}
            </Mono>
          </div>
          <div className="text-[11px] font-data-mono text-text-tertiary mt-2 flex items-center gap-1.5 border-t border-border/30 pt-2">
            <span className="text-text-secondary">Basis: 75 Active burner entities</span>
          </div>
        </div>
      </BorderGlow>

      {/* 3. Exposure Prevented */}
      <BorderGlow
        edgeSensitivity={20}
        glowColor="160 70 60"
        backgroundColor="#171717"
        borderRadius={0}
        glowRadius={70}
        glowIntensity={1.3}
        coneSpread={25}
        animated={false}
        colors={['#34d399', '#10b981', '#171717']}
        fillOpacity={0.28}
        className="w-full h-full"
      >
        <div className="p-4 relative overflow-hidden flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-micro-caps text-[11px] text-text-tertiary uppercase tracking-wider">
              Exposure Prevented (Contained)
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <Mono className="text-2xl sm:text-3xl font-bold text-emerald-400">
              {exposurePrevented}
            </Mono>
          </div>
          <div className="text-[11px] font-data-mono text-text-tertiary mt-2 flex items-center gap-1.5 border-t border-border/30 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>Across 2 contained syndicates</span>
          </div>
        </div>
      </BorderGlow>

      {/* 4. Avg Time-to-Containment */}
      <BorderGlow
        edgeSensitivity={20}
        glowColor="175 70 60"
        backgroundColor="#171717"
        borderRadius={0}
        glowRadius={70}
        glowIntensity={1.3}
        coneSpread={25}
        animated={false}
        colors={['#44e2cd', '#2dd4bf', '#171717']}
        fillOpacity={0.28}
        className="w-full h-full"
      >
        <div className="p-4 relative overflow-hidden flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-micro-caps text-[11px] text-text-tertiary uppercase tracking-wider">
              Avg Time To Containment (TTC)
            </span>
            <Timer className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <Mono className="text-2xl sm:text-3xl font-bold text-secondary">
              {avgTimeToContainment}
            </Mono>
            <span className="text-xs font-data-mono text-text-tertiary uppercase">
              Lead time
            </span>
          </div>
          <div className="text-[11px] font-data-mono text-text-tertiary mt-2 flex items-center gap-1.5 border-t border-border/30 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-calm inline-block" />
            <span>Detected prior to loss escalation</span>
          </div>
        </div>
      </BorderGlow>
    </div>
  );
}
