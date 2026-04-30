/**
 * OpenAI-compatible chat completions (works with OpenAI, OpenRouter, Azure,
 * LM Studio, Ollama openai plugin, and other providers using the same schema).
 */
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';

export const MODEL_FAST = process.env.LLM_MODEL_FAST || 'gpt-4o-mini';
export const MODEL_REASONING = process.env.LLM_MODEL_REASONING || 'gpt-4o';

export async function chatCompletion({ model, messages, max_tokens }) {
  if (!API_KEY) {
    throw new Error('Set LLM_API_KEY or OPENAI_API_KEY for LLM calls');
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('LLM returned invalid JSON');
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = {
    input_tokens: data.usage?.prompt_tokens ?? 0,
    output_tokens: data.usage?.completion_tokens ?? 0,
  };

  return { content, usage };
}
