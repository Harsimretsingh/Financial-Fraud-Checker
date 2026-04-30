import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '../data/sample.csv');

const OFFLINE_FLAG = process.argv.includes('--offline') || process.env.SIMULATE_CSV_OFFLINE === '1';
const HAS_LLM = Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
/** Offline if explicitly requested, or no LLM key (so the command always produces a run). */
const RUN_OFFLINE = OFFLINE_FLAG || !HAS_LLM;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line, i) => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = values[j] ?? '';
    });
    if (!obj.id) obj.id = `txn_${Date.now()}_${i}`;
    return obj;
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Plausible demo replies so low-confidence rows complete without waiting for a human. */
function simulatedUserReply(txn) {
  const m = (txn.merchant || '').toLowerCase();
  if (m.includes('amazon') || m.includes('amzn')) return 'Household order on our shared Prime account.';
  if (m.includes('deliveroo') || m.includes('uber')) return 'Team lunch for the project squad.';
  if (m.includes('wire') || m.includes('intl') || m.includes('offshore') || m.includes('unknown')) {
    return 'I do not recognise this charge — it was not me.';
  }
  if (m.includes('consultancy') || m.includes('capital') || m.includes('digital pmnt')) {
    return 'Invoice payment to an external vendor as agreed in our contract.';
  }
  return 'Approved company spend for software and operations.';
}

function latestResultById(events) {
  const map = new Map();
  for (const e of events) {
    if (e.type === 'result' && e.id) map.set(e.id, e);
  }
  return map;
}

function summarize(events) {
  const last = latestResultById(events);
  const counts = {};
  for (const row of last.values()) {
    const s = row.status || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  }
  const errors = events.filter(e => e.type === 'error').length;
  return { last, counts, errors };
}

/** Rule-based path when no LLM keys (demo / CI). Mirrors cleared vs review split only loosely. */
async function runOfflineSimulation(transactions, push) {
  for (const txn of transactions) {
    push({ type: 'processing', txnId: txn.id, merchant: txn.merchant, amount: txn.amount });
    await sleep(30);

    const m = (txn.merchant || '').toLowerCase();
    const amount = parseFloat(txn.amount) || 0;

    const strongClear =
      m.includes('amazon web services') ||
      m.includes('slack technologies') ||
      m.includes('github inc') ||
      m.includes('zoom video') ||
      m.includes('notion labs') ||
      m.includes('figma inc') ||
      m.includes('stripe inc');

    if (strongClear) {
      push({
        type: 'result',
        status: 'cleared',
        txnId: txn.id,
        id: txn.id,
        merchant: txn.merchant,
        amount: txn.amount,
        date: txn.date,
        user_id: txn.user_id,
        category: 'SaaS',
        confidence: 91,
        reason: '[offline] Known recurring software vendor',
        latency_ms: 0,
        tokens_used: 0,
      });
      continue;
    }

    if (m.includes('deliveroo') && amount < 100) {
      push({
        type: 'result',
        status: 'cleared',
        txnId: txn.id,
        id: txn.id,
        merchant: txn.merchant,
        amount: txn.amount,
        date: txn.date,
        user_id: txn.user_id,
        category: 'Meals',
        confidence: 88,
        reason: '[offline] Typical meal spend',
        latency_ms: 0,
        tokens_used: 0,
      });
      continue;
    }

    const question = `[offline] What was the £${amount.toFixed(2)} payment to ${txn.merchant} for?`;
    push({
      type: 'result',
      status: 'awaiting_context',
      txnId: txn.id,
      id: txn.id,
      merchant: txn.merchant,
      amount: txn.amount,
      date: txn.date,
      user_id: txn.user_id,
      category: 'Unknown vendor',
      confidence: 62,
      reason: '[offline] Merchant or amount looks ambiguous',
      latency_ms: 0,
      tokens_used: 0,
      question,
    });

    const reply = simulatedUserReply(txn);
    const deny = /not me|don't recognize|do not recognise|didn't make|did not/i.test(reply);

    const highRiskMerchant =
      m.includes('offshore') ||
      m.includes('unknown') ||
      m.includes('intl wire') ||
      m.includes('wire trf') ||
      m.includes('pay*');

    let status;
    let verdict;
    if (deny && highRiskMerchant) {
      status = 'auto_blocked';
      verdict = {
        recommended_action: 'auto_block',
        risk: 'high',
        confidence: 88,
        rationale: '[offline] User denied a high-risk payee pattern.',
        key_signal: 'denial + risky descriptor',
      };
    } else if (deny) {
      status = 'human_review';
      verdict = {
        recommended_action: 'human_review',
        risk: 'medium',
        confidence: 55,
        rationale: '[offline] User denial without a clear benign merchant match.',
        key_signal: 'user denial',
      };
    } else if ((m.includes('amzn') || m.includes('amazon')) && amount < 400) {
      status = 'auto_approved';
      verdict = {
        recommended_action: 'auto_approve',
        risk: 'low',
        confidence: 82,
        rationale: '[offline] Explanation fits a retail marketplace charge.',
        key_signal: 'aligned narrative',
      };
    } else if (amount >= 2000 || m.includes('consultancy') || m.includes('capital') || m.includes('xlnt') || m.includes('digital pmnt')) {
      status = 'human_review';
      verdict = {
        recommended_action: 'human_review',
        risk: 'medium',
        confidence: 60,
        rationale: '[offline] Large or opaque payment still warrants a human pass.',
        key_signal: 'amount / opacity',
      };
    } else {
      status = 'auto_approved';
      verdict = {
        recommended_action: 'auto_approve',
        risk: 'low',
        confidence: 78,
        rationale: '[offline] Benign explanation for medium-risk merchant.',
        key_signal: 'user context',
      };
    }

    push({
      type: 'result',
      status,
      txnId: txn.id,
      id: txn.id,
      merchant: txn.merchant,
      amount: txn.amount,
      date: txn.date,
      user_id: txn.user_id,
      category: 'Unknown vendor',
      confidence: 62,
      verdict,
      parsedContext: { summary: reply, explained: true },
      userReply: reply,
    });

    if (transactions.indexOf(txn) < transactions.length - 1) await sleep(30);
  }
}

