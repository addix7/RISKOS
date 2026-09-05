import React, { useState } from 'react';
import Mono from './Mono';
import {
  Smartphone,
  Wifi,
  CreditCard,
  Network,
  Shield,
  ExternalLink,
  Hand,
  X,
} from 'lucide-react';

export default function EntityGraph({ graph, merchantName, onSelectTransaction, className = '' }) {
  const [activeNode, setActiveNode] = useState(null);
  const [inspectedEntity, setInspectedEntity] = useState(null);

  const hubs = graph?.hubs || [
    { id: 'dev-1', type: 'device', label: 'Emulator Farm (Nexus 998a)', hash: 'fa428...998a', sub: '1 Hardware ID' },
    { id: 'ip-1', type: 'ip', label: 'VPN Egress (185.220.101.5)', hash: 'vpn_nord...ro', sub: 'M247 Ltd' },
    { id: 'inst-1', type: 'instrument', label: 'Compromised Axis Card', hash: 'axis_4524...8888', sub: 'BIN 452410' },
  ];

  const nodes = graph?.nodes || Array.from({ length: 8 }, (_, i) => ({
    id: `mule-${i + 1}`,
    label: `Mule Account ${i + 1}`,
    sub: `user_${i + 1}@ghost.cc`,
    isFlagged: true,
  }));

  const handleNodeClick = (node) => {
    setInspectedEntity(node);
  };

  const renderHubIcon = (type, className = 'w-4 h-4') => {
    switch (type) {
      case 'device':
        return <Smartphone className={className} />;
      case 'ip':
        return <Wifi className={className} />;
      case 'instrument':
        return <CreditCard className={className} />;
      default:
        return <Network className={className} />;
    }
  };

  const getHubColor = (type) => {
    switch (type) {
      case 'device':
        return 'border-orange-500 text-orange-400 bg-orange-500/10';
      case 'ip':
        return 'border-amber-500 text-amber-400 bg-amber-500/10';
      case 'instrument':
        return 'border-secondary text-secondary bg-secondary/10';
      default:
        return 'border-primary text-primary bg-primary/10';
    }
  };

  return (
    <div className={`w-full bg-[#131313] border border-border p-5 flex flex-col ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-secondary" />
          <span className="font-micro-caps text-xs text-on-surface font-bold uppercase tracking-wider">
            COORDINATED ENTITY CLUSTER GRAPH (HUB-AND-SPOKE)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-data-mono text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Hub Nodes ({hubs.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Linked Accounts ({nodes.length})
          </span>
        </div>
      </div>

      {/* Interactive Visual Canvas Container */}
      <div className="relative w-full min-h-[320px] bg-[#0c0c0c] border border-border/40 p-6 flex flex-col justify-between overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Central Hubs Row */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {hubs.map((hub) => (
            <div
              key={hub.id}
              onMouseEnter={() => setActiveNode(hub)}
              onMouseLeave={() => setActiveNode(null)}
              className={`p-3 border transition-all cursor-pointer ${getHubColor(
                hub.type
              )} ${activeNode?.id === hub.id ? 'ring-2 ring-primary scale-[1.02]' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                {renderHubIcon(hub.type, 'w-4 h-4')}
                <span className="font-data-mono text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-[#0e0e0e] border border-border/40">
                  {hub.type} HUB
                </span>
              </div>
              <div className="font-bold text-xs text-on-surface truncate">
                {hub.label}
              </div>
              <div className="font-data-mono text-[10px] text-text-tertiary truncate">
                {hub.hash} • {hub.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Connecting Lines Representation */}
        <div className="relative z-0 my-2 flex items-center justify-center">
          <div className="w-full h-px bg-gradient-to-r from-orange-500/30 via-secondary/40 to-amber-500/30 relative">
            <span className="absolute left-1/2 -top-2.5 transform -translate-x-1/2 px-2 py-0.5 bg-[#0c0c0c] border border-border/40 text-[10px] font-data-mono text-text-tertiary">
              RELATIONSHIP EDGES ({nodes.length} LINKED SESSIONS)
            </span>
          </div>
        </div>

        {/* Linked Customer Account Nodes Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setActiveNode(node)}
              onMouseLeave={() => setActiveNode(null)}
              title="Click to inspect point-in-time transaction details"
              className={`p-2.5 bg-[#141414] border transition-all cursor-pointer group ${
                node.isFlagged
                  ? 'border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-on-surface'
                  : 'border-border/40 hover:border-secondary'
              } ${activeNode?.id === node.id ? 'ring-1 ring-primary scale-105' : ''}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-forming animate-pulse" />
                  <span className="font-bold text-[11px] truncate group-hover:text-primary transition-colors">
                    {node.label}
                  </span>
                </div>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
              </div>
              <div className="font-data-mono text-[10px] text-text-tertiary truncate">
                {node.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Active Node Tooltip / Instruction Banner */}
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between text-xs font-data-mono text-text-secondary">
          {activeNode ? (
            <div>
              <span className="text-primary font-bold">{activeNode.label}</span>
              <span className="text-text-tertiary"> — {activeNode.sub || activeNode.hash}</span>
            </div>
          ) : (
            <span className="text-text-tertiary flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5" />
              Click any node to inspect account identity and associated cluster hubs
            </span>
          )}
          <span className="text-secondary font-bold text-[11px] uppercase">
            CLICK NODE TO INSPECT ACCOUNT
          </span>
        </div>
      </div>

      {/* In-Place Node Entity Inspector Modal */}
      {inspectedEntity && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setInspectedEntity(null)}
        >
          <div
            className="bg-[#141414] border border-border/80 max-w-lg w-full p-6 space-y-4 shadow-2xl relative font-data-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-forming" />
                <span className="font-micro-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                  CLUSTER ENTITY INSPECTOR // {inspectedEntity.label}
                </span>
              </div>
              <button
                onClick={() => setInspectedEntity(null)}
                className="text-text-tertiary hover:text-on-surface p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#101010] p-3.5 border border-border/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Entity Role:</span>
                  <span className="text-on-surface font-bold">{inspectedEntity.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Entity UUID:</span>
                  <Mono className="text-secondary font-bold truncate max-w-[240px]">
                    {inspectedEntity.id}
                  </Mono>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Account Hash / Sub:</span>
                  <Mono className="text-text-secondary">{inspectedEntity.sub || 'user_hash_99a'}</Mono>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Associated Target:</span>
                  <span className="text-text-secondary font-bold uppercase">{merchantName || 'Target Merchant'}</span>
                </div>
              </div>

              <div className="bg-[#101010] p-3.5 border border-border/40">
                <span className="text-[10px] text-text-tertiary uppercase block mb-2 font-bold">
                  Connected Cluster Infrastructure Hubs ({hubs.length})
                </span>
                <div className="space-y-1.5">
                  {hubs.map((hub) => (
                    <div key={hub.id} className="flex items-center justify-between text-[11px] p-1.5 bg-[#171717] border border-border/30">
                      <span className="text-text-secondary flex items-center gap-1.5">
                        {renderHubIcon(hub.type, 'w-3.5 h-3.5 text-primary')}
                        {hub.label}
                      </span>
                      <Mono className="text-text-tertiary text-[10px]">{hub.hash}</Mono>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 p-3 text-orange-400 leading-relaxed">
                <span className="font-bold block uppercase mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Security State: Flagged Syndicate Participant
                </span>
                <p className="text-[11px] text-text-secondary">
                  Correlated with shared proxy egress and emulator hardware fingerprint. Subject to autonomous campaign containment policy.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex justify-end">
              <button
                onClick={() => setInspectedEntity(null)}
                className="px-4 py-1.5 bg-[#1e1e1e] hover:bg-[#282828] text-on-surface uppercase text-xs font-bold border border-border cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
