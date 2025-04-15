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
import { ChevronIcon } from 'src/components/icons/Chevron';
import { SearchField } from 'src/components/input/SearchField';
import { Amount } from 'src/components/numbers/Amount';

import Link from 'next/link';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderFilters } from 'src/components/buttons/TabHeaderButton';
import { Circle } from 'src/components/icons/Circle';
import { TableSortChevron } from 'src/components/icons/TableSortChevron';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup, ValidatorGroupRow } from 'src/features/validators/types';
import { cleanGroupName, getGroupStats, isElected } from 'src/features/validators/utils';
import { useIsMobile } from 'src/styles/mediaQueries';
import { bigIntSum, mean, sum } from 'src/utils/math';

const NUM_COLLAPSED_GROUPS = 9;
const DESKTOP_ONLY_COLUMNS = ['votes', 'avgScore', 'numElected', 'cta'];
enum Filter {
  All = 'All Eligible',
  Elected = 'Elected',
  Unelected = 'Unelected',
  Ineligible = 'Ineligible',
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
  const [isTopGroupsExpanded, setIsTopGroupsExpanded] = useState<boolean>(false);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'votes', desc: true }]);
  const onSortingChange = (s: SortingState | ((prev: SortingState) => SortingState)) => {
    setIsTopGroupsExpanded(true);
    setSorting(s);
  };

  const collapseTopGroups =
    !isTopGroupsExpanded &&
    groups.length > NUM_COLLAPSED_GROUPS &&
    !searchQuery &&
    filter === Filter.All;

  const columns = useTableColumns(totalVotes);
  const groupRows = useTableRows({ groups, filter, searchQuery, collapseTopGroups });
  const table = useReactTable<ValidatorGroupRow>({
    data: groupRows,
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

  const headerCounts = useMemo<Record<Filter, number>>(() => {
    return {
      [Filter.All]: groups.filter((g) => g.eligible).length,
      [Filter.Elected]: groups.filter((g) => isElected(g)).length,
      [Filter.Unelected]: groups.filter((g) => !isElected(g)).length,
      [Filter.Ineligible]: groups.filter((g) => !g.eligible).length,
    };
  }, [groups]);

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
      <div className="flex flex-col items-stretch gap-4 px-4 md:flex-row md:items-end md:justify-between">
        <TabHeaderFilters activeFilter={filter} setFilter={setFilter} counts={headerCounts} />
        <SearchField
          value={searchQuery}
          setValue={setSearchQuery}
          placeholder="Search by name or address"
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
          <TopGroupsRow
            groups={groups}
            totalVotes={totalVotes}
            isVisible={collapseTopGroups}
            expand={() => setIsTopGroupsExpanded(true)}
          />
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={clsx(classNames.tr, row.original.isHidden && 'hidden')}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={classNames.td}>
                  <Link href={`/staking/${row.original.address}`} className="flex px-4 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Link>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopGroupsRow({
  groups,
  totalVotes,
  isVisible,
  expand,
}: {
  groups: ValidatorGroup[];
  totalVotes: bigint;
  isVisible: boolean;
  expand: () => void;
}) {
  const { topGroups, staked, score, elected } = useMemo(() => {
    if (groups.length < NUM_COLLAPSED_GROUPS) return {};
    const topGroups = [...groups]
      .sort((a, b) => (b.votes > a.votes ? 1 : -1))
      .slice(0, NUM_COLLAPSED_GROUPS);
    const topGroupStats = topGroups.map((g) => getGroupStats(g));
    const staked = bigIntSum(topGroups.map((g) => g.votes));
    const score = mean(topGroupStats.map((g) => g.avgScore));
    const numElected = sum(topGroupStats.map((g) => g.numElected));
    const numValidators = sum(topGroupStats.map((g) => g.numMembers));
    const elected = `${numElected} / ${numValidators}`;
    return { topGroups, staked, score, elected };
  }, [groups]);

  if (!isVisible || !topGroups) return null;

  return (
    <>
      <tr className={classNames.tr} onClick={expand}>
        <td className={classNames.tdTopGroups}>{`1-${NUM_COLLAPSED_GROUPS}`}</td>
        <td className={classNames.tdTopGroups}>
          <div className="flex items-center">
            {topGroups?.slice(0, 5).map((g, i) => (
              <div key={i} className="relative" style={{ left: -i * 16 }}>
                <ValidatorGroupLogo key={g.address} address={g.address} size={30} />
              </div>
            ))}
            <div className="relative" style={{ left: -6 * 16 }}>
              <Circle size={30} className="bg-purple-500">
                <span className="text-sm text-white">+4</span>
              </Circle>
            </div>
            <div className="relative" style={{ left: -5 * 16 }}>
              <ChevronIcon direction="s" width={12} height={12} />
            </div>
          </div>
        </td>
        <td className={clsx(classNames.tdTopGroups, classNames.tdDesktopOnly)}>
          <Amount valueWei={staked} showSymbol={false} decimals={0} className="all:font-sans" />
        </td>
        <td className={classNames.tdTopGroups}>
          <CumulativeColumn
            groups={topGroups}
            address={topGroups?.[NUM_COLLAPSED_GROUPS - 1]?.address}
            totalVotes={totalVotes}
          />
        </td>
        <td className={clsx(classNames.tdTopGroups, classNames.tdDesktopOnly)}>
          {(score?.toFixed(0) || 0) + '%'}
        </td>
        <td className={clsx(classNames.tdTopGroups, classNames.tdDesktopOnly)}>{elected || ''}</td>
        <td className={clsx(classNames.tdTopGroups, classNames.tdDesktopOnly)}></td>
      </tr>
      <tr
        className={clsx(
          'border-y border-taupe-300 bg-yellow-500 text-center text-sm',
          !isVisible && 'hidden',
        )}
      >
        <td colSpan={7}>
          Improve decentralization and network health by staking with a group below ↓
        </td>
      </tr>
    </>
  );
}

