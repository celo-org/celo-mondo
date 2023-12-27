import { useCallback, useEffect } from 'react';
import { Modal, useModal } from 'src/components/menus/Modal';
import { StakeForm } from 'src/features/staking/StakeForm';
import { useStore } from 'src/features/store';
import { TxModalType } from 'src/features/transactions/types';

const TypeToComponent: Record<TxModalType, React.FC<any>> = {
  [TxModalType.Lock]: PlaceholderContent,
  [TxModalType.Unlock]: PlaceholderContent,
  [TxModalType.Withdraw]: PlaceholderContent,
  [TxModalType.Stake]: StakeForm,
  [TxModalType.Unstake]: PlaceholderContent,
  [TxModalType.Vote]: PlaceholderContent,
  [TxModalType.Unvote]: PlaceholderContent,
  [TxModalType.Delegate]: PlaceholderContent,
  [TxModalType.Undelegate]: PlaceholderContent,
};

export function useTransactionModal(type: TxModalType, props?: any) {
  const setTxModal = useStore((state) => state.setTransactionModal);
  return useCallback(() => setTxModal({ type, props }), [setTxModal, type, props]);
}

export function TransactionModal() {
  const { isModalOpen, closeModal, openModal } = useModal();

  const activeModal = useStore((state) => state.activeModal);
  const { type, props } = activeModal;

  const Component = type ? TypeToComponent[type] : PlaceholderContent;

  useEffect(() => {
    if (!openModal || !activeModal?.type) return;
    openModal();
  }, [activeModal, openModal]);

  return (
    <Modal isOpen={isModalOpen} close={closeModal}>
      <Component {...props} />
    </Modal>
  );
}

function PlaceholderContent() {
  return <div className="flex items-center justify-center px-4 py-6">...</div>;
}
