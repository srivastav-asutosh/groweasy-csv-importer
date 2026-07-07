import type { ImportStreamEvent } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ImportRequestError extends Error {}

/** Uploads the CSV file and streams back NDJSON progress/result events as the
 * backend emits them, so the UI can render live progress instead of blocking
 * on one long request. */
export async function streamImport(
  file: File,
  onEvent: (event: ImportStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/import`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Import request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ImportRequestError(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      onEvent(JSON.parse(trimmed) as ImportStreamEvent);
    }
  }

  const trimmed = buffer.trim();
  if (trimmed) {
    onEvent(JSON.parse(trimmed) as ImportStreamEvent);
  }
}
