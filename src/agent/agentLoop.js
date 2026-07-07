// The agentic tool-use loop: Claude gets search_documents and list_documents
// and decides for itself which tool (if any) to call, how many times, and
// with what input. Contrast with rag-microservice's generator.js, which
// always does exactly one fixed retrieve() before generating.

import Anthropic from "@anthropic-ai/sdk";
import { searchToolDef, executeSearchTool } from "./searchTool.js";
import { listDocumentsToolDef, executeListDocumentsTool } from "./listDocumentsTool.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `You answer questions using two tools:
- search_documents: find relevant passages for a specific topic or question. Use it as many times as you need — for questions that span multiple topics, search once per topic.
- list_documents: list what documents are available, with chunk counts. Use this instead of search_documents when the user is asking what's available rather than asking about specific content.

Only answer from what the tools return; if they don't cover the question, say so instead of guessing.
Cite sources by filename when you use them.`;

const TOOL_EXECUTORS = {
  search_documents: executeSearchTool,
  list_documents: executeListDocumentsTool,
};

function textFrom(content) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function runAgent(query) {
  const messages = [{ role: "user", content: query }];
  const trace = [];
  const sourcesSeen = new Set();

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [searchToolDef, listDocumentsToolDef],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return { answer: textFrom(response.content), sources: [...sourcesSeen], trace };
    }

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    const toolResults = [];

    for (const block of toolUseBlocks) {
      const execute = TOOL_EXECUTORS[block.name];
      const result = await execute(block.input);

      if (block.name === "search_documents") {
        result.forEach((r) => sourcesSeen.add(r.source));
        trace.push({ tool: block.name, query: block.input.query, resultCount: result.length });
      } else {
        result.forEach((r) => sourcesSeen.add(r.source));
        trace.push({ tool: block.name, resultCount: result.length });
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    answer: "Hit the search iteration limit before reaching a final answer. Try a more specific question.",
    sources: [...sourcesSeen],
    trace,
  };
}
