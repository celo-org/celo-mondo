import type { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Increment this when persist state has breaking changes
const PERSIST_STATE_VERSION = 0;

// Keeping everything here for now as state is simple
// Will refactor into slices as necessary
export interface AppState {
  activeModal: {
    type: TransactionFlowType | null;
    defaultFormValues?: any;
  };
  setTransactionModal: (args: { type: TransactionFlowType; defaultFormValues?: any }) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      activeModal: {
        type: null,
        defaultFormValues: {},
      },
      setTransactionModal: (args: { type: TransactionFlowType; defaultFormValues?: any }) => {
        set(() => ({ activeModal: args }));
      },
    }),
    {
      name: 'celo-station-state',
      partialize: (_state) => ({}),
      version: PERSIST_STATE_VERSION,
    },
  ),
);
