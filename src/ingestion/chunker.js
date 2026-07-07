// Fixed-size chunking with overlap. This is the "naive" baseline —
// good enough to start, and a natural upgrade path later is semantic
// or structure-aware chunking (e.g. by markdown heading, or by
// function/class for code — see Phase 2, the codebase RAG assistant).

export function chunkText(text, { chunkSize = 800, overlap = 150 } = {}) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}

export function chunkDocument(doc, options) {
  // doc: { id, source, text, metadata }
  const rawChunks = chunkText(doc.text, options);
  const ingestedAt = new Date().toISOString();
  return rawChunks.map((text, i) => ({
    id: `${doc.id}-chunk-${i}`,
    text,
    metadata: {
      ...doc.metadata,
      source: doc.source,
      chunkIndex: i,
      ingestedAt,
    },
  }));
}
