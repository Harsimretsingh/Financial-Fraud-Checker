import React, { useState } from 'react';

const ACTION_CONFIG = {
  auto_approve: { label: 'Auto Approved', color: '#1a7f4b', bg: '#f0faf4' },
  auto_block: { label: 'Auto Blocked', color: '#c0392b', bg: '#fff5f5' },
  human_review: { label: 'Human Review', color: '#92600a', bg: '#fffbeb' },
  auto_approved: { label: 'Auto Approved', color: '#1a7f4b', bg: '#f0faf4' },
  auto_blocked: { label: 'Auto Blocked', color: '#c0392b', bg: '#fff5f5' },
};

const RISK_COLORS = { low: '#1a7f4b', medium: '#92600a', high: '#c0392b' };

function fmt(amount) {
  return `£${parseFloat(amount || 0).toFixed(2)}`;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ActionButton({ label, onClick, variant = 'default' }) {
  const styles = {
    default: { bg: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', border: 'var(--color-border-primary)' },
    approve: { bg: '#f0faf4', color: '#1a7f4b', border: '#1a7f4b33' },
    block: { bg: '#fff5f5', color: '#c0392b', border: '#c0392b33' },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 'var(--border-radius-md)',
        border: `0.5px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default function Detail({ item }) {
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!reply.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('http://localhost:3001/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnId: item.id, reply: reply.trim() }),
      });
      setSubmitted(true);
      setReply('');
    } catch (err) {
      console.error('Failed to submit context:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Reset submitted state when item changes
  React.useEffect(() => {
    setSubmitted(false);
    setReply('');
    setSubmitting(false);
  }, [item?.id]);

  if (!item) {
    return (
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-primary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          No transaction selected
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Click an item in the Review Queue to inspect it
        </div>
      </div>
    );
  }

  const verdict = item.verdict;
  const enrichment = item.enrichment;
  const parsedContext = item.parsedContext;
  const actionCfg = ACTION_CONFIG[verdict?.recommended_action] || ACTION_CONFIG[item.status] || ACTION_CONFIG.human_review;

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-primary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '0.5px solid var(--color-border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
            {item.merchant}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {item.date} · {item.user_id} · {item.category}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          {fmt(item.amount)}
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* Awaiting Context */}
        {item.status === 'awaiting_context' && !submitted && (
          <Section title="Agent Question">
            <div style={{
              padding: '14px 16px',
              background: 'var(--color-background-secondary)',
              border: '0.5px solid var(--color-border-primary)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              fontStyle: 'italic',
              marginBottom: 14,
              lineHeight: 1.6,
            }}>
              "{item.question}"
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. groceries, contractor payment, team lunch..."
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '0.5px solid var(--color-border-secondary)',
                  fontSize: 13,
                  outline: 'none',
                  background: 'var(--color-background-primary)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !reply.trim()}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--border-radius-md)',
                  border: 'none',
                  background: submitting || !reply.trim() ? 'var(--color-background-tertiary)' : 'var(--color-accent)',
                  color: submitting || !reply.trim() ? 'var(--color-text-tertiary)' : '#ffffff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: submitting || !reply.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </Section>
        )}

        {item.status === 'awaiting_context' && submitted && (
          <div style={{
            padding: '16px',
            background: '#eff6ff',
            border: '0.5px solid #bfdbfe',
            borderRadius: 'var(--border-radius-md)',
            color: '#1e40af',
            fontSize: 13,
            marginBottom: 16,
          }}>
            Processing your reply — verdict will appear in the stream shortly…
          </div>
        )}

        {/* Verdict Panel */}
        {verdict && (
          <>
            <Section title="Verdict">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: actionCfg.color,
                  background: actionCfg.bg,
                  border: `0.5px solid ${actionCfg.color}33`,
                  borderRadius: 'var(--border-radius-md)',
                  padding: '4px 12px',
                }}>
                  {actionCfg.label}
                </span>
                <span style={{
                  fontSize: 12,
                  color: RISK_COLORS[verdict.risk] || 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}>
                  {verdict.risk} risk · {verdict.confidence}% confidence
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                {verdict.rationale}
              </p>
              {verdict.key_signal && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '3px 10px',
                }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Key signal:</span>
                  <span style={{ fontWeight: 500 }}>{verdict.key_signal}</span>
                </div>
              )}
            </Section>

            {/* Specter Data */}
            <Section title="Specter Enrichment">
              {enrichment?.found ? (
                <div style={{
                  border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 'var(--border-radius-md)',
                  overflow: 'hidden',
                }}>
                  {[
                    ['Company', enrichment.name],
                    ['Founded', enrichment.founded || '—'],
                    ['Employees', enrichment.employees || '—'],
                    ['Status', enrichment.status || '—'],
                    ['Total Funding', enrichment.funding ? `$${Number(enrichment.funding).toLocaleString()}` : '—'],
                    ['Monthly Web Visits', enrichment.web_visits ? Number(enrichment.web_visits).toLocaleString() : '—'],
                  ].map(([label, value], i, arr) => (
                    <div key={label} style={{
                      display: 'flex',
                      padding: '8px 12px',
                      borderBottom: i < arr.length - 1 ? '0.5px solid var(--color-border-primary)' : 'none',
                      gap: 12,
                    }}>
                      <span style={{ width: 130, fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '12px 14px',
                  background: '#fff5f5',
                  border: '0.5px solid #fca5a533',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 13,
                  color: '#c0392b',
                  fontWeight: 500,
                }}>
                  ⚠ No company found in Specter — strong fraud signal
                </div>
              )}
            </Section>

            {/* Context Summary */}
            {parsedContext && (
              <Section title="Context Summary">
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--color-background-secondary)',
                  border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                }}>
                  <p style={{ marginBottom: parsedContext.category_from_context ? 6 : 0 }}>
                    {parsedContext.summary}
                  </p>
                  {parsedContext.category_from_context && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      <span style={{
                        fontSize: 11,
                        background: 'var(--color-background-tertiary)',
                        border: '0.5px solid var(--color-border-primary)',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '1px 7px',
                        color: 'var(--color-text-secondary)',
                      }}>
                        {parsedContext.category_from_context}
                      </span>
                      {verdict.specter_matches_context !== null && (
                        <span style={{
                          fontSize: 11,
                          borderRadius: 'var(--border-radius-sm)',
                          padding: '1px 7px',
                          background: verdict.specter_matches_context ? '#f0faf4' : '#fff5f5',
                          color: verdict.specter_matches_context ? '#1a7f4b' : '#c0392b',
                          border: `0.5px solid ${verdict.specter_matches_context ? '#1a7f4b33' : '#c0392b33'}`,
                        }}>
                          {verdict.specter_matches_context ? 'Matches Specter' : 'Mismatch with Specter'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Action Buttons */}
            <Section title="Actions">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ActionButton label="Approve Transaction" variant="approve" onClick={() => console.log('approve', item.id)} />
                <ActionButton label="Block Transaction" variant="block" onClick={() => console.log('block', item.id)} />
                <ActionButton label="Escalate to Analyst" variant="default" onClick={() => console.log('escalate', item.id)} />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
