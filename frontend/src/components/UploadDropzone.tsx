"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        setRejectionError(rejections[0].errors[0]?.message ?? "That file can't be used.");
        return;
      }
      setRejectionError(null);
      if (accepted[0]) onFileSelected(accepted[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "text/csv": [".csv"] },
    maxSize: 15 * 1024 * 1024,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          isDragActive
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
            : "border-zinc-300 bg-white hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-500 dark:hover:bg-zinc-800/50"
        )}
      >
        <input {...getInputProps()} aria-label="Upload CSV file" />
        <UploadCloud className="text-indigo-500" size={40} strokeWidth={1.5} />
        <div>
          <p className="font-medium text-zinc-800 dark:text-zinc-100">
            {isDragActive ? "Drop the CSV file here" : "Drag & drop a CSV file here"}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            or click to browse — up to 15MB, .csv only
          </p>
        </div>
      </div>

      {rejectionError && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <FileWarning size={16} /> {rejectionError}
        </p>
      )}
    </div>
  );
}
