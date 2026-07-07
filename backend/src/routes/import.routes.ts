import { Router } from "express";
import { csvUpload } from "../middleware/upload.middleware.js";
import { parseCsvBuffer } from "../services/csv/parseCsv.js";
import { extractCrmRecords } from "../services/extraction/extraction.service.js";
import { getLlmProvider } from "../services/llm/index.js";
import { env } from "../config/env.js";
import type { ImportStreamEvent } from "../types/crm.js";

export const importRouter = Router();

function writeEvent(res: import("express").Response, event: ImportStreamEvent) {
  res.write(`${JSON.stringify(event)}\n`);
}

/**
 * POST /api/import
 * Accepts a multipart/form-data upload with field name "file", parses it,
 * runs AI extraction, and streams progress as newline-delimited JSON (NDJSON)
 * so the frontend can render a live progress indicator instead of blocking on
 * one long request.
 */
importRouter.post("/import", csvUpload.single("file"), async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Attach a CSV file under field name 'file'." });
    return;
  }

  let rows;
  try {
    rows = parseCsvBuffer(req.file.buffer);
  } catch (err) {
    next(err);
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });

  try {
    const provider = getLlmProvider();
    const totalBatches = Math.ceil(rows.length / env.batchSize);
    writeEvent(res, { type: "start", totalRows: rows.length, totalBatches });

    const result = await extractCrmRecords(rows, provider, {
      onProgress: (progress) => writeEvent(res, { type: "progress", ...progress }),
    });

    writeEvent(res, { type: "result", result });
  } catch (err) {
    writeEvent(res, { type: "error", message: (err as Error).message });
  } finally {
    res.end();
  }
});
