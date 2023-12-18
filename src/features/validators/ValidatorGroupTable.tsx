import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { config } from 'src/config/config';
import { ValidatorGroup } from './types';

export function ValidatorGroupTable({ groups }: { groups: ValidatorGroup[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ValidatorGroup>();
    return [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (props) => <span>{props.getValue().toUpperCase()}</span>,
      }),
      columnHelper.accessor('address', {
        header: 'Status',
      }),
      columnHelper.display({
        id: 'cumulativeShare',
        cell: () => <div className="bg-purple w-2"></div>,
      }),
    ];
  }, []);

  const table = useReactTable<ValidatorGroup>({
    data: groups,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: config.debug,
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
