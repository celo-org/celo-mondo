export function SearchField({
  value,
  setValue,
  className,
}: {
  value: string;
  setValue: (v: string) => void;
  className?: string;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  return (
    <input
      type="text"
      placeholder="Search"
      className={`input input-bordered h-fit min-h-fit rounded-full py-2 ${className}`}
      value={value}
      onChange={onChange}
    />
  );
}
