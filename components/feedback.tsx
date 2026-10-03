'use client';
/* Global toast notifications and modal dialogs */
import { AlertCircle, Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { cx } from './ui';

/* ---------- Toast ---------- */
interface ToastItem { id: number; msg: string; error?: boolean }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let toastSeq = 0;

export function toast(msg: string, error = false) {
  const id = ++toastSeq;
  useToasts.setState(s => ({ items: [...s.items, { id, msg, error }].slice(-3) }));
  setTimeout(() => useToasts.setState(s => ({ items: s.items.filter(t => t.id !== id) })), 3200);
}

function ToastHost() {
  const items = useToasts(s => s.items);
  return (
    <div className="no-print fixed right-4 bottom-4 left-4 z-[200] flex flex-col items-end gap-2 sm:left-auto">
      {items.map(t => (
        <div
          key={t.id}
          className={cx('flex items-center gap-2 rounded-lg px-4 py-[11px] text-sm shadow-xl animate-in', t.error ? 'bg-bad text-white' : 'bg-accent text-accent-fg')}
        >
          {t.error ? <AlertCircle className="size-4" /> : <Check className="size-4" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Dialog ---------- */
export interface DialogField {
  name: string; label: string; type?: 'text' | 'textarea' | 'date' | 'email' | 'readonly';
  required?: boolean; value?: string; placeholder?: string; full?: boolean;
}
export interface DialogSpec {
  title: string;
  message?: React.ReactNode;
  fields?: DialogField[];
  body?: React.ReactNode;
  confirm?: string;
  confirmClass?: string;
  cancel?: string;
  wide?: boolean;
  /** Return false to keep the dialog open. */
  onConfirm?: (values: Record<string, string>) => void | boolean;
}
const useDialogStore = create<{ spec: DialogSpec | null }>(() => ({ spec: null }));
export const openDialog = (spec: DialogSpec) => useDialogStore.setState({ spec });
export const closeDialog = () => useDialogStore.setState({ spec: null });

function DialogHost() {
  const spec = useDialogStore(s => s.spec);
  const [values, setValues] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!spec) return;
    setValues(Object.fromEntries((spec.fields ?? []).map(f => [f.name, f.value ?? ''])));
    setInvalid([]);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDialog();
    window.addEventListener('keydown', onKey);
    setTimeout(() => formRef.current?.querySelector<HTMLElement>('input:not([readonly]), textarea')?.focus(), 0);
    return () => window.removeEventListener('keydown', onKey);
  }, [spec]);

  if (!spec) return null;
  const fields = spec.fields ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const bad = fields.filter(f => f.required && !String(values[f.name] ?? '').trim()).map(f => f.name);
    setInvalid(bad);
    if (bad.length) return toast('Lengkapi field yang wajib diisi', true);
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    if (spec.onConfirm?.(trimmed) !== false) closeDialog();
  };

  return (
    <div
      className="no-print fixed inset-0 z-[100] grid place-items-center bg-slate-900/45 p-4"
      onMouseDown={e => e.target === e.currentTarget && closeDialog()}
    >
      <form ref={formRef} onSubmit={submit} noValidate className={cx('flex max-h-[calc(100vh-32px)] w-full flex-col rounded-xl bg-surface shadow-2xl', spec.wide ? 'max-w-[720px]' : 'max-w-[520px]')}>
        <div className="flex items-center justify-between border-b border-line px-[18px] py-4">
          <h3 className="text-[17px]">{spec.title}</h3>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={closeDialog} aria-label="Tutup"><X className="size-4" /></button>
        </div>
        <div className="space-y-3.5 overflow-y-auto p-[18px]">
          {spec.message && <div className="text-muted">{spec.message}</div>}
          {fields.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
              {fields.map(f => (
                <label key={f.name} className={cx('flex flex-col gap-[5px]', (f.full || f.type === 'textarea') && 'col-span-full')}>
                  <span className="label">{f.label}{f.required ? ' *' : ''}</span>
                  {f.type === 'textarea' ? (
                    <textarea className={cx('input', invalid.includes(f.name) && 'invalid')} value={values[f.name] ?? ''} placeholder={f.placeholder}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} />
                  ) : (
                    <input className={cx('input', invalid.includes(f.name) && 'invalid')} type={f.type === 'readonly' ? 'text' : f.type ?? 'text'}
                      readOnly={f.type === 'readonly'} value={values[f.name] ?? ''} placeholder={f.placeholder}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          )}
          {spec.body}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-[18px] py-3.5">
          {spec.cancel !== '' && <button type="button" className="btn" onClick={closeDialog}>{spec.cancel ?? 'Batal'}</button>}
          {spec.confirm !== '' && <button type="submit" className={cx('btn', spec.confirmClass ?? 'btn-primary')}>{spec.confirm ?? 'Simpan'}</button>}
        </div>
      </form>
    </div>
  );
}

export function FeedbackHost() {
  return (
    <>
      <DialogHost />
      <ToastHost />
    </>
  );
}

/** Convenience: approve/reject style dialog with a name and an optional or required note. */
export function noteDialog(o: {
  title: string; message?: React.ReactNode; confirm: string; confirmClass?: string;
  byLabel?: string; byValue?: string; noteLabel?: string; noteRequired?: boolean;
  onConfirm: (v: { by?: string; note: string }) => void;
}) {
  openDialog({
    title: o.title, message: o.message, confirm: o.confirm, confirmClass: o.confirmClass,
    fields: [
      ...(o.byLabel ? [{ name: 'by', label: o.byLabel, required: true, value: o.byValue, full: true }] : []),
      { name: 'note', label: `${o.noteLabel ?? 'Catatan'}${o.noteRequired ? '' : ' (opsional)'}`, type: 'textarea' as const, required: o.noteRequired },
    ],
    onConfirm: v => o.onConfirm({ by: v.by || undefined, note: v.note }),
  });
}
