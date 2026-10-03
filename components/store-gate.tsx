'use client';
import { useEffect, useState } from 'react';
import { STORAGE_KEY, useDB } from '@/lib/store';

/** Loads persisted data on the client (seeding demo data on first visit) before rendering children. */
export function StoreGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useDB.persist.rehydrate()).then(() => {
      if (!useDB.getState().initialized) useDB.getState().reset(true);
      setReady(true);
    });
    // keep tabs in sync (e.g. vendor approves in the portal tab)
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) useDB.persist.rehydrate(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="size-8 animate-pulse" />
          <span>Memuat data…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
