import React from 'react';

/**
 * Minimal “agent mind” strip — last pipeline stages, futuristic and calm.
 */
export default function AgentConsole({ stages }) {
  const list = (stages || []).slice(0, 6);

  return (
    <div className="ux-agent-console">
      <div className="ux-agent-console-label">
        <span className="ux-agent-orb" aria-hidden />
        Agent
      </div>
      <div className="ux-agent-console-track">
        {list.length === 0 && (
          <span className="ux-agent-console-idle">Awaiting transactions — run samples or import CSV</span>
        )}
        {list.map((s, i) => (
          <span key={`${s.txnId}-${s.stage}-${s.phase}-${i}`} className="ux-agent-chip">
            {s.stage === 'escalated_agent' && `Escalated · ${s.phase || '…'}`}
            {s.stage === 'confidence_gate' && `Gate · ${s.branch || '…'}`}
            {s.stage === 'first_line_defence' && `1st line · ${s.phase || '…'}`}
            {s.stage && !['escalated_agent', 'confidence_gate', 'first_line_defence'].includes(s.stage) && String(s.stage).replace(/_/g, ' ')}
            {s.merchant && <span className="ux-agent-chip-dim"> · {s.merchant}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
