'use client';
import { AlertCircle, CheckCircle2, Clock, Inbox, Search, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Status, Tone } from '@/lib/types';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

const toneClass: Record<Tone, string> = {
  success: 'text-ok bg-ok-bg',
  warning: 'text-warn bg-warn-bg',
  danger: 'text-bad bg-bad-bg',
  info: 'text-info bg-info-bg',
  open: 'text-info bg-info-bg',
  neutral: 'text-muted bg-neutral-bg',
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-xs font-bold whitespace-nowrap', toneClass[tone])}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
export const StatusBadge = ({ status }: { status: Status }) => <Badge tone={status === 'Open' ? 'open' : 'neutral'}>{status}</Badge>;

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight">{title}</h1>
        {sub && <div className="mt-1 flex flex-wrap items-center gap-2 text-muted">{sub}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, right, children, className, bodyless }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyless?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {title && (
        <div className="card-head">
          <h3>{title}</h3>
          {right}
        </div>
      )}
      {bodyless ? children : <div className="card-body">{children}</div>}
    </section>
  );
}

export function Empty({ msg, icon: Icon = Inbox, children }: { msg: string; icon?: LucideIcon; children?: React.ReactNode }) {
  return (
    <div className="px-5 py-10 text-center text-muted">
      <Icon className="mx-auto mb-2 size-[30px]" strokeWidth={1.6} />
      <div>{msg}</div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, full, children }: { label: string; hint?: React.ReactNode; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={cx('flex flex-col gap-[5px]', full && 'col-span-full')}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
export const FormGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cx('grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-[18px] gap-y-3.5', className)}>{children}</div>
);

export function DL({ items }: { items: [string, React.ReactNode, boolean?][] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-[18px] gap-y-3.5">
      {items.map(([k, v, full]) => (
        <div key={k} className={full ? 'col-span-full' : ''}>
          <span className="block text-xs tracking-wider text-muted uppercase">{k}</span>
          <div className="font-bold">{v}</div>
        </div>
      ))}
    </div>
  );
}

const alertIcon = { info: Clock, warning: AlertCircle, danger: AlertCircle, success: CheckCircle2 };
export function Alert({ tone, children, className }: { tone: 'info' | 'warning' | 'danger' | 'success'; children: React.ReactNode; className?: string }) {
  const Icon = alertIcon[tone];
  const c = { info: 'bg-info-bg text-info', warning: 'bg-warn-bg text-warn', danger: 'bg-bad-bg text-bad', success: 'bg-ok-bg text-ok' }[tone];
  return (
    <div className={cx('flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm', c, className)}>
      <Icon className="mt-px size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-2 p-[3px]">
      {options.map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cx('shrink-0 rounded-md px-3 py-[5px] text-sm whitespace-nowrap', value === k ? 'bg-surface font-bold text-fg shadow-sm' : 'text-muted hover:text-fg')}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (v === value) return;
    const t = setTimeout(() => onChange(v), 250);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative max-w-[360px] min-w-[180px] flex-1">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
      <input className="input pl-[34px]" value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-3.5 py-3">{children}</div>
);

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
