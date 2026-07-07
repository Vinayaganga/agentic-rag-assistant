// Voyage AI embeddings, called via plain fetch (no SDK dependency).
// Voyage embeddings are asymmetric: ingested chunks are embedded with
// input_type "document", search queries with input_type "query".

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5";
const MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 21_000; // free-tier accounts are capped at 3 requests/minute

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embed(texts, inputType, attempt = 0) {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfterHeader = Number(response.headers.get("retry-after"));
    const delayMs = retryAfterHeader > 0 ? retryAfterHeader * 1000 : DEFAULT_RETRY_DELAY_MS;
    console.warn(`Voyage rate limit hit, retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
    await sleep(delayMs);
    return embed(texts, inputType, attempt + 1);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embeddings request failed (${response.status}): ${body}`);
  }

  const { data } = await response.json();
  return data.map((d) => d.embedding);
}

export async function embedTexts(texts, inputType = "document") {
  // texts: string[] -> returns number[][]
  return embed(texts, inputType);
}

export async function embedOne(text, inputType = "query") {
  const [embedding] = await embed([text], inputType);
  return embedding;
}
