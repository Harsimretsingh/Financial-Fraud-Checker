import { chatCompletion, MODEL_FAST } from './llm.js';

export async function generateContextQuestion(txn, classification) {
  const msg = await chatCompletion({
    model: MODEL_FAST,
    max_tokens: 128,
    messages: [
      {
        role: 'user',
        content: `Generate a single friendly, plain-English question to ask the person who made this transaction.

Transaction:
- Merchant: ${txn.merchant}
- Amount: £${parseFloat(txn.amount).toFixed(2)}
- Date: ${txn.date}
- Classified as: ${classification.category} (confidence: ${classification.confidence})

The question should be conversational and brief — like a compliance officer asking a colleague.
Example: "We noticed a £247 charge to AMZN MKTP GB — what was this purchase for?"

Return ONLY valid JSON:
{ "question": "<the question>" }`,
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
      question: `We noticed a £${parseFloat(txn.amount).toFixed(2)} charge to ${txn.merchant} — can you tell us what this was for?`,
    };
  }

  return { question: parsed.question || `What was the £${parseFloat(txn.amount).toFixed(2)} charge to ${txn.merchant} for?` };
}
