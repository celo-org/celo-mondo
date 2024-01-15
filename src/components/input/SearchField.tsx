import { IconButton } from 'src/components/buttons/IconButton';
import { Search } from 'src/components/icons/Search';
import XIcon from '../../images/icons/x.svg';

export function SearchField({
  value,
  setValue,
  placeholder,
  className,
}: {
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder || 'Search'}
        className={`input input-bordered h-fit min-h-fit rounded-full py-2 ${className}`}
        value={value}
        onChange={onChange}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 transform transition-opacity">
        {value ? (
          <IconButton
            imgSrc={XIcon}
            onClick={() => setValue('')}
            title="Clear"
            className="hover:rotate-90"
            width={20}
            height={20}
          />
        ) : (
          <Search width={16} height={16} />
        )}
      </div>
    </div>
  );
}
