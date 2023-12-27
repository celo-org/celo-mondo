import type { TxModalType } from 'src/features/transactions/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Increment this when persist state has breaking changes
const PERSIST_STATE_VERSION = 0;

// Keeping everything here for now as state is simple
// Will refactor into slices as necessary
export interface AppState {
  activeModal: {
    type: TxModalType | null;
    props?: object;
  };
  setTransactionModal: (args: { type: TxModalType; props?: object }) => void;
}

// TODO is a store needed?
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      activeModal: {
        type: null,
        props: {},
      },
      setTransactionModal: (args: { type: TxModalType; props?: object }) => {
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
