import {
  CellContext,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchField } from 'src/components/input/SearchField';
import { Amount } from 'src/components/numbers/Amount';

import Link from 'next/link';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderFilters } from 'src/components/buttons/TabHeaderButton';
import { TableSortChevron } from 'src/components/icons/TableSortChevron';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import ContributionBadge from 'src/features/validators/components/ContributionBadge';
import { ValidatorGroup, ValidatorGroupRow } from 'src/features/validators/types';
import {
  cleanGroupName,
  formatCommission,
  getGroupStats,
  isElected,
} from 'src/features/validators/utils';
import { useIsMobile } from 'src/styles/mediaQueries';
import { useStakingMode } from 'src/utils/useStakingMode';
import useTabs from 'src/utils/useTabs';
import { useTrackEvent } from 'src/utils/useTrackEvent';

const DESKTOP_ONLY_COLUMNS = ['votes', 'score', 'commission', 'numElected', 'capacity', 'cta'];
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
  const { tab: filter, onTabChange: setFilter } = useTabs<Filter>(Filter.All);
  const trackEvent = useTrackEvent();

  const handleFilterChange = useCallback(
    (newFilter: Filter) => {
      trackEvent('validator_filter_changed', { filter: newFilter });
      setFilter(newFilter);
    },
    [trackEvent, setFilter],
  );

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
        <TabHeaderFilters
          activeFilter={filter}
          setFilter={handleFilterChange}
          counts={headerCounts}
        />
        <SearchField
          value={searchQuery}
          setValue={setSearchQuery}
          placeholder="Search by name or address"
          className="w-full text-sm md:w-64"
        />
      </div>
      <table className="lg:min-w-248 xl:min-w-300 mt-2 w-full">
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
            <tr key={row.original.address} className={classNames.tr}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={clsx(classNames.td, '')}>
                  <Link
                    href={`/staking/${row.original.address}`}
                    className="flex items-center gap-4 px-4 py-4"
                    onClick={() =>
                      trackEvent('validator_group_viewed', {
                        groupAddress: row.original.address,
                        groupName: row.original.name,
                      })
                    }
                  >
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

function useTableColumns(_totalVotes: bigint) {
  const showTxModal = useTransactionModal();
  const { mode, ui } = useStakingMode();
  const trackEvent = useTrackEvent();

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
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="flex shrink-0 items-center space-x-2">
              <ValidatorGroupLogo address={props.row.original.address} size={30} />
              <span>{cleanGroupName(props.getValue())}</span>
            </div>
            <div className="flex-shrink-1 flex items-center">
              {props.row.original.isContributor ? (
                <ContributionBadge className="text-black" title="Community contributor" />
              ) : null}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('votes', {
        header: 'Staked',
        enableSorting: true,
        cell: (props) => (
          <Amount
            valueWei={props.getValue()}
            showSymbol={false}
            decimals={0}
            className="all:font-sans"
          />
        ),
      }),
      columnHelper.accessor('score', {
        header: 'Score',
        cell: (props) => <div>{`${(props.getValue() * 100).toFixed()}%`}</div>,
      }),
      columnHelper.accessor('commission', {
        header: 'Commission',
        enableSorting: true,
        cell: (props) => <div>{formatCommission(props.getValue())}</div>,
      }),
      columnHelper.accessor('numElected', {
        header: 'Elected',
        cell: (props) => <div>{`${props.getValue()} / ${props.row.original.numMembers}`}</div>,
      }),
      columnHelper.accessor('capacity', {
        header: 'Capacity',
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const capacityA = rowA.original.capacity;
          const votesA = rowA.original.votes;
          const utilizationA = capacityA === 0n ? 0 : Number((votesA * 100n) / capacityA);

          const capacityB = rowB.original.capacity;
          const votesB = rowB.original.votes;
          const utilizationB = capacityB === 0n ? 0 : Number((votesB * 100n) / capacityB);

          return utilizationA - utilizationB;
        },
        cell: (props) => {
          const capacity = props.getValue();
          const votes = props.row.original.votes;
          const utilizationPercent =
            capacity === 0n ? 0 : Math.min(Number((votes * 100n) / capacity), 100);
          return <div>{`${utilizationPercent.toFixed(0)}%`}</div>;
        },
      }),
      columnHelper.display({
        id: 'cta',
        header: '',
        cell: (props) => {
          const { votes, capacity } = props.row.original;
          const isFull = capacity > 0n && votes >= capacity;
          return (
            <SolidButton
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                trackEvent('stake_button_clicked', { groupAddress: props.row.original.address });
                showTxModal(
                  mode === 'CELO' ? TransactionFlowType.Stake : TransactionFlowType.ChangeStrategy,
                  { group: props.row.original.address },
                );
              }}
              className="bg-primary all:btn-neutral all:text-primary-content"
              disabled={isFull}
              title={isFull ? 'This group has reached maximum capacity' : undefined}
            >
              {isFull ? 'Full' : ui.action}
            </SolidButton>
          );
        },
      }),
    ];
  }, [ui.action, showTxModal, mode, trackEvent]);
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
      (g): ValidatorGroupRow => ({
        ...g,
        ...getGroupStats(g),
        isContributor: Boolean(VALIDATOR_GROUPS[g.address]?.communityContributor),
      }),
    );
    return groupRows;
  }, [groups, filter, searchQuery]);
}

function getRowSortedIndex(rowProps: CellContext<ValidatorGroupRow, unknown>) {
  const sortedRows = rowProps.table.getSortedRowModel().rows;
  return sortedRows.findIndex((r) => r.id === rowProps.row.id) + 1;
}

const classNames = {
  tr: 'cursor-pointer transition-all hover:bg-purple-50 active:bg-purple-100',
  th: 'border-y border-taupe-300 px-4 py-3 first:min-w-12 last:min-w-0 md:min-w-32',
  td: 'relative border-y border-taupe-300 sm:whitespace-nowrap',
};
