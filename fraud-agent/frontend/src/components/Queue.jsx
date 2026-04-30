import React from 'react';

const RISK_CONFIG = {
  low: { color: 'var(--color-text-success)', bg: 'var(--color-background-success)', bar: 'var(--color-text-success)' },
  medium: { color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)', bar: 'var(--color-text-warning)' },
  high: { color: 'var(--color-text-danger)', bg: 'var(--color-background-danger)', bar: 'var(--color-text-danger)' },
};

const STATUS_LABELS = {
  awaiting_context: 'Needs reply',
  human_review: 'Under review',
  auto_approved: 'Approved',
  auto_blocked: 'Blocked',
};

function fmt(amount) {
  return `£${parseFloat(amount || 0).toFixed(2)}`;
}

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const barColor = pct >= 85 ? 'var(--color-text-success)' : pct >= 50 ? 'var(--color-text-warning)' : 'var(--color-text-danger)';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Model confidence
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{pct}%</span>
      </div>
      <div style={{
        height: 5,
        borderRadius: 'var(--radius-pill)',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: 'var(--radius-pill)',
          transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
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
    <div className="rev-card">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--color-border-primary)',
      }}>
        <span style={{
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Review queue
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: pendingItems.length > 0 ? 'var(--color-text-danger)' : 'var(--color-text-tertiary)',
          background: pendingItems.length > 0 ? 'var(--color-background-danger)' : 'rgba(255,255,255,0.06)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-pill)',
          padding: '4px 11px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {pendingItems.length}
        </span>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 0' }}>
        {pendingItems.length === 0 && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 14,
          }}>
            Nothing waiting on you
          </div>
        )}
        {pendingItems.map(item => {
          const isSelected = selected && selected.id === item.id;
          const risk = item.verdict?.risk || 'medium';
          const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.medium;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); } }}
              style={{
                margin: '4px 10px',
                padding: '14px 14px',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                background: isSelected ? 'var(--color-accent-soft)' : 'transparent',
                boxShadow: isSelected ? '0 0 0 1px rgba(6,102,235,0.25)' : 'none',
                transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                <span style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  letterSpacing: '-0.02em',
                }}>
                  {item.merchant}
                </span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  flexShrink: 0,
                }}>
                  {fmt(item.amount)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: riskCfg.color,
                  background: riskCfg.bg,
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '3px 9px',
                  textTransform: 'capitalize',
                }}>
                  {risk} risk
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                }}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>

              <ConfidenceBar value={item.confidence} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
