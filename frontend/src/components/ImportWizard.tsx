"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Stepper } from "./Stepper";
import { UploadDropzone } from "./UploadDropzone";
import { PreviewStep } from "./PreviewStep";
import { ProcessingStep } from "./ProcessingStep";
import { ResultsStep } from "./ResultsStep";
import { parseCsvFile, CsvParseError, type ParsedCsv } from "@/lib/csv";
import { streamImport, ImportRequestError } from "@/lib/api";
import type { ImportResult } from "@/lib/types";

type Stage = "upload" | "preview" | "processing" | "results";

interface ProgressState {
  totalRows: number | null;
  rowsProcessed: number;
  totalBatches: number | null;
  batchesCompleted: number;
}

const INITIAL_PROGRESS: ProgressState = {
  totalRows: null,
  rowsProcessed: 0,
  totalBatches: null,
  batchesCompleted: 0,
};

export function ImportWizard() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("upload");
    setFile(null);
    setParsed(null);
    setResult(null);
    setProgress(INITIAL_PROGRESS);
    setError(null);
  }, []);

  const handleFileSelected = useCallback(async (selected: File) => {
    setError(null);
    try {
      const parsedCsv = await parseCsvFile(selected);
      setFile(selected);
      setParsed(parsedCsv);
      setStage("preview");
    } catch (err) {
      setError(err instanceof CsvParseError ? err.message : "Could not read that file.");
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setError(null);
    setProgress(INITIAL_PROGRESS);
    setStage("processing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamImport(
        file,
        (event) => {
          if (event.type === "start") {
            setProgress((p) => ({ ...p, totalRows: event.totalRows, totalBatches: event.totalBatches }));
          } else if (event.type === "progress") {
            setProgress({
              totalRows: event.totalRows,
              rowsProcessed: event.rowsProcessed,
              totalBatches: event.totalBatches,
              batchesCompleted: event.batchesCompleted,
            });
          } else if (event.type === "result") {
            setResult(event.result);
            setStage("results");
          } else if (event.type === "error") {
            setError(event.message);
            setStage("preview");
          }
        },
        controller.signal
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof ImportRequestError ? err.message : "Something went wrong while importing.");
      setStage("preview");
    }
  }, [file]);

  const currentStepNumber = { upload: 1, preview: 2, processing: 3, results: 4 }[stage];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Stepper currentStep={currentStepNumber} />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
        {stage === "upload" && <UploadDropzone onFileSelected={handleFileSelected} />}

        {stage === "preview" && file && parsed && (
          <PreviewStep file={file} parsed={parsed} onBack={reset} onConfirm={handleConfirm} />
        )}

        {stage === "processing" && (
          <ProcessingStep
            totalRows={progress.totalRows}
            rowsProcessed={progress.rowsProcessed}
            totalBatches={progress.totalBatches}
            batchesCompleted={progress.batchesCompleted}
          />
        )}

        {stage === "results" && result && <ResultsStep result={result} onStartOver={reset} />}
      </div>
    </div>
  );
}
