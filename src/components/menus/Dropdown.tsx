import {
  Menu,
  MenuButton,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { Fragment, ReactElement, ReactNode } from 'react';

interface MenuProps {
  button: ReactNode;
  buttonClasses?: string;
  menuItems: ReactNode[];
  menuClasses?: string;
  menuHeader?: ReactNode;
  disabled?: boolean;
}

// Uses Headless menu, which auto-closes on any item click
export function DropdownMenu({
  button,
  buttonClasses,
  menuItems,
  menuClasses,
  menuHeader,
  disabled,
}: MenuProps) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className={buttonClasses} disabled={disabled}>
        {button}
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className={`absolute z-40 mt-2.5 w-max origin-top-left bg-white ring-1 ring-black/5 drop-shadow-md focus:outline-none ${menuClasses}`}
        >
          {menuHeader}
          {menuItems.map((mi, i) => (
            <Menu.Item key={`menu-item-${i}`}>{mi}</Menu.Item>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
}

interface ModalProps {
  button: (props: { open: boolean }) => ReactElement;
  buttonClasses?: string;
  modal: (props: { close: () => void }) => ReactElement;
  modalClasses?: string;
}

// Uses Headless Popover, which is a more general purpose dropdown box
export function DropdownModal({ button, buttonClasses, modal, modalClasses }: ModalProps) {
  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton className={buttonClasses}>{button({ open })}</PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-100"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <PopoverPanel
              className={`focus:outline-hidden absolute right-0 z-40 mt-2 w-max bg-white ring-1 ring-black/5 drop-shadow-md ${modalClasses}`}
            >
              {({ close }) => modal({ close })}
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
