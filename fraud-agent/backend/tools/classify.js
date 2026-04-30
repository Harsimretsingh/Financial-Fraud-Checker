import { chatCompletion, MODEL_FAST } from './llm.js';

const CATEGORIES = [
  'SaaS', 'Cloud infra', 'Office supplies', 'Meals', 'Wire transfer',
  'Professional services', 'Unknown vendor', 'Financial services',
  'Groceries', 'Travel',
];

export async function classifyTransaction(txn) {
  const start = Date.now();

  const msg = await chatCompletion({
    model: MODEL_FAST,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Classify this financial transaction and return ONLY valid JSON.

Transaction:
- Merchant: ${txn.merchant}
- Amount: £${parseFloat(txn.amount).toFixed(2)}
- Date: ${txn.date}

Categories: ${CATEGORIES.join(', ')}

Return JSON with exactly these fields:
{
  "category": "<one of the categories above>",
  "confidence": <integer 0-100>,
  "reason": "<one sentence explaining the classification>"
}`,
      },
    ],
  });

  const latency_ms = Date.now() - start;
  const tokens_used = (msg.usage?.input_tokens || 0) + (msg.usage?.output_tokens || 0);

  let parsed;
  try {
    const raw = msg.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = { category: 'Unknown vendor', confidence: 30, reason: 'Could not parse classification' };
  }

  return {
    category: parsed.category || 'Unknown vendor',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 30,
    reason: parsed.reason || '',
    latency_ms,
    tokens_used,
  };
}
