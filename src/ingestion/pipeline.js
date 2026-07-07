import { chunkDocument } from "./chunker.js";
import { embedTexts } from "../embedding/embeddingClient.js";
import { upsertChunks } from "../shared/vectorStore.js";

const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 800;
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP) || 150;

export async function ingestDocument(doc) {
  // doc: { id, source, text, metadata? }
  const chunks = chunkDocument(doc, {
    chunkSize: CHUNK_SIZE,
    overlap: CHUNK_OVERLAP,
  });

  const embeddings = await embedTexts(chunks.map((c) => c.text), "document");

  const records = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  const count = upsertChunks(records);
  return { source: doc.source, chunksIngested: count };
}

export async function ingestDocuments(docs) {
  const results = [];
  for (const doc of docs) {
    results.push(await ingestDocument(doc));
  }
  return results;
}
