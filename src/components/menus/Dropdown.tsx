import { Menu, Popover, Transition } from '@headlessui/react';
import { Fragment, ReactElement, ReactNode } from 'react';

interface MenuProps {
  button: ReactNode;
  buttonClasses?: string;
  menuItems: ReactNode[];
  menuClasses?: string;
}

// Uses Headless menu, which auto-closes on any item click
export function DropdownMenu({ button, buttonClasses, menuItems, menuClasses }: MenuProps) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className={buttonClasses}>{button}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={`absolute z-40 mt-3 w-max origin-top-left bg-white ring-1 ring-black/5 drop-shadow-md focus:outline-none ${menuClasses}`}
        >
          {menuItems.map((mi, i) => (
            <Menu.Item key={`menu-item-${i}`}>{mi}</Menu.Item>
          ))}
        </Menu.Items>
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
          <Popover.Button className={buttonClasses}>{button({ open })}</Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-100"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Popover.Panel
              className={`absolute right-0 z-40 mt-2 bg-white ring-1 ring-black/5 drop-shadow-md focus:outline-none ${modalClasses}`}
            >
              {({ close }) => modal({ close })}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
