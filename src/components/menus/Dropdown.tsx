import { ReactNode } from 'react';

/**
 * A small dropdown modal
 */
export function Dropdown({
  button,
  content,
  className,
}: {
  button: ReactNode;
  content: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dropdown ${className}`}>
      <div tabIndex={0} role="button">
        {button}
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-[1] mt-4 w-52 rounded-box bg-white p-2 shadow"
      >
        {content}
      </div>
    </div>
  );
}

/**
 * A dropdown menu with a list of items
 */
export function DropdownMenu({
  button,
  items,
  className,
}: {
  button: ReactNode;
  items: Array<ReactNode>;
  className?: string;
}) {
  return (
    <div className={`dropdown ${className}`}>
      <div tabIndex={0} role="button" className="btn btn-ghost rounded-btn">
        {button}
      </div>
      <ul
        tabIndex={0}
        className="menu dropdown-content z-[1] mt-4 w-52 rounded-box bg-white p-2 shadow"
      >
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
