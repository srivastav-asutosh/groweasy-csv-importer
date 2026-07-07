import "dotenv/config";

function optionalInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  port: optionalInt(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  llmProvider: (process.env.LLM_PROVIDER ?? "mock").toLowerCase(),
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  batchSize: optionalInt(process.env.BATCH_SIZE, 20),
  batchConcurrency: optionalInt(process.env.BATCH_CONCURRENCY, 3),
  maxRetries: optionalInt(process.env.MAX_RETRIES, 3),
  maxUploadSizeMb: optionalInt(process.env.MAX_UPLOAD_SIZE_MB, 15),
};
