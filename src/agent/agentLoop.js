// The agentic tool-use loop: Claude gets the search_documents tool and
// decides for itself whether/how many times to call it before answering.
// Contrast with rag-microservice's generator.js, which always does exactly
// one fixed retrieve() before generating.

import Anthropic from "@anthropic-ai/sdk";
import { searchToolDef, executeSearchTool } from "./searchTool.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `You answer questions using the search_documents tool to find relevant passages.
Use the tool as many times as you need — for questions that span multiple topics, search once per topic.
Only answer from what search_documents returns; if it doesn't cover the question, say so instead of guessing.
Cite sources by filename when you use them.`;

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
      tools: [searchToolDef],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return { answer: textFrom(response.content), sources: [...sourcesSeen], trace };
    }

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    const toolResults = [];

    for (const block of toolUseBlocks) {
      const result = await executeSearchTool(block.input);
      result.forEach((r) => sourcesSeen.add(r.source));
      trace.push({ query: block.input.query, resultCount: result.length });
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
