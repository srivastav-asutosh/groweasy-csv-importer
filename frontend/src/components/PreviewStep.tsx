import { DataTable, type DataTableColumn } from "./DataTable";
import type { ParsedCsv } from "@/lib/csv";
import { formatBytes } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PreviewStepProps {
  file: File;
  parsed: ParsedCsv;
  onBack: () => void;
  onConfirm: () => void;
}

export function PreviewStep({ file, parsed, onBack, onConfirm }: PreviewStepProps) {
  const columns: DataTableColumn<Record<string, string>>[] = parsed.headers.map((header) => ({
    key: header,
    header,
    render: (row) => row[header] ?? "",
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Preview</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {file.name} · {formatBytes(file.size)} · {parsed.rows.length} row
            {parsed.rows.length === 1 ? "" : "s"} · {parsed.headers.length} column
            {parsed.headers.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
        No AI processing has happened yet. Review the parsed rows below, then confirm to run AI extraction.
      </p>

      <DataTable
        columns={columns}
        rows={parsed.rows}
        rowKey={(_row, index) => index}
        maxHeightPx={440}
      />

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ArrowLeft size={16} /> Choose a different file
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Confirm import <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
