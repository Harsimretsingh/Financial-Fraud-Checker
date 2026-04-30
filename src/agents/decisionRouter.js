import { DECISION_TRACKS, AGENT_NAMES, RISK_THRESHOLDS } from '../constants.js';

export function routeDecision({ verdict, riskScore }, logger) {
  if (riskScore >= RISK_THRESHOLDS.autoClear) {
    logger(`${AGENT_NAMES.ROUTER} approved the transaction.`, 'Auto-decided as Approved.');
    return { label: 'Approved', badge: 'label-approve', decisionTrack: DECISION_TRACKS.AUTO_CLEARED };
  }

  if (riskScore < RISK_THRESHOLDS.manualReview) {
    logger(`${AGENT_NAMES.ROUTER} blocked the transaction.`, 'Auto-decided as Blocked.');
    return { label: 'Blocked', badge: 'label-block', decisionTrack: DECISION_TRACKS.ESCALATED };
  }

  logger(`${AGENT_NAMES.ROUTER} routed transaction to review.`, 'Decision: Requires manual review.');
  return { label: 'Review', badge: 'label-review', decisionTrack: DECISION_TRACKS.REVIEW_TRACK };
}
