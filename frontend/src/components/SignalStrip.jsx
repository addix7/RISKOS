import React, { useState } from 'react';
import Mono from './Mono';

export default function SignalStrip({
  signals = [],
  showLabels = true,
  height = 'h-3',
  className = '',
}) {
  const [hoveredSignal, setHoveredSignal] = useState(null);

  // Default 6 signals weighted breakdown if none provided
  const defaultSignals = [
    { name: 'Volume Anomaly', weight: 0.25, intensity: 0.9, value: '12.4x' },
    { name: 'Edge Creation', weight: 0.20, intensity: 0.85, value: '32 edges/min' },
    { name: 'Device Concentration', weight: 0.20, intensity: 0.95, value: 'Low Entropy' },
    { name: 'IP/ASN Concentration', weight: 0.15, intensity: 0.80, value: 'VPN/Tor' },
    { name: 'Behavioral Similarity', weight: 0.10, intensity: 0.75, value: '94% match' },
    { name: 'Velocity Anomaly', weight: 0.10, intensity: 0.88, value: '7.2 ops/s' },
  ];

  const activeSignals = signals.length > 0 ? signals : defaultSignals;

  const getIntensityColor = (intensity) => {
    if (intensity >= 0.85) return 'bg-orange-500 hover:bg-orange-400';
    if (intensity >= 0.70) return 'bg-orange-600 hover:bg-orange-500';
    if (intensity >= 0.50) return 'bg-amber-500 hover:bg-amber-400';
    if (intensity >= 0.30) return 'bg-amber-600/80 hover:bg-amber-500';
    return 'bg-neutral-700 hover:bg-neutral-600';
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {/* Segmented Signal Bar */}
      <div className={`w-full ${height} bg-[#111111] border border-border flex overflow-hidden p-[1px] gap-[1px]`}>
        {activeSignals.map((sig, idx) => {
          const widthPercent = `${sig.weight * 100}%`;
          const isHovered = hoveredSignal === idx;
          return (
            <div
              key={idx}
              className={`h-full transition-all cursor-pointer relative ${getIntensityColor(
                sig.intensity
              )} ${isHovered ? 'brightness-125 scale-y-110 z-10' : 'opacity-90'}`}
              style={{ width: widthPercent }}
              onMouseEnter={() => setHoveredSignal(idx)}
              onMouseLeave={() => setHoveredSignal(null)}
              title={`${sig.name} (${Math.round(sig.weight * 100)}% weight): ${Math.round(
                sig.intensity * 100
              )}% intensity`}
            />
          );
        })}
      </div>

      {/* Dynamic Hover/Static Details */}
      {showLabels && (
        <div className="flex items-center justify-between text-[11px] font-data-mono text-text-tertiary">
          {hoveredSignal !== null ? (
            <div className="flex items-center gap-2 text-on-surface animate-fade-in-up">
              <span className="font-semibold text-primary">
                {activeSignals[hoveredSignal].name}
              </span>
              <span>•</span>
              <span>
                Weight: <Mono variant="secondary">{Math.round(activeSignals[hoveredSignal].weight * 100)}%</Mono>
              </span>
              <span>•</span>
              <span>
                Intensity: <Mono variant="forming">{Math.round(activeSignals[hoveredSignal].intensity * 100)}%</Mono>
              </span>
              {activeSignals[hoveredSignal].value && (
                <>
                  <span>•</span>
                  <span className="text-text-secondary">[{activeSignals[hoveredSignal].value}]</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-text-tertiary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 inline-block" />
                7-SIGNAL WEIGHTED BREAKDOWN
              </span>
              <span className="text-text-tertiary tabular-nums">
                DOMINANT: <Mono variant="forming" className="font-semibold">{activeSignals[0]?.name || 'Volume'}</Mono>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
