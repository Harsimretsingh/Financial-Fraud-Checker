export const privateCompanies = [
  {
    name: 'Orbit Retail',
    legalName: 'Orbit Retail Ltd.',
    industry: 'Retail',
    country: 'US',
    founded: 2013,
    employees: 250,
    fundingStage: 'Series B',
    lastFundingAmount: '$45M',
    ownership: 'Private',
    riskScore: 68,
    signalSummary: ['High chargeback rate', 'Cross-border returns', 'Card-not-present volume'],
    sectorNotes: 'Large e-commerce footprint with multiple fulfillment partners.'
  },
  {
    name: 'Mercury Motors',
    legalName: 'Mercury Motors LLC',
    industry: 'Automotive',
    country: 'DE',
    founded: 2016,
    employees: 420,
    fundingStage: 'Series C',
    lastFundingAmount: '$120M',
    ownership: 'Private',
    riskScore: 88,
    signalSummary: ['High ticket size', 'Frequent international wire orders', 'Supply chain complexity'],
    sectorNotes: 'Premium auto merchant with global shipping and financing partners.'
  },
  {
    name: 'Neptune Travel',
    legalName: 'Neptune Travel Inc.',
    industry: 'Travel & Hospitality',
    country: 'GB',
    founded: 2012,
    employees: 135,
    fundingStage: 'Series D',
    lastFundingAmount: '$230M',
    ownership: 'Private',
    riskScore: 42,
    signalSummary: ['Recurring customer loyalty programs', 'Low historical fraud', 'Seasonal booking spikes'],
    sectorNotes: 'Online travel agency with bundled flight and hotel bookings.'
  },
  {
    name: 'Praxis Pharmaceuticals',
    legalName: 'Praxis Pharmaceuticals Ltd.',
    industry: 'Healthcare',
    country: 'CH',
    founded: 2014,
    employees: 180,
    fundingStage: 'Series C',
    lastFundingAmount: '$95M',
    ownership: 'Private',
    riskScore: 81,
    signalSummary: ['Regulated healthcare payments', 'Large lab services invoices', 'High-value Rx orders'],
    sectorNotes: 'Specialized pharmaceutical supplier with complex compliance obligations.'
  },
  {
    name: 'Starlight Electronics',
    legalName: 'Starlight Electronics GmbH',
    industry: 'Electronics',
    country: 'JP',
    founded: 2010,
    employees: 320,
    fundingStage: 'Growth Equity',
    lastFundingAmount: '$65M',
    ownership: 'Private',
    riskScore: 54,
    signalSummary: ['Cross-border warranty claims', 'Electronics components discounts', 'High-volume overseas orders'],
    sectorNotes: 'Supplier of consumer electronics with multiple global marketplaces.'
  }
];

export function findCompanyProfile(merchantName) {
  const normalized = merchantName.trim().toLowerCase();
  return (
    privateCompanies.find(company => company.name.toLowerCase() === normalized) ||
    privateCompanies.find(company => normalized.includes(company.name.toLowerCase())) ||
    null
  );
}
