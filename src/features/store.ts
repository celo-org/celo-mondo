import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Increment this when persist state has breaking changes
const PERSIST_STATE_VERSION = 0;

// Keeping everything here for now as state is simple
// Will refactor into slices as necessary
export interface AppState {
  transactions: any[];
  addTransactions: (t: any) => void;
  resetTransactions: () => void;
  failUnconfirmedTransactions: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransactions: (t: any) => {
        set((state) => ({ transactions: [...state.transactions, t] }));
      },
      resetTransactions: () => {
        set(() => ({ transactions: [] }));
      },
      failUnconfirmedTransactions: () => {
        //TODO
        set((state) => state);
      },
    }),
    {
      name: 'app-state',
      partialize: (state) => ({ transactions: state.transactions }),
      version: PERSIST_STATE_VERSION,
      onRehydrateStorage: () => (state) => {
        state?.failUnconfirmedTransactions();
      },
    },
  ),
);
