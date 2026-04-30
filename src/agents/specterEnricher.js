import { findCompanyProfile } from '../data/privateCompanies.js';
import { AGENT_NAMES } from '../constants.js';

function computeLocationRisk(location) {
  return /Nigeria|Ukraine|Venezuela|Russia/i.test(location) ? 18 : 0;
}

function computeAmountRisk(amount) {
  if (amount > 3000) return 20;
  if (amount > 1500) return 12;
  if (amount > 800) return 7;
  return 3;
}

function computeCompanySignalRisk(profile) {
  if (!profile) return 45;
  return Math.min(92, Math.max(20, profile.riskScore));
}

export function enrichTransaction(transaction, classification, logger) {
  const profile = classification.companyProfile || findCompanyProfile(transaction.merchant);
  const companyProfile = profile || {
    name: transaction.merchant,
    industry: classification.category,
    country: 'Unknown',
    founded: null,
    employees: null,
    fundingStage: 'Unknown',
    lastFundingAmount: 'Unknown',
    ownership: 'Private',
    riskScore: 48,
    signalSummary: ['Unknown private merchant; generic risk profile applied'],
    sectorNotes: 'No company-level enrichment available.'
  };

  const locationRisk = computeLocationRisk(transaction.location);
  const amountRisk = computeAmountRisk(transaction.amount);
  const paymentRisk = transaction.paymentType === 'wire' ? 12 : transaction.paymentType === 'debit' ? 6 : 4;
  const profileRisk = computeCompanySignalRisk(companyProfile);

  const enrichedScore = Math.min(
    100,
    Math.round((profileRisk * 0.42) + (locationRisk * 0.22) + (amountRisk * 0.2) + (paymentRisk * 0.16))
  );

  const signals = [
    `Company risk score ${companyProfile.riskScore}`,
    companyProfile.signalSummary.join(', '),
    `Industry: ${companyProfile.industry}`
  ];

  logger(`${AGENT_NAMES.ENRICHER} enrichment complete.`, `Company: ${companyProfile.name}, Enriched score: ${enrichedScore}`);

  return {
    companyProfile,
    locationRisk,
    amountRisk,
    paymentRisk,
    enrichedScore,
    signals,
    details: {
      companyName: companyProfile.name,
      fundingStage: companyProfile.fundingStage,
      employeeCount: companyProfile.employees,
      sectorNotes: companyProfile.sectorNotes,
      signalSummary: companyProfile.signalSummary
    }
  };
}
