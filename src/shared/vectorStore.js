// Minimal vector store: JSON file on disk + brute-force cosine similarity.
// This is intentionally simple so you can run the whole pipeline with zero
// infra. Swap this module for a pgvector or Pinecone-backed implementation
// once you outgrow it — the interface (upsert/search) stays the same.

import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve("data", "vectors.json");

function loadStore() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveStore(records) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function upsertChunks(chunks) {
  // chunks: [{ id, text, embedding, metadata }]
  const store = loadStore();
  const byId = new Map(store.map((r) => [r.id, r]));
  for (const chunk of chunks) byId.set(chunk.id, chunk);
  saveStore([...byId.values()]);
  return chunks.length;
}

export function search(queryEmbedding, topK = 5) {
  const store = loadStore();
  return store
    .map((record) => ({
      ...record,
      score: cosineSimilarity(queryEmbedding, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function clearStore() {
  saveStore([]);
}

export function storeSize() {
  return loadStore().length;
}
