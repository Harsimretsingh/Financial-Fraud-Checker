import React, { useState } from 'react';

const ACTION_CONFIG = {
  auto_approve: { label: 'Approved', color: 'var(--color-text-success)', bg: 'var(--color-background-success)' },
  auto_block: { label: 'Blocked', color: 'var(--color-text-danger)', bg: 'var(--color-background-danger)' },
  human_review: { label: 'Review', color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' },
  auto_approved: { label: 'Approved', color: 'var(--color-text-success)', bg: 'var(--color-background-success)' },
  auto_blocked: { label: 'Blocked', color: 'var(--color-text-danger)', bg: 'var(--color-background-danger)' },
};

const RISK_COLORS = {
  low: 'var(--color-text-success)',
  medium: 'var(--color-text-warning)',
  high: 'var(--color-text-danger)',
};

function fmt(amount) {
  return `£${parseFloat(amount || 0).toFixed(2)}`;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ActionButton({ label, onClick, variant = 'default' }) {
  const styles = {
    default: { bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-primary)', border: 'var(--color-border-secondary)' },
    approve: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'rgba(50,210,150,0.35)' },
    block: { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)', border: 'rgba(255,92,122,0.35)' },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: 'var(--radius-pill)',
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.15s ease',
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

  React.useEffect(() => {
    setSubmitted(false);
    setReply('');
    setSubmitting(false);
  }, [item?.id]);

  if (!item) {
    return (
      <div className="rev-card" style={{ padding: '56px 28px', textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          margin: '0 auto 18px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(6,102,235,0.35), rgba(50,210,150,0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
        }}>
          ◎
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          Select a transaction
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', maxWidth: 280, margin: '0 auto' }}>
          Choose an item from the review queue to see details and respond
        </div>
      </div>
    );
  }

  const verdict = item.verdict;
  const enrichment = item.enrichment;
  const parsedContext = item.parsedContext;
  const actionCfg = ACTION_CONFIG[verdict?.recommended_action] || ACTION_CONFIG[item.status] || ACTION_CONFIG.human_review;

  const inputStyle = {
    flex: 1,
    padding: '14px 16px',
    borderRadius: 'var(--border-radius-md)',
    border: '1px solid var(--color-border-secondary)',
    fontSize: 15,
    outline: 'none',
    background: 'rgba(0,0,0,0.35)',
    color: 'var(--color-text-primary)',
    fontWeight: 500,
  };

  return (
    <div className="rev-card">
      <div style={{
        padding: '20px 22px',
        borderBottom: '1px solid var(--color-border-primary)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 800,
            fontSize: 20,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}>
            {item.merchant}
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            marginTop: 6,
            fontWeight: 500,
          }}>
            {item.date} · {item.user_id} · {item.category}
          </div>
        </div>
        <div style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.03em',
          flexShrink: 0,
        }}>
          {fmt(item.amount)}
        </div>
      </div>

      <div style={{ padding: '22px' }}>

        {verdict?.escalated_agent && (
          <Section title="Risk rescore">
            <div style={{
              padding: '16px 18px',
              background: 'rgba(255, 176, 32, 0.08)',
              border: '1px solid rgba(255, 176, 32, 0.22)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 14,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55,
            }}>
              <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8, fontSize: 15 }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{verdict.risk_score}</span>/100
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}> · </span>
                <span style={{ textTransform: 'capitalize' }}>{verdict.counterparty_kind}</span>
              </div>
              {Array.isArray(verdict.risk_factors) && verdict.risk_factors.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-secondary)' }}>
                  {verdict.risk_factors.map((f, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{f}</li>
                  ))}
                </ul>
              )}
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 10, fontWeight: 500 }}>
                Analyst review only when the score sits in the mid band between auto-approve and auto-block.
              </div>
            </div>
          </Section>
        )}

        {item.status === 'awaiting_context' && !submitted && (
          <Section title="We need a bit more detail">
            <div style={{
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 15,
              color: 'var(--color-text-primary)',
              lineHeight: 1.55,
              marginBottom: 14,
              fontWeight: 500,
            }}>
              {item.question}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What was this payment for?"
                disabled={submitting}
                style={{ ...inputStyle, minWidth: 200 }}
              />
              <button
                type="button"
                className="rev-btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !reply.trim()}
                style={{
                  opacity: submitting || !reply.trim() ? 0.45 : 1,
                  cursor: submitting || !reply.trim() ? 'not-allowed' : 'pointer',
                  minWidth: 120,
                }}
              >
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </Section>
        )}

        {item.status === 'awaiting_context' && submitted && (
          <div style={{
            padding: '16px 18px',
            background: 'var(--color-info-bg)',
            border: '1px solid rgba(6, 102, 235, 0.25)',
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--color-info-text)',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 18,
          }}>
            Got it — we are finishing the review…
          </div>
        )}

        {verdict && (
          <>
            <Section title="Outcome">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: actionCfg.color,
                  background: actionCfg.bg,
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '6px 14px',
                }}>
                  {actionCfg.label}
                </span>
                <span style={{
                  fontSize: 13,
                  color: RISK_COLORS[verdict.risk] || 'var(--color-text-secondary)',
                  fontWeight: 700,
                }}>
                  {verdict.risk} risk · {verdict.confidence}%
                </span>
              </div>
              <p style={{
                fontSize: 15,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.55,
                marginBottom: 10,
                fontWeight: 500,
              }}>
                {verdict.rationale}
              </p>
              {verdict.key_signal && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '6px 14px',
                  fontWeight: 600,
                }}>
                  <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signal</span>
                  {verdict.key_signal}
                </div>
              )}
            </Section>

            <Section title="Counterparty data">
              {enrichment?.found ? (
                <div style={{
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--border-radius-md)',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  {[
                    ['Company', enrichment.name],
                    ['Founded', enrichment.founded || '—'],
                    ['Employees', enrichment.employees || '—'],
                    ['Status', enrichment.status || '—'],
                    ['Total funding', enrichment.funding ? `$${Number(enrichment.funding).toLocaleString()}` : '—'],
                    ['Web visits / mo', enrichment.web_visits ? Number(enrichment.web_visits).toLocaleString() : '—'],
                  ].map(([label, value], i, arr) => (
                    <div key={label} style={{
                      display: 'flex',
                      padding: '11px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--color-border-primary)' : 'none',
                      gap: 14,
                    }}>
                      <span style={{ width: 124, fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                      <span style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--color-background-danger)',
                  border: '1px solid rgba(255, 92, 122, 0.25)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 14,
                  color: 'var(--color-text-danger)',
                  fontWeight: 700,
                }}>
                  No match in our data — higher risk for unknown merchants
                </div>
              )}
            </Section>

            {parsedContext && (
              <Section title="Your context">
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.55,
                  fontWeight: 500,
                }}>
                  <p style={{ marginBottom: parsedContext.category_from_context ? 8 : 0 }}>
                    {parsedContext.summary}
                  </p>
                  {parsedContext.category_from_context && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--color-border-primary)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '4px 11px',
                        color: 'var(--color-text-secondary)',
                      }}>
                        {parsedContext.category_from_context}
                      </span>
                      {verdict.specter_matches_context !== null && (
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 'var(--radius-pill)',
                          padding: '4px 11px',
                          background: verdict.specter_matches_context ? 'var(--color-background-success)' : 'var(--color-background-danger)',
                          color: verdict.specter_matches_context ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                          border: '1px solid var(--color-border-primary)',
                        }}>
                          {verdict.specter_matches_context ? 'Aligned with data' : 'Conflict with data'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            <Section title="Quick actions">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <ActionButton label="Approve" variant="approve" onClick={() => console.log('approve', item.id)} />
                <ActionButton label="Block" variant="block" onClick={() => console.log('block', item.id)} />
                <ActionButton label="Escalate" variant="default" onClick={() => console.log('escalate', item.id)} />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
