import { chatCompletion, MODEL_REASONING } from './llm.js';

export async function assessFraudRisk(txn, classification) {
  const msg = await chatCompletion({
    model: MODEL_REASONING,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Assess the fraud risk of this transaction. Return ONLY valid JSON.

Transaction:
- Merchant: ${txn.merchant}
- Amount: £${parseFloat(txn.amount).toFixed(2)}
- Date: ${txn.date}
- Classified as: ${classification.category} (confidence: ${classification.confidence})

Check for these fraud signals:
1. Vague or obfuscated merchant name (codes, random chars, abbreviations)
2. Unusual amount for the category (too high or round number)
3. Unknown vendor category combined with large amount (>£500)
4. International wire transfer to an unlisted payee
5. Any other suspicious patterns

Return JSON:
{
  "risk": "low" | "medium" | "high",
  "score": <integer 0-100>,
  "reason": "<one sentence summary>",
  "signals": ["<signal1>", "<signal2>"]
}`,
      },
    ],
  });

  let parsed;
  try {
    const raw = msg.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = { risk: 'medium', score: 50, reason: 'Could not assess risk', signals: [] };
  }

  return {
    risk: parsed.risk || 'medium',
    score: typeof parsed.score === 'number' ? parsed.score : 50,
    reason: parsed.reason || '',
    signals: Array.isArray(parsed.signals) ? parsed.signals : [],
  };
}
