import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { processBatch, processContextReply } from './pipeline.js';
import {
  startLiveFeed,
  stopLiveFeed,
  isLiveActive,
  getIntervalMs,
} from './liveFeed.js';
import { handleStripeWebhook } from './stripeIngest.js';
import { parseSampleTransactions } from './sampleData.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));

app.locals.clients = [];

function pushToClients(clients, data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
    if (typeof client.flush === 'function') client.flush();
  }
}

/** Stripe needs raw body for signature verification — must be before express.json() */
app.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const push = (data) => pushToClients(app.locals.clients, data);
    return handleStripeWebhook(req, res, { push });
  }
);

app.use(express.json());

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  app.locals.clients.push(res);

  req.on('close', () => {
    app.locals.clients = app.locals.clients.filter(c => c !== res);
  });
});

app.get('/sample-payments', (req, res) => {
  try {
    const payments = parseSampleTransactions();
    res.json({
      title: 'Demo portfolio',
      description: 'Representative card payments — SaaS, marketplaces, and higher-risk patterns.',
      count: payments.length,
      payments,
    });
  } catch (err) {
    console.error('sample-payments:', err);
    res.status(500).json({ error: 'Could not load sample data', message: err.message });
  }
});

app.post('/demo/sample', (req, res) => {
  let transactions;
  try {
    transactions = parseSampleTransactions();
  } catch (err) {
    console.error('demo/sample:', err);
    return res.status(500).json({ error: err.message });
  }
  if (!transactions.length) {
    return res.status(400).json({ error: 'No sample transactions' });
  }
  res.json({ status: 'processing', count: transactions.length, source: 'sample.csv' });
  const push = (data) => pushToClients(app.locals.clients, data);
  processBatch(transactions, push).catch(err =>
    console.error('processBatch (sample) error:', err)
  );
});

app.post('/process', async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: 'transactions array required' });
  }

  res.json({ status: 'processing', count: transactions.length });

  const push = (data) => pushToClients(app.locals.clients, data);
  processBatch(transactions, push).catch(err =>
    console.error('processBatch error:', err)
  );
});

app.post('/live/start', (req, res) => {
  const push = (data) => pushToClients(app.locals.clients, data);
  const { intervalMs } = startLiveFeed(push, {
    intervalMs: req.body?.intervalMs,
  });
  push({ type: 'live_status', active: true, intervalMs });
  res.json({ status: 'started', active: true, intervalMs });
});

app.post('/live/stop', (req, res) => {
  stopLiveFeed();
  const push = (data) => pushToClients(app.locals.clients, data);
  push({ type: 'live_status', active: false });
  res.json({ status: 'stopped', active: false });
});

app.get('/live/status', (req, res) => {
  res.json({
    active: isLiveActive(),
    intervalMs: getIntervalMs(),
  });
});

app.post('/context', async (req, res) => {
  const { txnId, reply } = req.body;
  if (!txnId || !reply) {
    return res.status(400).json({ error: 'txnId and reply required' });
  }

  res.json({ status: 'received' });

  const push = (data) => pushToClients(app.locals.clients, data);
  processContextReply(txnId, reply, push).catch(err =>
    console.error('processContextReply error:', err)
  );
});

/**
 * Analyst / agent one-tap resolution — broadcasts to SSE clients like pipeline results.
 * action: approve | accept | block | escalate
 */
app.post('/agent/decision', (req, res) => {
  const {
    txnId,
    action,
    merchant,
    amount,
    date,
    user_id,
    category,
  } = req.body || {};

  if (!txnId || typeof txnId !== 'string') {
    return res.status(400).json({ error: 'txnId required' });
  }

  const a = String(action || '').toLowerCase();
  const normalized = a === 'accept' ? 'approve' : a;
  if (!['approve', 'block', 'escalate'].includes(normalized)) {
    return res.status(400).json({ error: 'action must be approve, accept, block, or escalate' });
  }

  const status =
    normalized === 'approve'
      ? 'auto_approved'
      : normalized === 'block'
        ? 'auto_blocked'
        : 'human_review';

  res.json({ ok: true, txnId, status });

  const push = (data) => pushToClients(app.locals.clients, data);
  push({
    type: 'result',
    status,
    txnId,
    id: txnId,
    merchant: merchant ?? '—',
    amount: amount ?? '',
    date: date ?? '',
    user_id: user_id ?? '',
    category: category ?? '',
    analyst_decision: true,
    decision: normalized,
  });
});

app.listen(PORT, () => {
  console.log(`Fraud Agent backend running on http://localhost:${PORT}`);
});
