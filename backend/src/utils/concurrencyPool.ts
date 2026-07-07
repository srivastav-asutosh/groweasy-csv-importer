/** Runs `tasks` with at most `concurrency` running at once, invoking `onSettled`
 * as each individual task finishes (success or failure) so callers can stream
 * progress rather than waiting for the whole batch to complete. */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  onSettled?: (index: number, result: { ok: true; value: T } | { ok: false; error: unknown }) => void
): Promise<Array<{ ok: true; value: T } | { ok: false; error: unknown }>> {
  const results: Array<{ ok: true; value: T } | { ok: false; error: unknown }> = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const current = nextIndex++;
      try {
        const value = await tasks[current]();
        results[current] = { ok: true, value };
        onSettled?.(current, results[current]);
      } catch (error) {
        results[current] = { ok: false, error };
        onSettled?.(current, results[current]);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
