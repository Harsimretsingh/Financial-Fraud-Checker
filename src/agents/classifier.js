import { findCompanyProfile } from '../data/privateCompanies.js';
import { AGENT_NAMES } from '../constants.js';

function scoreMerchantClassification(transaction, profile) {
  let score = 20;

  if (/wire|transfer/i.test(transaction.paymentType)) {
    score += 18;
  }
  if (/credit/i.test(transaction.paymentType)) {
    score += 6;
  }
  if (transaction.amount > 1000) {
    score += 18;
  }
  if (transaction.location.match(/Nigeria|Ukraine|Venezuela|Russia/i)) {
    score += 18;
  }
  if (profile) {
    score += Math.min(20, Math.max(0, profile.riskScore - 50));
  }

  return Math.min(99, Math.max(18, score + Math.round(Math.random() * 10 - 5)));
}

export function classifyTransaction(transaction, logger) {
  const profile = findCompanyProfile(transaction.merchant);
  const confidence = scoreMerchantClassification(transaction, profile);
  const category = profile?.industry || 'General Retail';

  logger(`${AGENT_NAMES.CLASSIFIER} classification complete.`, `Merchant: ${transaction.merchant}, Category: ${category}, Confidence: ${confidence}%`);

  return {
    category,
    confidence,
    matchedCompany: profile?.name || null,
    companyProfile: profile || null
  };
}
