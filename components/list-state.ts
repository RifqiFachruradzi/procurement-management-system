'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** List filters kept in the URL query (?status=&stage=&q=) so they survive navigation and can be linked from the dashboard. */
export function useListState(defaultStatus = 'All') {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v && !(k === 'status' && v === defaultStatus)) p.set(k, v); else p.delete(k);
    router.replace(`${path}${p.size ? '?' + p : ''}`, { scroll: false });
  };
  return {
    status: sp.get('status') || defaultStatus,
    stage: sp.get('stage') || '',
    q: (sp.get('q') || '').toLowerCase(),
    rawQ: sp.get('q') || '',
    set,
    clearStage: () => set('stage', ''),
  };
}
