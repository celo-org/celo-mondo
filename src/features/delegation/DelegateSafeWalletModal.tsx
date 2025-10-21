import { useState } from 'react';
import { Modal, useModal } from 'src/components/menus/Modal';
import { delegateeRegistrationRequestToMetadata } from 'src/features/delegation/delegateeMetadata';
import { RegisterDelegateFormValues } from 'src/features/delegation/types';
import { useConfig, useConnections } from 'wagmi';

export function DelegateSafeWalletModal({
  isModalOpen,
  close,
  values,
}: {
  values: RegisterDelegateFormValues | {};
  isModalOpen: boolean;
  close: () => void;
}) {
  return (
    <Modal isOpen={isModalOpen} close={close}>
      <div className="max-w-36[rem] flex min-h-96 min-w-[18rem] flex-col border border-taupe-300 bg-taupe-100 p-2.5 pt-8">
        <h2 className="font-serif text-xl">Registering from SAFE Instructions</h2>
        <p className="my-4">
          The Connected Address Appears to be a SAFE wallet. There are bugs related to registering
          (but not acting as) a delegatee.
        </p>
        <p className="mb-4">
          Please Follow{' '}
          <a className="link" href={'/docs/delegating-as-safe.md'}>
            These Instructions to register
          </a>
        </p>
        <hr />
        <h3 className="mb-4 mt-4 text-sm">Use the following JSON in your PR.</h3>
        <pre className="bg-white p-2">
          {isModalOpen && Object.prototype.hasOwnProperty.call(values, 'image')
            ? JSON.stringify(
                delegateeRegistrationRequestToMetadata(
                  values as RegisterDelegateFormValues,
                  new Date(),
                ),
                null,
                2,
              )
            : null}
        </pre>
        <br />
      </div>
    </Modal>
  );
}
export function useSAFEModal() {
  const { isModalOpen, openModal, closeModal } = useModal();
  const [values, setValues] = useState<RegisterDelegateFormValues | {}>({});

  function openModalWithValues(_values: RegisterDelegateFormValues) {
    setValues(_values);
    openModal();
  }

  return {
    isModalOpen,
    openModal: openModalWithValues,
    closeModal,
    values,
  };
}

export const useIsSAFEWallet = () => {
  const config = useConfig();
  const [connection] = useConnections();
  const safeConnector = config.connectors.find((x) => x.id === 'safe')!;
  const isSafe = connection?.connector === safeConnector;
  return isSafe;
};
