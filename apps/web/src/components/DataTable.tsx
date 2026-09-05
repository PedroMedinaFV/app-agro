import { ReactNode, useEffect, useMemo, useState } from 'react';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  width?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const gridTemplateColumns = columns.map((column) => column.width || 'minmax(96px, 1fr)').join(' ');
  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="data-table">
      <div className="data-table-row data-table-head" style={{ gridTemplateColumns }}>
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>

      {!rows.length && (
        <div className="empty-state">{emptyMessage}</div>
      )}

      {visibleRows.map((row) => (
        <div className="data-table-row" key={getRowKey(row)} style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div className="data-table-cell" key={column.key}>
              {column.render(row)}
            </div>
          ))}
        </div>
      ))}

      {rows.length > 0 && (
        <footer className="data-table-footer">
          <span>
            {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, rows.length)} de {rows.length}
          </span>
          <div className="data-table-controls">
            <label>
              Filas
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <button className="small" type="button" disabled={page === 1} onClick={() => setPage((actual) => Math.max(1, actual - 1))}>
              Anterior
            </button>
            <span>Pagina {page} de {totalPages}</span>
            <button className="small" type="button" disabled={page === totalPages} onClick={() => setPage((actual) => Math.min(totalPages, actual + 1))}>
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
