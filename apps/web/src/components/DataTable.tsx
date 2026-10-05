import { ReactNode, useEffect, useMemo, useState } from 'react';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  pagination?: {
    page: number;
    pageSize: number;
    totalRows: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  selectedRowKey?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  pagination,
  selectedRowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(initialPageSize);
  const page = pagination?.page ?? localPage;
  const pageSize = pagination?.pageSize ?? localPageSize;
  const totalRows = pagination?.totalRows ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const gridTemplateColumns = columns.map((column) => column.width || 'minmax(96px, 1fr)').join(' ');
  const isActionColumn = (column: DataTableColumn<T>) => ['accion', 'acciones', 'actions'].includes(column.key);
  const visibleRows = useMemo(() => {
    if (pagination) {
      return rows;
    }

    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, pagination, rows]);

  useEffect(() => {
    if (!pagination) {
      setLocalPage(1);
    }
  }, [pagination, rows.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      if (pagination) {
        pagination.onPageChange(totalPages);
      } else {
        setLocalPage(totalPages);
      }
    }
  }, [page, pagination, totalPages]);

  const cambiarPagina = (siguientePagina: number) => {
    if (pagination) {
      pagination.onPageChange(siguientePagina);
      return;
    }

    setLocalPage(siguientePagina);
  };

  const cambiarTamanoPagina = (siguienteTamano: number) => {
    if (pagination) {
      pagination.onPageSizeChange(siguienteTamano);
      return;
    }

    setLocalPageSize(siguienteTamano);
  };

  return (
    <div className="data-table">
      <div className="data-table-row data-table-head" style={{ gridTemplateColumns }}>
        {columns.map((column) => (
          <span className={column.align ? `align-${column.align}` : undefined} key={column.key}>{column.label}</span>
        ))}
      </div>

      {!totalRows && (
        <div className="empty-state">{emptyMessage}</div>
      )}

      {visibleRows.map((row) => (
        <div
          className={`data-table-row ${onRowClick ? 'clickable' : ''} ${selectedRowKey === getRowKey(row) ? 'selected' : ''}`.trim()}
          key={getRowKey(row)}
          style={{ gridTemplateColumns }}
          onClick={() => onRowClick?.(row)}
          role={onRowClick ? 'button' : undefined}
          tabIndex={onRowClick ? 0 : undefined}
          onKeyDown={(event) => {
            if (!onRowClick) {
              return;
            }

            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onRowClick(row);
            }
          }}
        >
          {columns.map((column, index) => (
            <div
              className={[
                'data-table-cell',
                isActionColumn(column) ? 'data-table-actions' : '',
                column.align ? `align-${column.align}` : '',
              ].filter(Boolean).join(' ')}
              key={column.key}
              data-column-index={index}
              data-label={column.label}
            >
              {column.render(row)}
            </div>
          ))}
        </div>
      ))}

      {totalRows > 0 && (
        <footer className="data-table-footer">
          <span>
            {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalRows)} de {totalRows}
          </span>
          <div className="data-table-controls">
            <label>
              Filas
              <select value={pageSize} onChange={(event) => cambiarTamanoPagina(Number(event.target.value))}>
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <button className="small" type="button" disabled={page === 1} onClick={() => cambiarPagina(Math.max(1, page - 1))}>
              Anterior
            </button>
            <span>Pagina {page} de {totalPages}</span>
            <button className="small" type="button" disabled={page === totalPages} onClick={() => cambiarPagina(Math.min(totalPages, page + 1))}>
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
