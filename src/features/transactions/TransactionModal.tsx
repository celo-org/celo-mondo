import { useCallback, useEffect } from 'react';
import { Modal, useModal } from 'src/components/menus/Modal';
import { AccountConnectForm } from 'src/features/account/AccountConnectForm';
import { StakeFlow } from 'src/features/staking/StakeFlow';
import { useStore } from 'src/features/store';
import { TxModalType } from 'src/features/transactions/types';
import { useAccount } from 'wagmi';

const TypeToComponent: Record<TxModalType, React.FC<any>> = {
  [TxModalType.Lock]: PlaceholderContent,
  [TxModalType.Stake]: StakeFlow,
  [TxModalType.Vote]: PlaceholderContent,
  [TxModalType.Delegate]: PlaceholderContent,
};

export function useTransactionModal(type: TxModalType, props?: any) {
  const setTxModal = useStore((state) => state.setTransactionModal);
  return useCallback(() => setTxModal({ type, props }), [setTxModal, type, props]);
}

export function TransactionModal() {
  const { isModalOpen, closeModal, openModal } = useModal();

  const activeModal = useStore((state) => state.activeModal);
  const { type, props } = activeModal;

  const { address, isConnected } = useAccount();
  const isReady = address && isConnected;

  const Component = !isReady
    ? AccountConnectForm
    : type
      ? TypeToComponent[type]
      : PlaceholderContent;

  useEffect(() => {
    if (!openModal || !activeModal?.type) return;
    openModal();
  }, [activeModal, openModal]);

  return (
    <Modal isOpen={isModalOpen} close={closeModal}>
      <div className="flex min-h-[24rem] min-w-[18rem] max-w-sm flex-col border border-taupe-300 p-2">
        <Component {...props} />
      </div>
    </Modal>
  );
}

function PlaceholderContent() {
  return <div className="flex items-center justify-center px-4 py-6">...</div>;
}
