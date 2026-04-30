import { chatCompletion, MODEL_FAST } from './llm.js';

export async function parseUserContext(txn, userReply) {
  const msg = await chatCompletion({
    model: MODEL_FAST,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Parse this user's reply to a transaction query. Return ONLY valid JSON.

Transaction: £${parseFloat(txn.amount).toFixed(2)} to ${txn.merchant}
User's reply: "${userReply}"

Interpret naturally — handle things like:
- "no idea" → not explained, seems_legitimate: null
- "I didn't make this" → not explained, seems_legitimate: false, fraud signal
- "groceries" or "team lunch" → explained, legitimate
- "contractor payment" or "freelancer" → explained, professional services
- "User did not respond" → not explained, treat as suspicious

Return JSON:
{
  "explained": <boolean>,
  "category_from_context": "<what they said it was, or null>",
  "merchant_type": "<inferred merchant type or null>",
  "seems_legitimate": <true | false | null>,
  "confidence_boost": <integer 0-40>,
  "summary": "<one sentence summary of what user said>"
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
    parsed = {
      explained: false,
      category_from_context: null,
      merchant_type: null,
      seems_legitimate: null,
      confidence_boost: 0,
      summary: 'Could not parse user reply',
    };
  }

  return {
    explained: Boolean(parsed.explained),
    category_from_context: parsed.category_from_context || null,
    merchant_type: parsed.merchant_type || null,
    seems_legitimate: parsed.seems_legitimate ?? null,
    confidence_boost: typeof parsed.confidence_boost === 'number' ? parsed.confidence_boost : 0,
    summary: parsed.summary || '',
  };
}
