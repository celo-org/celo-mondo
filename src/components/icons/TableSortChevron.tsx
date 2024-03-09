import { ChevronIcon } from 'src/components/icons/Chevron';

export function TableSortChevron({ direction }: { direction: 'n' | 's' }) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2">
      <ChevronIcon direction={direction} width={10} height={10} />
    </div>
  );
}
