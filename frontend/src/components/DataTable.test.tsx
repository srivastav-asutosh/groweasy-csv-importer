import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Row {
  id: number;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: "id", header: "ID", width: 80, render: (row) => row.id },
  { key: "name", header: "Name", width: 200, render: (row) => row.name },
];

// jsdom doesn't perform real layout, so @tanstack/react-virtual sees a 0px
// viewport by default. Give the scroll container a real size so virtualized
// rows actually mount for these assertions.
beforeEach(() => {
  // @tanstack/react-virtual measures the scroll container via offsetWidth/
  // offsetHeight, which jsdom always reports as 0 (no real layout engine).
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 800,
  });
});

afterEach(() => {
  // @ts-expect-error -- restore is not typed on the prototype descriptor
  delete HTMLElement.prototype.offsetHeight;
  // @ts-expect-error -- restore is not typed on the prototype descriptor
  delete HTMLElement.prototype.offsetWidth;
});

describe("DataTable", () => {
  it("renders the empty state when there are no rows", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} emptyMessage="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders column headers and visible row data", () => {
    const rows: Row[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
