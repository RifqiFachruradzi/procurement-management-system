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
  vouchers: s.vouchers ?? [],
});

/** Upgrades data saved by older versions of the app. */
function migrate(persisted: unknown, version: number) {
  const s = persisted as DB & { initialized?: boolean };
  if (version < 2) {
    // v2: journal entries are numbered JE/..., JV/... now identifies Journal Vouchers (payment documents)
    const base = emptyDB();
    s.settings = { ...base.settings, ...s.settings };
    s.vouchers = s.vouchers ?? [];
    s.journals = (s.journals ?? []).map(j => ({ ...j, no: j.no.replace(/^JV\//, 'JE/') }));
    for (const k of Object.keys(s.counters ?? {})) {
      if (k.startsWith('JV-')) { s.counters[k.replace('JV-', 'JE-')] = s.counters[k]; delete s.counters[k]; }
    }
    s.invoices = (s.invoices ?? []).map(i => ({ ...i, voucherId: i.voucherId ?? null }));
  }
  if (version < 3) {
    // v3: two-level PR approval (Atasan Pemohon, then Procurement). Older approvals count as both levels.
    s.prs = (s.prs ?? []).map(pr => {
      const history = pr.history.flatMap(e => e.key === 'PR_APPROVED'
        ? [{ ...e, key: 'PR_SUPERVISOR_APPROVED' as const, by: pr.supervisor || 'Atasan Pemohon', note: 'Data sebelum approval 2 level' }, e]
        : [e]);
      return { ...pr, supervisor: pr.supervisor ?? '', history };
    });
  }
  return s;
}

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
      replace: data => set(() => ({ ...emptyDB(), ...pickDB(migrate(data, data.prs?.every(p => 'supervisor' in p) ? 3 : Array.isArray(data.vouchers) ? 2 : 1)), initialized: true })),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 3,
      migrate: (p, v) => migrate(p, v) as never,
      partialize: s => ({ ...pickDB(s), initialized: s.initialized }),
    },
  ),
);

/** Non-reactive snapshot of the DB for use inside event handlers. */
export const getDB = (): DB => useDB.getState();
