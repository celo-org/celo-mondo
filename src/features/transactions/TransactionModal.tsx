import { ComponentType, useCallback, useEffect } from 'react';
import { ErrorBoundaryInline } from 'src/components/errors/ErrorBoundaryInline';
import { Modal, useModal } from 'src/components/menus/Modal';
import { AccountConnectForm } from 'src/features/account/AccountConnectForm';
import { useStore } from 'src/features/store';
import { TransactionFlow, TransactionFlowProps } from 'src/features/transactions/TransactionFlow';
import {
  TransactionFlowType,
  transactionFlowProps,
} from 'src/features/transactions/TransactionFlowType';
import { useAccount } from 'wagmi';

export function useTransactionModal(defaultType?: TransactionFlowType, defaultFormValues?: any) {
  const setTxModal = useStore((state) => state.setTransactionModal);
  return useCallback(
    (_type?: TransactionFlowType, _formValues?: any) => {
      const type = _type || defaultType;
      const formValues = _formValues || defaultFormValues;
      if (!type) return;
      setTxModal({ type, defaultFormValues: formValues });
    },
    [setTxModal, defaultType, defaultFormValues],
  );
}

export function TransactionModal() {
  const { isModalOpen, closeModal, openModal } = useModal();

  const activeModal = useStore((state) => state.activeModal);
  const { type, defaultFormValues } = activeModal;

  const { address, isConnected } = useAccount();
  const isReady = address && isConnected;

  let Component: ComponentType<any>;
  let flowProps: TransactionFlowProps | undefined = undefined;
  if (!isReady) {
    Component = AccountConnectForm;
  } else if (type) {
    Component = TransactionFlow;
    flowProps = transactionFlowProps[type];
  } else {
    Component = PlaceholderContent;
  }

  useEffect(() => {
    if (!openModal || !activeModal?.type) return;
    openModal();
  }, [activeModal, openModal]);

  return (
    <Modal isOpen={isModalOpen} close={closeModal}>
      <div className="flex min-h-96 min-w-[18rem] max-w-sm flex-col border border-taupe-300 p-2.5">
        <ErrorBoundaryInline>
          <Component {...flowProps} defaultFormValues={defaultFormValues} closeModal={closeModal} />
        </ErrorBoundaryInline>
      </div>
    </Modal>
  );
}

function PlaceholderContent() {
  return <div className="flex items-center justify-center px-4 py-6">...</div>;
}
