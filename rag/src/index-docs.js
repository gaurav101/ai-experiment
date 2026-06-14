import { buildIndex } from "./rag.js";

const count = await buildIndex();
console.log(`Indexed ${count} chunks.`);
