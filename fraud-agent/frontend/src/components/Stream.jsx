import React, { useRef, useEffect } from 'react';

const STATUS_CONFIG = {
  cleared: { color: '#1a7f4b', bg: '#f0faf4', dot: '#22c55e', label: 'Cleared' },
  awaiting_context: { color: '#92600a', bg: '#fffbeb', dot: '#f59e0b', label: 'Awaiting Context' },
  auto_approved: { color: '#1a7f4b', bg: '#f0faf4', dot: '#22c55e', label: 'Auto Approved' },
  auto_blocked: { color: '#c0392b', bg: '#fff5f5', dot: '#ef4444', label: 'Auto Blocked' },
  human_review: { color: '#92600a', bg: '#fffbeb', dot: '#f59e0b', label: 'Human Review' },
  processing: { color: '#4a5568', bg: '#f7f8fa', dot: '#8a94a6', label: 'Processing' },
  error: { color: '#c0392b', bg: '#fff5f5', dot: '#ef4444', label: 'Error' },
};

function fmt(amount) {
  return `£${parseFloat(amount || 0).toFixed(2)}`;
}

export default function Stream({ events, liveActive }) {
  const listRef = useRef(null);

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
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Live Stream</span>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 500,
          color: liveActive ? '#22c55e' : 'var(--color-text-tertiary)',
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: liveActive ? '#22c55e' : '#cbd5e1',
            display: 'inline-block',
            boxShadow: liveActive ? '0 0 0 2px #dcfce7' : 'none',
            animation: liveActive ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
          }} />
          {liveActive ? 'Feed active' : 'Idle'}
        </span>
      </div>

      <div
        ref={listRef}
        style={{
          maxHeight: 340,
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {events.length === 0 && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            {liveActive
              ? 'Synthetic transactions will appear here as they are scored…'
              : 'Use Stripe webhook events, start the live portal feed, or upload a CSV batch.'}
          </div>
        )}
        {events.map((event, i) => {
          const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.processing;
          return (
            <div
              key={`${event.txnId || event.id}-${i}`}
              className="animate-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                borderBottom: i < events.length - 1 ? '0.5px solid var(--color-border-primary)' : 'none',
                background: i === 0 ? cfg.bg : 'transparent',
                transition: 'background 0.3s',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: cfg.dot,
                flexShrink: 0,
              }} />
              <span style={{
                flex: 1,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {event.merchant || '—'}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                flexShrink: 0,
              }}>
                {fmt(event.amount)}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: cfg.color,
                background: cfg.bg,
                border: `0.5px solid ${cfg.color}33`,
                borderRadius: 'var(--border-radius-sm)',
                padding: '2px 7px',
                flexShrink: 0,
              }}>
                {cfg.label}
              </span>
              {event.latency_ms && (
                <span style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}>
                  {event.latency_ms}ms
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
