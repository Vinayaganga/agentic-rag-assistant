// Same familiar route shape as the sibling projects, but /ask now runs the
// agent loop (runAgent) instead of a fixed single-shot retrieve-then-generate.

import "dotenv/config";
import express from "express";
import { ingestDocuments } from "./ingestion/pipeline.js";
import { retrieve } from "./retrieval/retriever.js";
import { runAgent } from "./agent/agentLoop.js";
import { storeSize, clearStore } from "./shared/vectorStore.js";

const REQUIRED_ENV_VARS = ["ANTHROPIC_API_KEY", "VOYAGE_API_KEY"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  console.error("Copy .env.example to .env and fill them in before starting the server.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/ingest", async (req, res) => {
  try {
    const { documents } = req.body;
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: "Provide a non-empty 'documents' array." });
    }
    const results = await ingestDocuments(documents);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Direct retrieval, bypassing the agent — useful for debugging chunk quality.
app.get("/retrieve", async (req, res) => {
  try {
    const { query, topK } = req.query;
    if (!query) return res.status(400).json({ error: "Missing 'query' param." });
    const results = await retrieve(query, topK ? Number(topK) : undefined);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// The agentic endpoint: Claude decides whether/how many times to search.
app.post("/ask", async (req, res) => {
  const start = Date.now();
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing 'query' in body." });
    const result = await runAgent(query);
    res.json({ ...result, latencyMs: Date.now() - start });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", chunksInStore: storeSize() });
});

app.delete("/store", (req, res) => {
  clearStore();
  res.json({ status: "cleared" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Agentic RAG assistant listening on http://localhost:${PORT}`);
});
