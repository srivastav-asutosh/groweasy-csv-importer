export interface RetryOptions {
  retries: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries an async operation with exponential backoff. Throws the last error once retries are exhausted. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelayMs = 500, onRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      onRetry?.(attempt + 1, err);
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
