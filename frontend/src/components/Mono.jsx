import React from 'react';

export default function Mono({
  children,
  className = '',
  highlight = false,
  variant = 'default',
  ...props
}) {
  let colorStyle = 'text-on-surface';

  if (variant === 'primary') colorStyle = 'text-primary';
  else if (variant === 'secondary') colorStyle = 'text-secondary';
  else if (variant === 'calm') colorStyle = 'text-calm';
  else if (variant === 'forming') colorStyle = 'text-forming';
  else if (variant === 'watchlist') colorStyle = 'text-watchlist';
  else if (variant === 'muted') colorStyle = 'text-text-tertiary';
  else if (variant === 'dim') colorStyle = 'text-text-secondary';

  return (
    <span
      className={`font-data-mono tabular-nums tracking-tight ${colorStyle} ${
        highlight ? 'bg-surface-container-low px-1.5 py-0.5 rounded-none border border-border/40' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