function CumulativeColumn({
  groups,
  address,
  totalVotes,
}: {
  groups?: Array<ValidatorGroupRow | ValidatorGroup>;
  address?: Address;
  totalVotes: bigint;
}) {
  const sharePercentage = computeCumulativeShare(groups, address, totalVotes);

  const isMobile = useIsMobile();
  const maxChartWidth = isMobile ? 40 : 60;
  const width = (sharePercentage / 100) * maxChartWidth;

  return (
    <div className="flex">
      <div>{sharePercentage.toFixed(2) + '%'}</div>
      <div
        style={{ width: `${width}px` }}
        className="absolute bottom-0 top-0 ml-20 border-x border-purple-200 bg-purple-200/20"
      ></div>
    </div>
  );
}

function useTableColumns(totalVotes: bigint) {
  const showTxModal = useTransactionModal();

  return useMemo(() => {
    const columnHelper = createColumnHelper<ValidatorGroupRow>();
    return [
      columnHelper.display({
        id: 'index',
        header: '#',
        cell: (props) => <div>{getRowSortedIndex(props)}</div>,
      }),
      columnHelper.accessor('name', {
        header: 'Group name',
        cell: (props) => (
          <div className="flex items-center space-x-2">
            <ValidatorGroupLogo address={props.row.original.address} size={30} />
            <span>{cleanGroupName(props.getValue())}</span>
          </div>
        ),
      }),
      columnHelper.accessor('votes', {
        header: 'Staked',
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
        cell: (props) => (
          <CumulativeColumn
            groups={props.table.getSortedRowModel().rows.map((r) => r.original)}
            address={props.row.original.address}
            totalVotes={totalVotes}
          />
        ),
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
          <SolidButton
            onClick={(e) => {
              e.preventDefault();
              showTxModal(TransactionFlowType.Stake, { group: props.row.original.address });
            }}
            className="all:btn-neutral"
          >
            Stake
          </SolidButton>
        ),
      }),
    ];
  }, [totalVotes, showTxModal]);
}

function useTableRows({
  groups,
  filter,
  searchQuery,
  collapseTopGroups,
}: {
  groups: ValidatorGroup[];
  filter: Filter;
  searchQuery: string;
  collapseTopGroups: boolean;
}) {
  return useMemo<ValidatorGroupRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredGroups = groups
      .filter((g) => {
        if (filter === Filter.Elected) return isElected(g);
        else if (filter === Filter.Unelected) return !isElected(g);
        else if (filter === Filter.Ineligible) return !g.eligible;
        else return g.eligible;
      })
      .filter(
        (g) =>
          !g ||
          g.name.toLowerCase().includes(query) ||
          g.address.toLowerCase().includes(query) ||
          Object.values(g.members).some(
            (m) => m.address.toLowerCase().includes(query) || m.name.toLowerCase().includes(query),
          ),
      )
      .sort((a, b) => (b.votes > a.votes ? 1 : -1));

    const groupRows = filteredGroups.map(
      (g, i): ValidatorGroupRow => ({
        ...g,
        ...getGroupStats(g),
        isHidden: collapseTopGroups && i < NUM_COLLAPSED_GROUPS,
      }),
    );
    return groupRows;
  }, [groups, filter, searchQuery, collapseTopGroups]);
}

function computeCumulativeShare(
  groups?: Array<ValidatorGroupRow | ValidatorGroup>,
  address?: Address,
  totalVotes?: bigint,
) {
  if (!groups?.length || !address || !totalVotes) return 0;
  const index = groups.findIndex((g) => g.address === address);
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

const classNames = {
  tr: 'cursor-pointer transition-all hover:bg-purple-50 active:bg-purple-100',
  th: 'border-y border-taupe-300 px-4 py-3 first:min-w-[3rem] last:min-w-0 md:min-w-[8rem]',
  td: 'relative border-y border-taupe-300 text-nowrap',
  tdTopGroups: 'relative border-y border-taupe-300 px-4 py-4 text-nowrap',
  tdDesktopOnly: 'hidden md:table-cell',
};
