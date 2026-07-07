// Usage: node src/ingestion/cli.js ./docs
// Ingests every .txt/.md file in the given folder into the vector store.

import "dotenv/config";
import fs from "fs";
import path from "path";
import { ingestDocuments } from "./pipeline.js";

const targetDir = process.argv[2];

if (!targetDir) {
  console.error("Usage: node src/ingestion/cli.js <folder>");
  process.exit(1);
}

const files = fs
  .readdirSync(targetDir)
  .filter((f) => f.endsWith(".txt") || f.endsWith(".md"));

if (files.length === 0) {
  console.error(`No .txt or .md files found in ${targetDir}`);
  process.exit(1);
}

const docs = files.map((file) => {
  const fullPath = path.join(targetDir, file);
  return {
    id: file,
    source: file,
    text: fs.readFileSync(fullPath, "utf-8"),
  };
});

console.log(`Ingesting ${docs.length} file(s)...`);
const results = await ingestDocuments(docs);
results.forEach((r) => console.log(`  ${r.source}: ${r.chunksIngested} chunks`));
console.log("Done.");
