# Agentic RAG Assistant

The key difference from its sibling `rag-microservice`: instead of a fixed
retrieve-then-generate pipeline, Claude gets a `search_documents` tool and
decides for itself whether to search, how to phrase the query, and whether
it needs to search again before answering. A single question that spans two
topics (e.g. "compare X and Y") can trigger two separate searches — that
multi-step decision-making is the whole point of this project.

## Setup

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY and VOYAGE_API_KEY
npm install
```

## Run

```bash
npm start
# server on http://localhost:3002 (rag-microservice: 3000, codebase-rag-assistant: 3001)
```

## Ingest documents

```bash
node src/ingestion/cli.js ./docs
```
Ingests the same two sample docs as `rag-microservice` (notification service
+ billing service), so a cross-doc comparison question has something real
to compare.

## Query

Agentic (the whole point of this project — Claude decides how many times to search):
```bash
curl -X POST http://localhost:3002/ask \
  -H "Content-Type: application/json" \
  -d '{ "query": "Compare how the notification service and billing service each handle repeated failures — how many retries does each allow and how are they timed?" }'
```
The response includes a `trace` array showing each search Claude actually
issued — for this kind of comparison question, expect 2+ entries (one per
topic), not 1.

Direct retrieval, bypassing the agent (for debugging chunk quality):
```bash
curl "http://localhost:3002/retrieve?query=what+is+the+retry+policy&topK=3"
```

## Health / reset

```bash
curl http://localhost:3002/health
curl -X DELETE http://localhost:3002/store
```

## Rate limits

Voyage AI free-tier accounts are capped at 3 requests/minute.
`embeddingClient.js` retries on 429s with backoff, same as the sibling
projects.

## Related projects

- [`rag-microservice`](../rag-microservice) — the sibling project this one
  forked its ingestion pipeline, vector store, and embedding client from.
  Its `/ask` always does exactly one retrieve before generating; this
  project's `/ask` lets Claude decide that for itself.
- [`codebase-rag-assistant`](../codebase-rag-assistant) — chunks source code
  by function/class instead of documents.

## Architecture

```
src/
  agent/
    searchTool.js   Tool schema for Claude + execute(query, topK), wraps retrieve()
    agentLoop.js    the tool-use loop: calls Claude, executes search_documents
                    calls as Claude requests them, loops until Claude stops
                    calling the tool (or a 5-iteration cap), returns
                    { answer, sources, trace }
  ingestion/        fixed-size chunking + pipeline — copied from rag-microservice
  retrieval/        query embedding + vector search — copied from rag-microservice
  embedding/        Voyage AI client — copied from rag-microservice
  shared/           vector store — copied from rag-microservice
```

## Next steps / upgrade paths

- **More tools**: give the agent a `list_documents` tool so it can decide to
  read a whole doc instead of only ever searching by similarity.
- **Parallel tool calls**: Claude can request multiple `search_documents`
  calls in a single turn (the loop already handles this — see the
  `toolUseBlocks` loop in `agentLoop.js`) but the sample queries here mostly
  exercise sequential multi-turn search. Try a question that needs 3+
  simultaneous searches to see parallel tool use in the trace.
- **Iteration cap tuning**: `MAX_ITERATIONS = 5` in `agentLoop.js` is a
  guardrail against infinite loops — lower it to see the "hit the search
  iteration limit" fallback path, or raise it for genuinely deep research
  questions.
- **Compare against Project 2's eval harness**: adapt `rag-microservice`'s
  `src/eval/` to score this project's answers too — faithfulness/relevance
  scoring works the same way regardless of how many searches produced the
  context.
