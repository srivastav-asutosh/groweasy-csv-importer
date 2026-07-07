"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { CRM_FIELD_ORDER, type CrmRecord, type ImportResult, type SkippedRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResultsStepProps {
  result: ImportResult;
  onStartOver: () => void;
}

const FIELD_LABELS: Record<keyof CrmRecord, string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Country Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Data Source",
  possession_time: "Possession Time",
  description: "Description",
};

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  DID_NOT_CONNECT: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  BAD_LEAD: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  SALE_DONE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
};

function StatCard({ label, value, tone }: { label: string; value: number; tone: "total" | "good" | "bad" }) {
  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "bad" && "text-red-600 dark:text-red-400",
          tone === "total" && "text-zinc-900 dark:text-zinc-50"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ResultsStep({ result, onStartOver }: ResultsStepProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const importedColumns: DataTableColumn<CrmRecord>[] = CRM_FIELD_ORDER.map((field) => ({
    key: field,
    header: FIELD_LABELS[field],
    width: field === "crm_note" || field === "description" ? 260 : 160,
    render: (row) => {
      const value = row[field];
      if (field === "crm_status" && value) {
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[value])}>
            {value}
          </span>
        );
      }
      return value || <span className="text-zinc-400 dark:text-zinc-600">—</span>;
    },
  }));

  const skippedColumns: DataTableColumn<SkippedRecord>[] = [
    { key: "rowIndex", header: "Row #", width: 90, render: (row) => row.rowIndex + 1 },
    { key: "reason", header: "Reason", width: 340, render: (row) => row.reason },
    {
      key: "raw",
      header: "Raw Row Data",
      width: 480,
      render: (row) => JSON.stringify(row.raw),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Import complete</h2>
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <RotateCcw size={16} /> Import another file
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <StatCard label="Total Rows" value={result.totalRows} tone="total" />
        <StatCard label="Imported" value={result.imported} tone="good" />
        <StatCard label="Skipped" value={result.skipped} tone="bad" />
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("imported")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === "imported"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          <CheckCircle2 size={16} /> Successful ({result.imported})
        </button>
        <button
          type="button"
          onClick={() => setTab("skipped")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === "skipped"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          <XCircle size={16} /> Skipped ({result.skipped})
        </button>
      </div>

      {tab === "imported" ? (
        <DataTable
          columns={importedColumns}
          rows={result.records}
          rowKey={(_row, index) => index}
          emptyMessage="No records were successfully imported."
        />
      ) : (
        <DataTable
          columns={skippedColumns}
          rows={result.skippedRecords}
          rowKey={(row) => row.rowIndex}
          emptyMessage="No rows were skipped."
        />
      )}
    </div>
  );
}
