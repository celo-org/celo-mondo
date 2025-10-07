import { Disclosure, Transition } from '@headlessui/react';
import { PropsWithChildren, ReactNode } from 'react';
import { ChevronIcon } from 'src/components/icons/Chevron';

interface Props {
  button: ReactNode;
  buttonClasses?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
}

export function Collapse({
  button,
  buttonClasses,
  disabled,
  defaultOpen,
  children,
}: PropsWithChildren<Props>) {
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <>
          <Disclosure.Button className={buttonClasses} disabled={disabled}>
            <div className="relative">
              {button}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ChevronIcon direction={open ? 'n' : 's'} width={15} height={10} />
              </div>
            </div>
          </Disclosure.Button>
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="max-h-[400px] overflow-y-auto lg:max-h-max">
              {children}
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
}
