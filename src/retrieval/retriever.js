import { embedOne } from "../embedding/embeddingClient.js";
import { search } from "../shared/vectorStore.js";

const TOP_K = Number(process.env.TOP_K) || 5;

export async function retrieve(query, topK = TOP_K) {
  const queryEmbedding = await embedOne(query, "query");
  const results = search(queryEmbedding, topK);

  // Strip the raw embedding vector out of what gets returned upstream —
  // callers only need text, metadata, and score.
  return results.map(({ id, text, metadata, score }) => ({
    id,
    text,
    metadata,
    score,
  }));
}
