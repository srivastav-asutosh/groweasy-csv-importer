import { Loader2 } from "lucide-react";

interface ProcessingStepProps {
  totalRows: number | null;
  rowsProcessed: number;
  totalBatches: number | null;
  batchesCompleted: number;
}

export function ProcessingStep({ totalRows, rowsProcessed, totalBatches, batchesCompleted }: ProcessingStepProps) {
  const percent = totalRows ? Math.min(100, Math.round((rowsProcessed / totalRows) * 100)) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Extracting CRM records with AI…
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {totalRows
            ? `Processed ${rowsProcessed} of ${totalRows} rows${
                totalBatches ? ` · batch ${batchesCompleted}/${totalBatches}` : ""
              }`
            : "Uploading and parsing your file…"}
        </p>
      </div>

      <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{percent}%</p>
    </div>
  );
}
