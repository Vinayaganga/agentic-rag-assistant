// A second tool for the agent: list what's actually in the store, instead
// of forcing every question (even "what documents do you have?") through
// a similarity search it wasn't designed for.

import { getAllRecords } from "../shared/vectorStore.js";

export const listDocumentsToolDef = {
  name: "list_documents",
  description:
    "List the documents currently ingested into the store, with how many chunks each has. Use this when the user asks what documents are available, rather than searching for a specific topic.",
  input_schema: {
    type: "object",
    properties: {},
  },
};

export async function executeListDocumentsTool() {
  const records = getAllRecords();
  const counts = new Map();
  for (const record of records) {
    const source = record.metadata.source;
    counts.set(source, (counts.get(source) || 0) + 1);
  }
  return [...counts.entries()].map(([source, chunkCount]) => ({ source, chunkCount }));
}
