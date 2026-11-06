import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

export function ResponsiveDataTable<T extends { id: string | number }>({
  ariaLabel,
  columns,
  rows,
}: {
  ariaLabel: string;
  columns: DataTableColumn<T>[];
  rows: T[];
}) {
  return (
    <div className="table-responsive responsive-data-table">
      <table className="table align-middle mb-0">
        <caption className="visually-hidden">{ariaLabel}</caption>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => <td data-label={column.label} key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
