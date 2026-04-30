import { classifyTransaction } from '../agents/classifier.js';
import { enrichTransaction } from '../agents/specterEnricher.js';
import { routeDecision } from '../agents/decisionRouter.js';
import { RISK_THRESHOLDS, AGENT_NAMES } from '../constants.js';

export function screenTransaction(transaction, logger) {
  logger('Transaction intake received.', `Merchant: ${transaction.merchant}, Amount: ${transaction.currency} ${transaction.amount.toFixed(2)}`);

  const classification = classifyTransaction(transaction, logger);
  const enrichment = enrichTransaction(transaction, classification, logger);

  const scoreBase = Math.round((classification.confidence * 0.5) + (enrichment.enrichedScore * 0.5));
  const riskScore = Math.min(100, Math.max(0, scoreBase + (transaction.amount > 1500 ? 6 : 0) + (classification.confidence < 55 ? 8 : 0)));
  const verdict = riskScore >= RISK_THRESHOLDS.autoClear ? 'Auto-Cleared' : riskScore < RISK_THRESHOLDS.manualReview ? 'Auto-Blocked' : 'Manual Review';

  logger(`${AGENT_NAMES.SECOND_PASS} second-pass review complete.`, `Final score: ${riskScore}, Verdict: ${verdict}`);

  const decision = routeDecision({ verdict, riskScore }, logger);

  return {
    transaction,
    classification,
    enrichment,
    result: {
      verdict,
      riskScore,
      reason: buildReason(riskScore, classification, enrichment),
      decisionTrack: decision.decisionTrack,
      decisionLabel: decision.label,
      decisionBadge: decision.badge,
      enrichmentSummary: enrichment.details
    }
  };
}

function buildReason(riskScore, classification, enrichment) {
  const reasons = [];
  if (riskScore >= RISK_THRESHOLDS.autoClear) {
    reasons.push('The aggregated screening score is high, indicating a trusted transaction profile.');
  } else if (riskScore < RISK_THRESHOLDS.manualReview) {
    reasons.push('The transaction exhibits multiple high-risk signals and should be blocked.');
  } else {
    reasons.push('The transaction is in an uncertain band and requires minimal human review.');
  }

  reasons.push(`Classifier confidence: ${classification.confidence}%.`);
  reasons.push(`Specter enriched score: ${enrichment.enrichedScore}%.`);
  reasons.push(`Company signals: ${enrichment.details.signalSummary.join('; ')}.`);

  return reasons.join(' ');
}
