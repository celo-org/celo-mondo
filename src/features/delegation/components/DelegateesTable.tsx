'use client';

import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { TableSortChevron } from 'src/components/icons/TableSortChevron';
import { SearchField } from 'src/components/input/SearchField';
import { SocialLogoLink } from 'src/components/logos/SocialLogo';
import { formatNumberString } from 'src/components/numbers/Amount';
import { SocialLinkType } from 'src/config/types';
import { DelegateeLogoAndName } from 'src/features/delegation/components/DelegateeLogo';
import { Delegatee } from 'src/features/delegation/types';
import { useIsMobile } from 'src/styles/mediaQueries';

const DESKTOP_ONLY_COLUMNS = ['interests', 'links'];

export function DelegateesTable({ delegatees }: { delegatees: Delegatee[] }) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [columnVisibility, setColumnVisibility] = useState({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'delegatedBalance', desc: true }]);
  const onSortingChange = (s: SortingState | ((prev: SortingState) => SortingState)) => {
    setSorting(s);
  };

  const columns = useTableColumns();
  const rows = useTableRows({ delegatees, searchQuery });
  const table = useReactTable<Delegatee>({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Set up responsive column visibility
  const isMobile = useIsMobile();
  useEffect(() => {
    if (isMobile) {
      DESKTOP_ONLY_COLUMNS.forEach((c) => table.getColumn(c)?.toggleVisibility(false));
    } else {
      DESKTOP_ONLY_COLUMNS.forEach((c) => table.getColumn(c)?.toggleVisibility(true));
    }
  }, [isMobile, table]);

  return (
    <div>
      <div className="flex justify-between">
        <TabHeaderButton isActive={true} count={rows.length}>
          Delegates
        </TabHeaderButton>
        <SearchField
          value={searchQuery}
          setValue={setSearchQuery}
          placeholder="Search delegates"
          className="w-full text-sm md:w-64"
        />
      </div>
      <table className="mt-2 w-full lg:min-w-[62rem] xl:min-w-[75rem]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className={classNames.th}>
                  <div
                    className={clsx(
                      'relative text-left font-normal',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: <TableSortChevron direction="n" />,
                      desc: <TableSortChevron direction="s" />,
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={classNames.tr}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={classNames.td}>
                  <Link href={`/delegate/${row.original.address}`} className="flex px-4 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Link>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="flex justify-center py-10">
          <p className="text-center text-taupe-600">No delegates found</p>
        </div>
      )}
    </div>
  );
}

function useTableColumns() {
  return useMemo(() => {
    const columnHelper = createColumnHelper<Delegatee>();
    return [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (props) => (
          <DelegateeLogoAndName
            address={props.row.original.address}
            size={34}
            name={props.getValue()}
          />
        ),
      }),
      columnHelper.accessor('interests', {
        header: 'Interests',
        cell: (props) => (
          <div className="flex flex-wrap space-x-2">
            {props.getValue().map((interest, i) => (
              <span key={i} className="rounded-full border border-taupe-300 px-2 text-sm">
                {interest}
              </span>
            ))}
          </div>
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('links', {
        header: 'Social',
        cell: (props) => (
          <div className="flex space-x-3">
            {Object.entries(props.getValue()).map(([type, href], i) => (
              <SocialLogoLink key={i} type={type as SocialLinkType} href={href} />
            ))}
          </div>
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('delegatedBalance', {
        header: 'Delegated',
        cell: (props) => <div>{formatNumberString(props.getValue(), 0, true) + ' CELO'}</div>,
      }),
    ];
  }, []);
}

function useTableRows({
  delegatees,
  searchQuery,
}: {
  delegatees?: Delegatee[];
  searchQuery: string;
}) {
  return useMemo<Delegatee[]>(() => {
    if (!delegatees?.length) return [];
    const query = searchQuery.trim().toLowerCase();
    return delegatees.filter(
      (d) =>
        !query ||
        d.name.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query),
    );
  }, [delegatees, searchQuery]);
}

const classNames = {
  tr: 'cursor-pointer transition-all hover:bg-purple-50 active:bg-purple-100',
  th: 'border-y border-taupe-300 px-4 py-3  last:pr-3 md:min-w-[8rem]',
  td: 'relative border-y border-taupe-300 text-nowrap',
  tdTopGroups: 'relative border-y border-taupe-300 px-4 py-4 text-nowrap',
  tdDesktopOnly: 'hidden md:table-cell',
};
