/**
 * Decide whether escalated enrichment should follow the person path or business path.
 * Explicit txn fields win; otherwise simple heuristics (no extra LLM call).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BUSINESS_HINTS = /\b(ltd|llc|inc|plc|corp|limited|gmbh|s\.a\.|sas|bv|nv|pty|pvt)\b/i;

export function inferCounterpartyKind(txn) {
  if (txn.counterparty_type === 'person' || txn.counterparty_type === 'business') {
    return txn.counterparty_type;
  }

  const email =
    txn.payer_email ||
    txn.customer_email ||
    txn.email ||
    txn.counterparty_email ||
    (EMAIL_RE.test(String(txn.merchant || '').trim()) ? String(txn.merchant).trim() : null);

  if (email && EMAIL_RE.test(email)) {
    return 'person';
  }

  if (txn.specter_person_id) {
    return 'person';
  }

  const merchant = String(txn.merchant || '');
  if (BUSINESS_HINTS.test(merchant) || merchant.length > 40) {
    return 'business';
  }

  // Short descriptor without corporate suffix → often individual / sole trader display name
  if (merchant.split(/\s+/).length <= 3 && !BUSINESS_HINTS.test(merchant)) {
    return 'person';
  }

  return 'business';
}

export function pickCounterpartyEmail(txn) {
  const candidates = [
    txn.payer_email,
    txn.customer_email,
    txn.email,
    txn.counterparty_email,
  ].filter(Boolean);
  for (const c of candidates) {
    if (EMAIL_RE.test(String(c).trim())) return String(c).trim().toLowerCase();
  }
  return null;
}
