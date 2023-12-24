import {
  CellContext,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { SearchField } from 'src/components/input/SearchField';
import { Amount } from 'src/components/numbers/Amount';
import { config } from 'src/config/config';

import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { cleanGroupName, isElected } from 'src/features/validators/utils';
import { useIsMobile } from 'src/styles/mediaQueries';
import { fromWeiRounded } from 'src/utils/amount';
import { bigIntMean } from 'src/utils/math';
import { ValidatorGroup, ValidatorGroupRow, ValidatorStatus } from './types';

const DESKTOP_ONLY_COLUMNS = ['votes', 'avgScore', 'numElected', 'cta'];
enum Filter {
  All = 'All',
  Elected = 'Elected',
  Unelected = 'Unelected',
}

export function ValidatorGroupTable({
  totalVotes,
  groups,
}: {
  totalVotes: bigint;
  groups: ValidatorGroup[];
}) {
  const [filter, setFilter] = useState<Filter>(Filter.All);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [columnVisibility, setColumnVisibility] = useState({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'votes', desc: true }]);

  const columns = useTableColumns(totalVotes);
  const groupRows = useTableRows({ groups, filter, searchQuery });
  const table = useReactTable<ValidatorGroupRow>({
    data: groupRows,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: config.debug,
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
    <>
      <div className="flex flex-col items-center justify-stretch gap-4 px-4 pt-2 md:flex-row md:justify-between">
        <div className="flex justify-between space-x-7 md:space-x-5">
          <FilterButton
            filter={Filter.All}
            setFilter={setFilter}
            groups={groups}
            isActive={filter === Filter.All}
          />
          <FilterButton
            filter={Filter.Elected}
            setFilter={setFilter}
            groups={groups}
            isActive={filter === Filter.Elected}
          />
          <FilterButton
            filter={Filter.Unelected}
            setFilter={setFilter}
            groups={groups}
            isActive={filter === Filter.Unelected}
          />
        </div>
        <SearchField
          value={searchQuery}
          setValue={setSearchQuery}
          className="w-full text-sm md:w-64"
        />
      </div>
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-y border-taupe-300 px-4 py-3 first:min-w-[3rem] last:min-w-0 md:min-w-[8rem]"
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={clsx(
                        'text-left font-normal',
                        header.column.getCanSort() && 'cursor-pointer select-none',
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="relative border-y border-taupe-300 px-4 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function useTableColumns(totalVotes: bigint) {
  return useMemo(() => {
    const columnHelper = createColumnHelper<ValidatorGroupRow>();
    return [
      columnHelper.display({
        id: 'index',
        header: '#',
        cell: (props) => <div>{getRowSortedIndex(props)}</div>,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (props) => (
          <div className="flex items-center space-x-2">
            <ValidatorGroupLogo address={props.row.original.address} size={30} />
            <span>{cleanGroupName(props.getValue())}</span>
          </div>
        ),
      }),
      columnHelper.accessor('votes', {
        header: 'Total Staked',
        cell: (props) => (
          <Amount
            valueWei={props.getValue()}
            showSymbol={false}
            decimals={0}
            className="all:font-sans"
          />
        ),
      }),
      columnHelper.display({
        id: 'cumulativeShare',
        header: 'Cumulative Share',
        cell: (props) => <CumulativeColumn rowProps={props} totalVotes={totalVotes} />,
      }),
      columnHelper.accessor('avgScore', {
        header: 'Score',
        cell: (props) => <div>{`${props.getValue()}%`}</div>,
      }),
      columnHelper.accessor('numElected', {
        header: 'Elected',
        cell: (props) => <div>{`${props.getValue()} / ${props.row.original.numMembers}`}</div>,
      }),
      columnHelper.display({
        id: 'cta',
        header: '',
        cell: (props) => (
          <OutlineButton onClick={() => alert(props.row.original.address)}>
            <div className="flex items-center space-x-1.5">
              <span>Stake</span>
              <ChevronIcon direction="e" width={10} height={10} />
            </div>
          </OutlineButton>
        ),
      }),
    ];
  }, [totalVotes]);
}

function useTableRows({
  groups,
  filter,
  searchQuery,
}: {
  groups: ValidatorGroup[];
  filter: Filter;
  searchQuery: string;
}) {
  return useMemo<ValidatorGroupRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredGroups = groups
      .filter((g) => {
        if (filter === Filter.Elected) return isElected(g);
        else if (filter === Filter.Unelected) return !isElected(g);
        else return true;
      })
      .filter(
        (g) =>
          !g ||
          g.name.toLowerCase().includes(query) ||
          g.address.toLowerCase().includes(query) ||
          Object.values(g.members).some(
            (m) => m.address.toLowerCase().includes(query) || m.name.toLowerCase().includes(query),
          ),
      );

    const groupRows = filteredGroups.map((g): ValidatorGroupRow => {
      const members = Object.values(g.members);
      const electedMembers = members.filter((m) => m.status === ValidatorStatus.Elected);
      const avgScore = electedMembers.length
        ? BigInt(fromWeiRounded(bigIntMean(electedMembers.map((m) => m.score)), 22, 0))
        : 0n;
      return {
        ...g,
        numMembers: members.length,
        numElected: electedMembers.length,
        avgScore,
      };
    });
    return groupRows;
  }, [groups, filter, searchQuery]);
}

function FilterButton({
  filter,
  setFilter,
  groups,
  isActive,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  groups: ValidatorGroup[];
  isActive: boolean;
}) {
  const [hover, setHover] = useState(false);
  let count = groups.length;
  if (filter === Filter.Elected) count = groups.filter((g) => isElected(g)).length;
  else if (filter === Filter.Unelected) count = groups.filter((g) => !isElected(g)).length;
  return (
    <button
      className="relative flex items-center space-x-1 transition-all"
      onClick={() => setFilter(filter)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>{filter}</span>
      <div
        className={clsx(
          'w-10 rounded-full border border-purple-500 text-sm font-thin',
          (hover || isActive) && 'bg-purple-500 text-white',
        )}
      >
        {count}
      </div>
      {isActive && (
        <span className="absolute -bottom-4 left-0 right-0 hidden h-[2px] bg-purple-500 md:block"></span>
      )}
    </button>
  );
}

function CumulativeColumn({
  rowProps,
  totalVotes,
}: {
  rowProps: CellContext<ValidatorGroupRow, unknown>;
  totalVotes: bigint;
}) {
  const sharePercentage = computeCumulativeShare(
    rowProps.table.getSortedRowModel().rows.map((r) => r.original),
    rowProps.row.original.address,
    totalVotes,
  );

  const isMobile = useIsMobile();
  const maxChartWidth = isMobile ? 40 : 60;
  const width = (sharePercentage / 100) * maxChartWidth;

  const percentageString = BigNumber(sharePercentage).toFixed(2) + '%';
  return (
    <div className="flex">
      <div>{percentageString}</div>
      <div
        style={{ width: `${width}px` }}
        className="absolute bottom-0 top-0 ml-20 border-x border-purple-200 bg-purple-200/20"
      ></div>
    </div>
  );
}

function computeCumulativeShare(
  groups: ValidatorGroupRow[],
  groupAddr: Address,
  totalVotes: bigint,
) {
  if (!groups?.length || !groupAddr || !totalVotes) return 0;
  const index = groups.findIndex((g) => g.address === groupAddr);
  const sum = groups.slice(0, index + 1).reduce((acc, group) => acc + group.votes, 0n);
  return BigNumber(sum.toString())
    .dividedBy(totalVotes.toString())
    .times(100)
    .decimalPlaces(2)
    .toNumber();
}

function getRowSortedIndex(rowProps: CellContext<ValidatorGroupRow, unknown>) {
  const sortedRows = rowProps.table.getSortedRowModel().rows;
  return sortedRows.findIndex((r) => r.id === rowProps.row.id) + 1;
}
