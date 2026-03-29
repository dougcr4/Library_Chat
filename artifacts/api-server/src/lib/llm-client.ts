/**
 * Shared LLM client — supports two backends:
 *
 *  1. Open-WebUI  (API key is set in Settings)
 *     Uses `openWebUiModel` — this can be a pipeline/preset name like
 *     "joshuaokolo-cad-designer" that only exists inside Open-WebUI.
 *     POST {openWebUiUrl}/api/chat/completions
 *
 *  2. Ollama native  (no API key set in Settings)
 *     Uses `ollamaModel` — must be a model actually pulled in Ollama,
 *     e.g. "qwen2.5:14b".
 *     POST {ollamaUrl}/api/generate
 *
 * If an API key IS set but Open-WebUI rejects it (401/403), a clear error
 * is thrown asking the user to update the key in Settings.
 */

export interface LlmCallOptions {
  ollamaUrl: string;
  ollamaModel: string;
  openWebUiUrl: string;
  openWebUiModel: string;
  openWebUiApiKey: string;
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
    ollamaModel,
    openWebUiUrl,
    openWebUiModel,
    openWebUiApiKey,
    systemPrompt,
    userPrompt,
    timeoutMs = 180_000,
  } = opts;

  const signal = AbortSignal.timeout(timeoutMs);

  if (openWebUiApiKey.trim()) {
    // API key is set → route through Open-WebUI using the Open-WebUI model name
    const url = `${openWebUiUrl.trim()}/api/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openWebUiApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: openWebUiModel.trim(),
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
        "Generate a new key: Open-WebUI → avatar → Account → API Keys → Create, " +
        "then paste it into Settings.",
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Open-WebUI error ${res.status}: ${text}`);
    }

    const rawText = await res.text();
    console.log("[llm-client] Open-WebUI raw response:", rawText.slice(0, 300));

    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Open-WebUI returned non-JSON response: ${rawText.slice(0, 200)}`);
    }

    if (!data || typeof data !== "object") {
      throw new Error(`Open-WebUI returned unexpected response: ${rawText.slice(0, 200)}`);
    }

    const obj = data as Record<string, unknown>;

    // Standard OpenAI-compatible format
    const choices = obj.choices as { message?: { content?: string } }[] | undefined;
    if (Array.isArray(choices) && choices.length > 0) {
      const content = choices[0]?.message?.content ?? "";
      if (content) return content;
    }

    // Fallback: Ollama-style { response: "..." }
    if (typeof obj.response === "string" && obj.response) {
      return obj.response;
    }

    throw new Error(`Open-WebUI returned no usable content. Full response: ${rawText.slice(0, 300)}`);

  } else {
    // No API key → use Ollama directly with the Ollama model name
    return callOllama(ollamaUrl, ollamaModel.trim(), systemPrompt, userPrompt, signal);
  }
}
