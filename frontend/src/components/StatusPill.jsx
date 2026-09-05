import React from 'react';

export default function StatusPill({
  status = 'calm',
  label,
  showPulse = true,
  className = '',
  size = 'md',
}) {
  const normStatus = (status || 'calm').toLowerCase();

  let bgBorderText = 'bg-teal-500/10 text-teal-400 border-teal-500/30';
  let dotColor = 'bg-teal-400';
  let isPulsing = false;
  let displayLabel = label || normStatus.toUpperCase();

  if (normStatus === 'forming' || normStatus === 'active') {
    bgBorderText = 'bg-orange-500/10 text-orange-400 border-orange-500/40';
    dotColor = 'bg-orange-500';
    isPulsing = true;
    if (!label) displayLabel = normStatus === 'forming' ? 'FORMING THREAT' : 'ACTIVE THREAT';
  } else if (normStatus === 'watchlist') {
    bgBorderText = 'bg-amber-500/10 text-amber-400 border-amber-500/40';
    dotColor = 'bg-amber-400';
    isPulsing = false;
    if (!label) displayLabel = 'WATCHLIST';
  } else if (normStatus === 'contained' || normStatus === 'resolved') {
    bgBorderText = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
    dotColor = 'bg-emerald-400';
    isPulsing = false;
    if (!label) displayLabel = normStatus === 'contained' ? 'CONTAINED' : 'RESOLVED';
  } else if (normStatus === 'suppressed') {
    bgBorderText = 'bg-teal-500/10 text-teal-400 border-teal-500/40';
    dotColor = 'bg-teal-400';
    isPulsing = false;
    if (!label) displayLabel = 'SUPPRESSED (LEGITIMATE)';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs'
      : 'px-2.5 py-1 text-[11px]';

  return (
    <div
      className={`inline-flex items-center gap-1.5 border font-data-mono font-medium tracking-wider uppercase select-none ${sizeClasses} ${bgBorderText} ${className}`}
    >
      {showPulse && (
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${dotColor} ${
            isPulsing ? 'animate-pulse' : ''
          }`}
        />
      )}
      <span>{displayLabel}</span>
    </div>
  );
}
