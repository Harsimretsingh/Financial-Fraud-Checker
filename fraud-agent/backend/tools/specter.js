export async function enrichMerchant(merchantName) {
  try {
    const response = await fetch('https://app.tryspecter.com/api/v1/entities/text-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SPECTER_API_KEY || '',
      },
      body: JSON.stringify({ query: merchantName, entity_type: 'company' }),
    });

    if (!response.ok) {
      return { found: false, signal: 'No company footprint found in Specter database' };
    }

    const data = await response.json();
    const results = data?.data || data?.results || [];

    if (!results || results.length === 0) {
      return { found: false, signal: 'No company footprint found in Specter database' };
    }

    const company = results[0];
    return {
      found: true,
      name: company.name || merchantName,
      founded: company.founded_year || company.founded || null,
      employees: company.employee_count || company.employees || null,
      status: company.status || company.operational_status || null,
      funding: company.funding?.total_funding_usd || company.total_funding_usd || null,
      web_visits: company.web?.visits || company.web_visits || null,
      highlights: company.highlights || [],
    };
  } catch (err) {
    console.error('Specter enrichment error:', err.message);
    return { found: false, error: true, signal: 'Specter lookup failed' };
  }
}
