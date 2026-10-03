import type { Journal, PO } from './types';

export function poTotals(po: Pick<PO, 'items' | 'discount' | 'taxRate'>) {
  const subtotal = po.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const discount = Number(po.discount) || 0;
  const dpp = Math.max(0, subtotal - discount);
  const tax = Math.round((dpp * (Number(po.taxRate) || 0)) / 100);
  return { subtotal, discount, dpp, tax, total: dpp + tax };
}

export const journalTotals = (j: Journal) =>
  j.lines.reduce((s, l) => ({ debit: s.debit + (l.debit || 0), credit: s.credit + (l.credit || 0) }), { debit: 0, credit: 0 });