const csvText = readFileSync(CSV_PATH, 'utf8');
const transactions = parseCSV(csvText);

const events = [];
function push(data) {
  events.push({ ...data, _t: Date.now() });
  if (data.type === 'processing') {
    console.log(`  … classify ${data.txnId} — ${data.merchant} (£${data.amount})`);
    return;
  }
  if (data.type === 'error') {
    console.error(`  ✖ ${data.txnId || ''} ${data.merchant || ''}: ${data.error}`);
    return;
  }
  if (data.type === 'result') {
    const q = data.question ? ` Q: ${String(data.question).slice(0, 72)}…` : '';
    console.log(`  → ${data.id} ${data.status} (${data.category || '?'} @ ${data.confidence ?? '?'})${q}`);
  }
}

console.log(`CSV: ${CSV_PATH} (${transactions.length} rows)`);
if (RUN_OFFLINE) {
  const why = OFFLINE_FLAG ? '(--offline)' : '(no LLM_API_KEY / OPENAI_API_KEY — rule-based fallback)';
  console.log(`Mode: offline simulation ${why}\n`);
} else {
  console.log('Mode: full LLM pipeline + simulated user replies for awaiting_context.\n');
}

if (RUN_OFFLINE) {
  await runOfflineSimulation(transactions, push);
} else {
  const { processBatch, processContextReply } = await import('../pipeline.js');
  try {
    await processBatch(transactions, push);
  } catch (e) {
    console.error('processBatch failed:', e.message || e);
    process.exit(1);
  }

  let last = latestResultById(events);
  const awaiting = [...last.entries()].filter(([, e]) => e.status === 'awaiting_context').map(([id]) => id);

  if (awaiting.length) {
    console.log(`\n--- Simulated user replies (${awaiting.length} awaiting context) ---\n`);
    for (const id of awaiting) {
      const txn = transactions.find(t => t.id === id);
      const reply = simulatedUserReply(txn);
      console.log(`  ${id}: "${reply}"`);
      await processContextReply(id, reply, push);
    }
  }
}

const { last, counts, errors } = summarize(events);

console.log('\n--- Simulation summary (final status per transaction) ---\n');
for (const [status, n] of Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${status}: ${n}`);
}
if (errors) console.log(`  errors: ${errors}`);

console.log('\nPer row:');
for (const t of transactions) {
  const r = last.get(t.id);
  const st = r?.status ?? 'missing';
  const v = r?.verdict?.recommended_action ? ` → ${r.verdict.recommended_action}` : '';
  console.log(`  ${t.id}  ${t.merchant}  £${t.amount}  →  ${st}${v}`);
}
