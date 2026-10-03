'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { emptyDB, seedDB } from './seed';
import type { DB } from './types';

interface StoreState extends DB {
  initialized: boolean;
  /** Runs a business operation against the DB (as an immer draft) and returns its result. */
  run: <T>(fn: (d: DB) => T) => T;
  reset: (withDemo: boolean) => void;
  replace: (data: DB) => void;
}

const pickDB = (s: DB): DB => ({
  settings: s.settings, counters: s.counters, vendors: s.vendors, prs: s.prs, pos: s.pos, invoices: s.invoices, journals: s.journals,
});

export const STORAGE_KEY = 'procura.pms.v2';

export const useDB = create<StoreState>()(
  persist(
    immer((set) => ({
      ...emptyDB(),
      initialized: false,
      run: <T,>(fn: (d: DB) => T): T => {
        let out!: T;
        set(s => { out = fn(s as unknown as DB); });
        return out;
      },
      reset: withDemo => set(() => ({ ...(withDemo ? seedDB() : emptyDB()), initialized: true })),
      replace: data => set(() => ({ ...emptyDB(), ...pickDB(data), initialized: true })),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: s => ({ ...pickDB(s), initialized: s.initialized }),
    },
  ),
);

/** Non-reactive snapshot of the DB for use inside event handlers. */
export const getDB = (): DB => useDB.getState();
