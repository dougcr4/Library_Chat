/**
 * Shared LLM client — supports two backends:
 *
 *  1. Open-WebUI  (API key is set in Settings)
 *     POST {openWebUiUrl}/api/chat/completions
 *     Payload: { model, messages, stream: false }
 *     Response: { choices[0].message.content: string }
 *
 *  2. Ollama native  (no API key set in Settings)
 *     POST {ollamaUrl}/api/generate
 *     Payload: { model, system, prompt, stream: false }
 *     Response: { response: string }
 *
 * If an API key IS set but Open-WebUI rejects it (401/403), a clear error
 * is thrown — the user must fix the key in Settings.  We do NOT fall back
 * to Ollama in that case because Open-WebUI model names (pipelines, presets)
 * are not recognised by Ollama directly.
 *
 * If NO API key is set, Ollama is used directly with the model name from
 * Settings (which should be a native Ollama model such as "qwen2.5:14b").
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
    // API key is set → use Open-WebUI
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

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Open-WebUI rejected the API key (error " + res.status + "). " +
        "Please generate a new key: Open-WebUI → click your avatar → " +
        "Account → API Keys → Create, then paste it into Settings here.",
      );
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
    // No API key → use Ollama directly
    // Make sure the model name in Settings is a native Ollama model (e.g. qwen2.5:14b)
    return callOllama(ollamaUrl, model, systemPrompt, userPrompt, signal);
  }
}
