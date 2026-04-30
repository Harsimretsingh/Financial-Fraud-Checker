import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function finalVerdict(txn, classification, enrichment, parsedContext) {
  const contextBlock = parsedContext.explained
    ? `User explained: ${parsedContext.summary}. Category from context: ${parsedContext.category_from_context || 'unspecified'}. Seems legitimate: ${parsedContext.seems_legitimate}.`
    : `User did NOT provide a clear explanation — this is a fraud signal. Summary: ${parsedContext.summary}. Seems legitimate: ${parsedContext.seems_legitimate}.`;

  const specterBlock = enrichment.found
    ? `Specter company data found:
- Name: ${enrichment.name}
- Founded: ${enrichment.founded || 'unknown'}
- Employees: ${enrichment.employees || 'unknown'}
- Status: ${enrichment.status || 'unknown'}
- Total funding: ${enrichment.funding ? `$${enrichment.funding.toLocaleString()}` : 'unknown'}
- Monthly web visits: ${enrichment.web_visits || 'unknown'}
- Highlights: ${Array.isArray(enrichment.highlights) && enrichment.highlights.length ? enrichment.highlights.join('; ') : 'none'}`
    : `Specter found NO company record for this merchant — this is a strong fraud signal.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a financial fraud analyst. Make a final verdict on this transaction.

Transaction:
- Merchant: ${txn.merchant}
- Amount: £${parseFloat(txn.amount).toFixed(2)}
- Date: ${txn.date}
- Initial classification: ${classification.category} (confidence: ${classification.confidence})

User context:
${contextBlock}

Specter enrichment:
${specterBlock}

Cross-reference logic:
- User says "groceries" + Specter confirms Amazon/grocery retailer = auto_approve
- User says "groceries" + Specter shows financial services company = suspicious mismatch, consider auto_block or human_review
- User doesn't recognise transaction + Specter has no record = high fraud signal, auto_block
- User gave legitimate explanation + Specter confirms matching business = auto_approve
- Ambiguous or conflicting signals = human_review

Return ONLY valid JSON:
{
  "risk": "low" | "medium" | "high",
  "confidence": <integer 0-100>,
  "rationale": "<2 sentences>",
  "context_helped": <boolean>,
  "specter_matches_context": <boolean | null>,
  "key_signal": "<most important signal in one short phrase>",
  "recommended_action": "auto_approve" | "auto_block" | "human_review"
}`,
      },
    ],
  });

  let parsed;
  try {
    const raw = msg.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = {
      risk: 'medium',
      confidence: 50,
      rationale: 'Could not determine verdict automatically.',
      context_helped: false,
      specter_matches_context: null,
      key_signal: 'Analysis failed',
      recommended_action: 'human_review',
    };
  }

  return {
    risk: parsed.risk || 'medium',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
    rationale: parsed.rationale || '',
    context_helped: Boolean(parsed.context_helped),
    specter_matches_context: parsed.specter_matches_context ?? null,
    key_signal: parsed.key_signal || '',
    recommended_action: parsed.recommended_action || 'human_review',
  };
}
