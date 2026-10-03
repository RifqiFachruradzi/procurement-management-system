import type { Journal, PO } from './types';

export function poTotals(po: Pick<PO, 'items' | 'discount' | 'taxRate'> & { discountRate?: number | null }) {
  const subtotal = po.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const byRate = po.discountRate != null;
  const discount = byRate ? Math.round((subtotal * (Number(po.discountRate) || 0)) / 100) : Number(po.discount) || 0;
  const discountRate = byRate ? Number(po.discountRate) || 0 : subtotal ? (discount / subtotal) * 100 : 0;
  const dpp = Math.max(0, subtotal - discount);
  const tax = Math.round((dpp * (Number(po.taxRate) || 0)) / 100);
  return { subtotal, discount, discountRate, dpp, tax, total: dpp + tax };
}

/** Formats a percentage without trailing zeros, e.g. 10 -> "10", 2.5 -> "2,5", 0.3333 -> "0,33". */
export const pct = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0);

export const journalTotals = (j: Journal) =>
  j.lines.reduce((s, l) => ({ debit: s.debit + (l.debit || 0), credit: s.credit + (l.credit || 0) }), { debit: 0, credit: 0 });
