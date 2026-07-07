// The one tool Claude gets: search the ingested document store. Claude
// decides for itself whether to call it, how to phrase the query, and
// whether it needs to call it again — that decision-making is the whole
// point of this project, versus rag-microservice's fixed single retrieve.

import { retrieve } from "../retrieval/retriever.js";

export const searchToolDef = {
  name: "search_documents",
  description:
    "Search the ingested document store for relevant passages. Call this whenever you need information to answer the user's question. You may call it more than once with different queries if the first search doesn't cover everything you need (e.g. a question comparing two topics may need one search per topic).",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query." },
      topK: { type: "integer", description: "How many passages to return (default 5)." },
    },
    required: ["query"],
  },
};

export async function executeSearchTool({ query, topK }) {
  const results = await retrieve(query, topK);
  return results.map((r) => ({ source: r.metadata.source, text: r.text, score: r.score }));
}
