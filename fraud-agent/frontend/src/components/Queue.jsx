import React from 'react';

const RISK_CONFIG = {
  low: { color: '#1a7f4b', bg: '#f0faf4', barColor: '#22c55e' },
  medium: { color: '#92600a', bg: '#fffbeb', barColor: '#f59e0b' },
  high: { color: '#c0392b', bg: '#fff5f5', barColor: '#ef4444' },
};

const STATUS_LABELS = {
  awaiting_context: 'Awaiting Context',
  human_review: 'Human Review',
  auto_approved: 'Auto Approved',
  auto_blocked: 'Auto Blocked',
};

function fmt(amount) {
  return `£${parseFloat(amount || 0).toFixed(2)}`;
}

function ConfidenceBar({ value, risk }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const barColor = pct >= 85 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Confidence</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{pct}%</span>
      </div>
      <div style={{
        height: 4,
        borderRadius: 2,
        background: 'var(--color-background-tertiary)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

export default function Queue({ items, onSelect, selected }) {
  const pendingItems = items.filter(i =>
    i.status === 'awaiting_context' || i.status === 'human_review'
  );

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-primary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--color-border-primary)',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Review Queue</span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: pendingItems.length > 0 ? '#c0392b' : 'var(--color-text-tertiary)',
          background: pendingItems.length > 0 ? '#fff5f5' : 'var(--color-background-tertiary)',
          border: `0.5px solid ${pendingItems.length > 0 ? '#fca5a533' : 'var(--color-border-primary)'}`,
          borderRadius: 'var(--border-radius-sm)',
          padding: '2px 8px',
        }}>
          {pendingItems.length} pending
        </span>
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', padding: '4px 0' }}>
        {pendingItems.length === 0 && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 13,
          }}>
            No items awaiting review
          </div>
        )}
        {pendingItems.map(item => {
          const isSelected = selected && selected.id === item.id;
          const risk = item.verdict?.risk || 'medium';
          const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.medium;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                padding: '10px 16px',
                borderBottom: '0.5px solid var(--color-border-primary)',
                cursor: 'pointer',
                borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent',
                background: isSelected ? '#eff6ff' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-background-secondary)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  marginRight: 8,
                }}>
                  {item.merchant}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  flexShrink: 0,
                }}>
                  {fmt(item.amount)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 11,
                  color: riskCfg.color,
                  background: riskCfg.bg,
                  border: `0.5px solid ${riskCfg.color}33`,
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '1px 6px',
                  fontWeight: 500,
                }}>
                  {risk} risk
                </span>
                <span style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                }}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>

              <ConfidenceBar value={item.confidence} risk={risk} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
