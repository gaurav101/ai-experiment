import OpenAI from "openai";
import { formatContext, search } from "../rag.js";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const question = process.argv.slice(2).join(" ") || "What plans support SSO?";
const results = await search(question);
const context = formatContext(results);
const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL,
    input: `Answer using only the context below. If the answer is missing, say you do not know.

Context:
${context}

Question:
${question}`
});

console.log(response.output_text);
