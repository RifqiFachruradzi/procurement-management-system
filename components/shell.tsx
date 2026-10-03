'use client';
import {
  BookText, Building2, ChevronRight, ClipboardList, FileCheck2, FileText, LayoutGrid, Menu, Moon, Plus, ReceiptText, Route, SlidersHorizontal, Sun,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { initials } from '@/lib/format';
import { useDB } from '@/lib/store';
import { FeedbackHost } from './feedback';
import { StoreGate } from './store-gate';
import { cx } from './ui';

interface NavItem { href: string; label: string; icon: LucideIcon; count?: () => number }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Utama', items: [
    { href: '/', label: 'Dashboard', icon: LayoutGrid },
    { href: '/tracking', label: 'Tracking PR', icon: Route },
  ] },
  { group: 'Pengadaan', items: [
    { href: '/pr', label: 'Purchase Request', icon: ClipboardList },
    { href: '/po', label: 'Purchase Order', icon: FileText },
    { href: '/vendors', label: 'Database Vendor', icon: Building2 },
  ] },
  { group: 'Keuangan', items: [
    { href: '/invoices', label: 'Tagihan Vendor', icon: ReceiptText },
    { href: '/vouchers', label: 'Jurnal Voucher', icon: FileCheck2 },
    { href: '/journals', label: 'Jurnal Entry', icon: BookText },
  ] },
  { group: 'Sistem', items: [{ href: '/settings', label: 'Pengaturan', icon: SlidersHorizontal }] },
];

const LABELS: Record<string, string> = {
  pr: 'Purchase Request', po: 'Purchase Order', vendors: 'Database Vendor', invoices: 'Tagihan Vendor',
  journals: 'Jurnal Entry', vouchers: 'Jurnal Voucher', settings: 'Pengaturan', tracking: 'Tracking PR', new: 'Baru', edit: 'Edit',
};

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); }, []);
  const toggle = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('procura.theme', t); } catch { /* ignore */ }
    setTheme(t);
  };
  return { theme, toggle };
}

function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const path = usePathname();
  const settings = useDB(s => s.settings);
  const pendingPR = useDB(s => s.prs.filter(p => p.status === 'Open' && (p.stage === 'SUBMITTED' || p.stage === 'SUPERVISOR_APPROVED')).length);
  const pendingPO = useDB(s => s.pos.filter(p => p.stage === 'PENDING').length);
  const pendingJV = useDB(s => s.vouchers.filter(v => v.status === 'Draft' || v.status === 'Checked' || v.status === 'Approved').length);
  const counts: Record<string, number> = { '/pr': pendingPR, '/po': pendingPO, '/vouchers': pendingJV };
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));

  return (
    <aside className={cx(
      'no-print fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-surface transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0',
      open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
    )}>
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <img src="/logo.svg" alt="" className="size-[30px]" />
        <div>
          <b className="text-[19px] tracking-wide">PROCURA</b>
          <small className="-mt-0.5 block text-xs text-muted">Procurement Management</small>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-1.5">
        {NAV.map(g => (
          <div key={g.group}>
            <div className="px-2.5 pt-3.5 pb-1.5 text-[11px] tracking-[.08em] text-muted uppercase">{g.group}</div>
            {g.items.map(n => {
              const on = active(n.href);
              const c = counts[n.href];
              return (
                <Link key={n.href} href={n.href} onClick={onNavigate}
                  className={cx('flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors', on ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2 hover:text-fg')}>
                  <n.icon className="size-[18px]" strokeWidth={1.8} />
                  <span>{n.label}</span>
                  {!!c && <span className={cx('ml-auto rounded-full px-[7px] text-xs', on ? 'bg-white/20' : 'bg-neutral-bg text-fg')}>{c}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2.5 border-t border-line px-5 py-3.5 text-[13px] text-muted">
        <div className="grid size-[30px] shrink-0 place-items-center rounded-full bg-neutral-bg text-[13px] font-bold text-fg">{initials(settings.userName)}</div>
        <div className="min-w-0"><b className="block truncate text-fg">{settings.userName}</b><span className="block truncate">{settings.company}</span></div>
      </div>
    </aside>
  );
}

function Crumbs() {
  const path = usePathname();
  const parts = path.split('/').filter(Boolean);
  const pr = useDB(s => s.prs);
  const po = useDB(s => s.pos);
  const inv = useDB(s => s.invoices);
  const vendors = useDB(s => s.vendors);
  const journals = useDB(s => s.journals);
  const vouchers = useDB(s => s.vouchers);
  const name = (seg: string, i: number) => {
    if (LABELS[seg]) return LABELS[seg];
    const parent = parts[i - 1];
    const list = parent === 'pr' || parent === 'tracking' ? pr : parent === 'po' ? po : parent === 'invoices' ? inv
      : parent === 'journals' ? journals : parent === 'vouchers' ? vouchers : null;
    if (list) return list.find(x => x.id === seg)?.no ?? seg;
    if (parent === 'vendors') return vendors.find(v => v.id === seg)?.name ?? seg;
    return seg;
  };
  const items = parts.length ? parts.map(name) : ['Dashboard'];
  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm whitespace-nowrap text-muted">
      {items.map((l, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5" />}
          {i === items.length - 1 ? <b className="truncate text-fg">{l}</b> : <span>{l}</span>}
        </span>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const path = usePathname();
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  return (
    <StoreGate>
      <div className="flex min-h-screen">
        <Sidebar open={open} onNavigate={() => setOpen(false)} />
        {open && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-10 flex h-[60px] items-center gap-3 border-b border-line bg-surface px-4 md:px-7">
            <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="size-[18px]" /></button>
            <Crumbs />
            <div className="flex-1" />
            <Link href="/pr/new" className="btn btn-sm"><Plus className="size-4" />PR Baru</Link>
            <button className="btn btn-ghost btn-icon" onClick={toggle} title="Ganti tema" aria-label="Ganti tema">
              {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
          </header>
          <main className="print-full mx-auto w-full max-w-[1280px] px-4 py-[18px] md:p-7">
            <Suspense>
              <div key={path} className="animate-in">{children}</div>
            </Suspense>
          </main>
        </div>
      </div>
      <FeedbackHost />
    </StoreGate>
  );
}
