import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  onRowClick,
  emptyMessage = 'No data available',
  isLoading = false,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-slate-100 rounded mb-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-slate-50 rounded mb-1" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-slate-50'
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx('px-4 py-4 text-sm', column.className)}
                >
                  {column.render
                    ? column.render(item)
                    : (item[column.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
