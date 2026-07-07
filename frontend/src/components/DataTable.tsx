"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: number;
  render: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  maxHeightPx?: number;
  emptyMessage?: string;
  className?: string;
}

const DEFAULT_COLUMN_WIDTH = 180;
const ROW_HEIGHT = 44;

/**
 * Responsive, sticky-header, virtualized data table. Renders rows as
 * absolutely-positioned flex rows (rather than a native <table>) so only the
 * rows currently in the viewport are mounted — this keeps large CSVs
 * (thousands of rows) smooth to scroll both horizontally and vertically.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  maxHeightPx = 440,
  emptyMessage = "No rows to display.",
  className,
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const totalWidth = columns.reduce((sum, col) => sum + (col.width ?? DEFAULT_COLUMN_WIDTH), 0);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 p-10 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      role="table"
      aria-rowcount={rows.length}
      className={cn(
        "themed-scroll relative overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800",
        className
      )}
      style={{ maxHeight: maxHeightPx }}
    >
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        <div
          role="row"
          className="sticky top-0 z-10 flex border-b border-zinc-200 bg-zinc-100/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95"
        >
          {columns.map((col) => (
            <div
              key={col.key}
              role="columnheader"
              style={{ width: col.width ?? DEFAULT_COLUMN_WIDTH, flexShrink: 0 }}
              className="truncate px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
              title={col.header}
            >
              {col.header}
            </div>
          ))}
        </div>

        <div role="rowgroup" style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={rowKey(row, virtualRow.index)}
                role="row"
                data-index={virtualRow.index}
                className={cn(
                  "absolute left-0 top-0 flex w-full items-center border-b border-zinc-100 text-sm dark:border-zinc-800/60",
                  virtualRow.index % 2 === 0 ? "bg-transparent" : "bg-zinc-50/60 dark:bg-zinc-900/40"
                )}
                style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    role="cell"
                    style={{ width: col.width ?? DEFAULT_COLUMN_WIDTH, flexShrink: 0 }}
                    className="truncate px-3 py-2 text-zinc-700 dark:text-zinc-300"
                  >
                    {col.render(row, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
