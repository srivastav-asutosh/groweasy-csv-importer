import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`GrowEasy CSV importer API listening on port ${env.port} (LLM provider: ${env.llmProvider})`);
});
