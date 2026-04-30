/**
 * Specter Full API (api.tryspecter.com) — person + company saved search helpers.
 * Enrichment API text-search stays in specter.js (app.tryspecter.com).
 */

const DEFAULT_BASE = 'https://api.tryspecter.com';

function baseUrl() {
  return (process.env.SPECTER_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

function headers() {
  const key = process.env.SPECTER_API_KEY || '';
  return {
    'Content-Type': 'application/json',
    'X-API-Key': key,
  };
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null, raw: text };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: text };
  }
}

/** POST /people/by-email — returns person_id, score (1–10), names on 200 */
export async function specterGetPersonByEmail(email) {
  if (!email?.trim()) {
    return { ok: false, status: 0, error: 'missing_email', data: null };
  }
  const res = await fetch(`${baseUrl()}/people/by-email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const parsed = await parseJsonSafe(res);
  if (res.status === 204) {
    return { ok: false, status: 204, error: 'no_match', data: null };
  }
  return { ok: res.ok, status: res.status, data: parsed.data, raw: parsed.raw };
}

/** GET /people/{personId} — full profile */
export async function specterGetPersonById(personId) {
  if (!personId?.trim()) {
    return { ok: false, status: 0, error: 'missing_person_id', data: null };
  }
  const res = await fetch(`${baseUrl()}/people/${encodeURIComponent(personId.trim())}`, {
    method: 'GET',
    headers: headers(),
  });
  const parsed = await parseJsonSafe(res);
  return { ok: res.ok, status: res.status, data: parsed.data, raw: parsed.raw };
}

/** GET /searches/companies/{searchId}/results — requires saved search shared with API */
export async function specterGetCompanySavedSearchResults(searchId, { limit = 30, page = 0 } = {}) {
  if (!searchId) {
    return { ok: false, status: 0, error: 'missing_search_id', data: null, companies: [] };
  }
  const q = new URLSearchParams({ limit: String(limit), page: String(page) });
  const res = await fetch(
    `${baseUrl()}/searches/companies/${encodeURIComponent(String(searchId))}/results?${q}`,
    { method: 'GET', headers: headers() }
  );
  const parsed = await parseJsonSafe(res);
  const body = parsed.data;
  const companies = Array.isArray(body) ? body : body?.data ?? body?.results ?? [];
  return {
    ok: res.ok,
    status: res.status,
    companies,
    data: body,
    raw: parsed.raw,
  };
}

/** GET /companies/search?query= — name/domain hint (1 credit) */
export async function specterSearchCompaniesByName(query) {
  if (!query?.trim()) {
    return { ok: false, companies: [] };
  }
  const q = new URLSearchParams({ query: query.trim() });
  const res = await fetch(`${baseUrl()}/companies/search?${q}`, {
    method: 'GET',
    headers: headers(),
  });
  const parsed = await parseJsonSafe(res);
  const body = parsed.data;
  const companies = Array.isArray(body) ? body : body?.data ?? [];
  return { ok: res.ok, status: res.status, companies };
}
