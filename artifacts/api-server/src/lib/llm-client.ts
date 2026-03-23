/**
 * Shared LLM client — supports two backends:
 *
 *  1. Ollama native  (no API key set, or Open-WebUI returns 401)
 *     POST {ollamaUrl}/api/generate
 *     Payload: { model, system, prompt, stream: false }
 *     Response: { response: string }
 *
 *  2. OpenAI-compatible  (API key set — routes through Open-WebUI)
 *     POST {openWebUiUrl}/api/chat/completions
 *     Payload: { model, messages, stream: false }
 *     Response: { choices[0].message.content: string }
 *
 * If Open-WebUI returns 401 the client automatically falls back to Ollama.
 */

export interface LlmCallOptions {
  ollamaUrl: string;
  openWebUiUrl: string;
  openWebUiApiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

async function callOllama(
  ollamaUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const url = `${ollamaUrl.trim()}/api/generate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { response?: string };
  const content = data.response ?? "";
  if (!content) throw new Error("Ollama returned an empty response");
  return content;
}

export async function callLlm(opts: LlmCallOptions): Promise<string> {
  const {
    ollamaUrl,
    openWebUiUrl,
    openWebUiApiKey,
    model,
    systemPrompt,
    userPrompt,
    timeoutMs = 180_000,
  } = opts;

  const signal = AbortSignal.timeout(timeoutMs);

  if (openWebUiApiKey.trim()) {
    const url = `${openWebUiUrl.trim()}/api/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openWebUiApiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
        stream: false,
      }),
      signal,
    });

    if (res.status === 401) {
      console.warn("Open-WebUI returned 401 — API key invalid or expired. Falling back to Ollama.");
      return callOllama(ollamaUrl, model, systemPrompt, userPrompt, signal);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Open-WebUI error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Open-WebUI returned an empty response");
    return content;

  } else {
    return callOllama(ollamaUrl, model, systemPrompt, userPrompt, signal);
  }
}
