import type { ErrorRequestHandler } from "express";
import { CsvParseError } from "../services/csv/parseCsv.js";
import { MulterError } from "multer";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) {
    // A streaming response had already started writing NDJSON chunks; nothing
    // more we can do but end the connection.
    res.end();
    return;
  }

  if (err instanceof CsvParseError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  if (err instanceof Error && /only \.csv files/i.test(err.message)) {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error." });
};
