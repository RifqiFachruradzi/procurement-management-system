'use client';
import { Plus, Trash2 } from 'lucide-react';
import { rp } from '@/lib/format';

export interface EditorItem { name: string; qty: number; unit: string; price: number }
export const blankItem = (): EditorItem => ({ name: '', qty: 1, unit: 'pcs', price: 0 });

export function ItemsEditor({ items, onChange, priceLabel, showErrors }: {
  items: EditorItem[]; onChange: (items: EditorItem[]) => void; priceLabel: string; showErrors?: boolean;
}) {
  const set = (i: number, patch: Partial<EditorItem>) => onChange(items.map((it, n) => (n === i ? { ...it, ...patch } : it)));
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="tbl min-w-[640px] [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-2">
          <thead>
            <tr><th>Barang / Jasa</th><th className="num">Qty</th><th>Satuan</th><th className="num">{priceLabel}</th><th className="num">Jumlah</th><th /></tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td><input className={`input h-8 ${showErrors && !it.name.trim() ? 'invalid' : ''}`} value={it.name} placeholder="Nama barang / jasa" onChange={e => set(i, { name: e.target.value })} /></td>
                <td className="w-[90px]"><input className={`input h-8 text-right ${showErrors && !(it.qty > 0) ? 'invalid' : ''}`} type="number" min={0} step="any" value={it.qty} onChange={e => set(i, { qty: Number(e.target.value) })} /></td>
                <td className="w-[100px]"><input className="input h-8" value={it.unit} onChange={e => set(i, { unit: e.target.value })} /></td>
                <td className="w-[150px]"><input className="input h-8 text-right" type="number" min={0} step="any" value={it.price} onChange={e => set(i, { price: Number(e.target.value) })} /></td>
                <td className="num w-[140px]">{rp(it.qty * it.price)}</td>
                <td className="w-11">
                  <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" title="Hapus" disabled={items.length === 1}
                    onClick={() => onChange(items.filter((_, n) => n !== i))}><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="py-2.5"><button type="button" className="btn btn-sm" onClick={() => onChange([...items, blankItem()])}><Plus className="size-4" />Tambah Baris</button></div>
    </div>
  );
}

export const validItems = (items: EditorItem[]) => items.length > 0 && items.every(i => i.name.trim() && i.qty > 0);
