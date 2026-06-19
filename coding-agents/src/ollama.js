const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

export async function generateWithOllama({
  prompt,
  model = process.env.OLLAMA_MODEL || "mistral",
  baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL,
  temperature = 0.2
}) {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.response || "";
}
