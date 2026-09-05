import React from 'react';
import Mono from './Mono';
import { Scale, Check, ShieldCheck, Lock, KeyRound, Eye } from 'lucide-react';

export default function CounterfactualTable({ options = [], onSelectPolicy, appliedPolicy, className = '' }) {
  const defaultOptions = [
    {
      policy: 'ALLOW',
      name: 'Allow (No Intervention)',
      fraudLoss: '₹2,450,000',
      frictionCost: '₹0',
      netExpectedValue: '-₹2,450,000',
      isRecommended: false,
      summary: 'Allows unhindered execution of the entire active syndicate cluster.',
    },
    {
      policy: 'CHALLENGE',
      name: 'Challenge (Step-Up 2FA)',
      fraudLoss: '₹750,000',
      frictionCost: '₹45,000',
      netExpectedValue: '-₹795,000',
      isRecommended: false,
      summary: 'Forces biometric step-up authentication across all cluster sessions.',
    },
    {
      policy: 'CONTAIN',
      name: 'Contain (Cluster Isolation)',
      fraudLoss: '₹52,000',
      frictionCost: '₹12,000',
      netExpectedValue: '-₹64,000',
      isRecommended: true,
      summary: 'Freezes shared hardware & proxy hashes. Maximum expected value preservation.',
    },
  ];

  const policyList = options.length > 0 ? options : defaultOptions;

  const renderPolicyIcon = (policy, isApplied) => {
    if (isApplied) return <ShieldCheck className="w-4 h-4" />;
    if (policy === 'CONTAIN') return <Lock className="w-4 h-4" />;
    if (policy === 'CHALLENGE') return <KeyRound className="w-4 h-4" />;
    return <Eye className="w-4 h-4" />;
  };

  return (
    <div className={`w-full bg-[#131313] border border-border p-5 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
            6. CONTAINMENT COUNTERFACTUAL SIMULATION (POLICY SELECTION)
          </span>
        </div>

        <span className="text-xs font-data-mono text-text-tertiary">
          EQUATION: Net Value = -(Fraud Loss + Friction Cost)
        </span>
      </div>

      {/* Counterfactual Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policyList.map((opt, idx) => {
          const isRec = opt.isRecommended;
          const isApplied = appliedPolicy === opt.policy;

          return (
            <div
              key={idx}
              className={`p-5 border transition-all flex flex-col justify-between ${
                isApplied
                  ? 'bg-[#1a1a1a] border-2 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.2)] relative'
                  : isRec
                  ? 'bg-[#181818] border-2 border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.15)] relative'
                  : 'bg-[#121212] border-border/40 hover:border-border'
              }`}
            >
              {isApplied ? (
                <div className="absolute -top-3 right-4 px-2 py-0.5 bg-emerald-500 text-[#000000] font-data-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  ACTIVE POLICY
                </div>
              ) : isRec ? (
                <div className="absolute -top-3 right-4 px-2 py-0.5 bg-orange-500 text-[#000000] font-data-mono text-[10px] font-bold uppercase tracking-wider">
                  RECOMMENDED POLICY
                </div>
              ) : null}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`font-data-mono text-xs font-bold uppercase ${
                      isApplied ? 'text-emerald-400' : isRec ? 'text-forming' : 'text-text-secondary'
                    }`}
                  >
                    {opt.policy}
                  </span>
                  <span className="font-data-mono text-[11px] text-text-tertiary">
                    Option 0{idx + 1}
                  </span>
                </div>

                <h4 className="text-base font-bold text-on-surface mb-2">
                  {opt.name}
                </h4>

                <p className="text-xs font-body-sm text-text-secondary mb-4 leading-relaxed bg-[#0c0c0c] p-2.5 border border-border/30">
                  {opt.summary}
                </p>

                {/* Financial Metrics */}
                <div className="space-y-2 border-t border-border/40 pt-3 text-xs font-data-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary">Estimated Fraud Loss:</span>
                    <Mono className={opt.fraudLoss !== '₹0' && !isRec ? 'text-red-400 font-bold' : 'text-on-surface'}>
                      {opt.fraudLoss}
                    </Mono>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary">Friction / Disruption Cost:</span>
                    <Mono variant="muted">{opt.frictionCost}</Mono>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/30">
                    <span className="font-bold text-text-secondary">Net Expected Value:</span>
                    <Mono className={`font-bold ${isApplied ? 'text-emerald-400 text-sm' : isRec ? 'text-forming text-sm' : 'text-text-secondary'}`}>
                      {opt.netExpectedValue}
                    </Mono>
                  </div>
                </div>
              </div>

              {/* Single Unambiguous Action Button */}
              {onSelectPolicy && (
                <button
                  disabled={isApplied}
                  onClick={() => onSelectPolicy(opt.policy)}
                  className={`mt-5 w-full py-2.5 px-3 font-data-mono text-xs font-bold uppercase border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isApplied
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 cursor-default opacity-90'
                      : isRec
                      ? 'bg-orange-500 hover:bg-orange-400 text-[#000000] border-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.3)]'
                      : 'bg-[#161616] hover:bg-[#202020] text-text-secondary hover:text-on-surface border-border/60 hover:border-border'
                  }`}
                >
                  {renderPolicyIcon(opt.policy, isApplied)}
                  <span>
                    {isApplied
                      ? `Policy ${opt.policy} Active`
                      : `Execute ${opt.policy} Policy`}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
