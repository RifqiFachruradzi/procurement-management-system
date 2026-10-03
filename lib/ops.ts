/* Business operations. Each op mutates the given DB (an immer draft inside the store, or a plain object while seeding). */
import { poTotals } from './calc';
import { nowISO, round, uid } from './format';
import type { DB, EventKey, HistoryEvent, Invoice, Journal, PO, POItem, PR, PRItem, Priority, Receipt, Shipment, Vendor } from './types';

export interface Ctx { at?: string; by?: string; note?: string }

const ev = (d: DB, key: EventKey, c: Ctx = {}): HistoryEvent => ({
  key, at: c.at || nowISO(), by: c.by || d.settings.userName, note: c.note || '',
});

export function nextNo(d: DB, prefix: string, at?: string) {
  const year = new Date(at || Date.now()).getFullYear();
  const k = `${prefix}-${year}`;
  d.counters[k] = (d.counters[k] || 0) + 1;
  return `${prefix}/${year}/${String(d.counters[k]).padStart(4, '0')}`;
}

const find = <T extends { id: string }>(list: T[], id: string | null | undefined) => {
  const x = list.find(i => i.id === id);
  if (!x) throw new Error(`Data tidak ditemukan: ${id}`);
  return x;
};

/* ---------- Purchase Request ---------- */
export interface PRInput {
  requester: string; department: string; date?: string; neededDate: string; purpose: string; priority?: Priority; items: PRItem[];
}

export function createPR(d: DB, data: PRInput, c: Ctx = {}) {
  const at = c.at || nowISO();
  const pr: PR = {
    id: uid(), no: nextNo(d, 'PR', at), date: data.date || at.slice(0, 10),
    requester: data.requester, department: data.department, neededDate: data.neededDate,
    purpose: data.purpose, priority: data.priority || 'Normal', items: data.items,
    status: 'Open', stage: 'SUBMITTED', poId: null,
    history: [ev(d, 'PR_CREATED', { ...c, at, by: data.requester })],
  };
  d.prs.unshift(pr);
  return pr.id;
}

export function updatePR(d: DB, id: string, data: PRInput, c: Ctx = {}) {
  const pr = find(d.prs, id);
  Object.assign(pr, data);
  if (pr.stage === 'REJECTED') pr.stage = 'SUBMITTED';
  pr.history.push(ev(d, 'PR_UPDATED', c));
  return pr.id;
}

export function approvePR(d: DB, id: string, c: Ctx = {}) {
  const pr = find(d.prs, id);
  pr.stage = 'APPROVED';
  pr.history.push(ev(d, 'PR_APPROVED', { by: d.settings.approverName, ...c }));
}
export function rejectPR(d: DB, id: string, c: Ctx = {}) {
  const pr = find(d.prs, id);
  pr.stage = 'REJECTED';
  pr.history.push(ev(d, 'PR_REJECTED', { by: d.settings.approverName, ...c }));
}
export function closePR(d: DB, id: string, c: Ctx = {}) {
  const pr = find(d.prs, id);
  pr.status = 'Closed';
  pr.history.push(ev(d, 'CLOSED', c));
}
export function reopenPR(d: DB, id: string, c: Ctx = {}) {
  const pr = find(d.prs, id);
  pr.status = 'Open';
  pr.history = pr.history.filter(e => e.key !== 'CLOSED');
  pr.history.push(ev(d, 'REOPENED', c));
}

/* ---------- Purchase Order ---------- */
export interface POInput {
  prId: string; vendorId: string; date?: string; items: POItem[]; discount: number; taxRate: number;
  deliveryDate: string; paymentTerms: number; shipTo: string; notes?: string;
}

export function createPO(d: DB, data: POInput, c: Ctx = {}) {
  const at = c.at || nowISO();
  const pr = d.prs.find(p => p.id === data.prId);
  const po: PO = {
    id: uid(), no: nextNo(d, 'PO', at), date: data.date || at.slice(0, 10),
    prId: data.prId, vendorId: data.vendorId, items: data.items,
    discount: Number(data.discount) || 0, taxRate: Number(data.taxRate) || 0,
    deliveryDate: data.deliveryDate, paymentTerms: Number(data.paymentTerms) || 0,
    shipTo: data.shipTo, notes: data.notes || '',
    status: 'Open', stage: 'PENDING', invoiceId: null, received: false,
    approvals: {}, shipment: null, receipt: null,
    history: [ev(d, 'PO_CREATED', { ...c, at })],
  };
  d.pos.unshift(po);
  if (pr) { pr.poId = po.id; pr.stage = 'PO_CREATED'; }
  return po.id;
}

export function updatePO(d: DB, id: string, data: POInput, c: Ctx = {}) {
  const po = find(d.pos, id);
  Object.assign(po, data);
  if (po.stage === 'REJECTED' || po.stage === 'VENDOR_REJECTED' || po.stage === 'APPROVED') {
    po.stage = 'PENDING';
    po.approvals = {};
    po.history.push(ev(d, 'REVISED', c));
  } else po.history.push(ev(d, 'PO_UPDATED', c));
  return po.id;
}

export function approvePO(d: DB, id: string, c: Ctx = {}) {
  const po = find(d.pos, id);
  const e = ev(d, 'PO_APPROVED', { by: d.settings.approverName, ...c });
  po.stage = 'APPROVED';
  po.approvals.internal = { by: e.by, at: e.at, note: e.note };
  po.history.push(e);
}
export function rejectPO(d: DB, id: string, c: Ctx = {}) {
  const po = find(d.pos, id);
  const e = ev(d, 'PO_REJECTED', { by: d.settings.approverName, ...c });
  po.stage = 'REJECTED';
  po.approvals.internal = { by: e.by, at: e.at, note: e.note, rejected: true };
  po.history.push(e);
}
export function sendPO(d: DB, id: string, c: Ctx = {}) {
  const po = find(d.pos, id);
  po.stage = 'SENT';
  po.history.push(ev(d, 'PO_SENT', c));
}
export function vendorAccept(d: DB, id: string, c: Ctx = {}) {
  const po = find(d.pos, id);
  const e = ev(d, 'VENDOR_ACCEPTED', c);
  po.stage = 'ACCEPTED';
  po.approvals.vendor = { by: e.by, at: e.at, note: e.note };
  po.history.push(e);
}
export function vendorReject(d: DB, id: string, c: Ctx = {}) {
  const po = find(d.pos, id);
  const e = ev(d, 'VENDOR_REJECTED', c);
  po.stage = 'VENDOR_REJECTED';
  po.approvals.vendor = { by: e.by, at: e.at, note: e.note, rejected: true };
  po.history.push(e);
}
export function shipPO(d: DB, id: string, data: Shipment, c: Ctx = {}) {
  const po = find(d.pos, id);
  po.stage = 'SHIPPED';
  po.shipment = data;
  po.history.push(ev(d, 'SHIPPED', { ...c, note: [data.courier, data.ref].filter(Boolean).join(' — ') }));
}
export function receivePO(d: DB, id: string, data: Receipt, c: Ctx = {}) {
  const po = find(d.pos, id);
  po.stage = 'RECEIVED';
  po.received = true;
  po.receipt = data;
  po.history.push(ev(d, 'RECEIVED', { ...c, by: data.receiver || c.by, note: data.note }));
  autoClose(d, po, c);
}
export function closePO(d: DB, id: string, c: Ctx = {}) {
  const po = find(d.pos, id);
  po.stage = 'CLOSED';
  po.status = 'Closed';
  po.history.push(ev(d, 'CLOSED', c));
  const pr = d.prs.find(p => p.id === po.prId);
  if (pr && pr.status !== 'Closed') { pr.status = 'Closed'; pr.history.push(ev(d, 'CLOSED', c)); }
}
function autoClose(d: DB, po: PO, c: Ctx) {
  if (po.received && po.invoiceId && po.status !== 'Closed') {
    closePO(d, po.id, { ...c, note: 'Otomatis: barang diterima & tagihan telah dijurnal' });
  }
}

/* ---------- Invoice & journal ---------- */
export interface InvoiceInput {
  poId: string; vendorInvoiceNo: string; taxInvoiceNo?: string; date: string; dueDate: string;
  dpp: number; tax: number; pphRate: number; debitAccount: string; notes?: string;
}

export function invoicePreview(i: Pick<InvoiceInput, 'dpp' | 'tax' | 'pphRate' | 'debitAccount'>) {
  const dpp = round(i.dpp), tax = round(i.tax);
  const pph = Math.round((dpp * (Number(i.pphRate) || 0)) / 100);
  const total = dpp + tax;
  const payable = total - pph;
  const lines = [{ account: i.debitAccount, debit: dpp, credit: 0 }];
  if (tax) lines.push({ account: '1-1500', debit: tax, credit: 0 });
  lines.push({ account: '2-1100', debit: 0, credit: payable });
  if (pph) lines.push({ account: '2-1300', debit: 0, credit: pph });
  return { dpp, tax, pph, total, payable, lines };
}

export function postInvoice(d: DB, data: InvoiceInput, c: Ctx = {}) {
  const at = c.at || nowISO();
  const po = find(d.pos, data.poId);
  const p = invoicePreview(data);
  const vendor = d.vendors.find(v => v.id === po.vendorId);
  const inv: Invoice = {
    id: uid(), no: nextNo(d, 'INV', at), vendorInvoiceNo: data.vendorInvoiceNo, taxInvoiceNo: data.taxInvoiceNo || '',
    date: data.date, dueDate: data.dueDate, poId: po.id, vendorId: po.vendorId,
    dpp: p.dpp, tax: p.tax, pph: p.pph, pphRate: Number(data.pphRate) || 0, total: p.total, payable: p.payable,
    debitAccount: data.debitAccount, notes: data.notes || '', status: 'Posted', journalIds: [], createdAt: at,
  };
  const j: Journal = {
    id: uid(), no: nextNo(d, 'JV', at), date: data.date, type: 'Pembelian', ref: `${inv.no} / ${po.no}`,
    description: `Tagihan ${vendor?.name ?? ''} No. ${data.vendorInvoiceNo} atas ${po.no}`,
    lines: p.lines, invoiceId: inv.id, createdAt: at,
  };
  inv.journalIds.push(j.id);
  d.invoices.unshift(inv);
  d.journals.unshift(j);
  po.invoiceId = inv.id;
  po.history.push(ev(d, 'INVOICED', { ...c, at, note: `${inv.no} — ${j.no}` }));
  autoClose(d, po, { ...c, at });
  return inv.id;
}

export function payInvoice(d: DB, id: string, data: { date: string; ref?: string }, c: Ctx = {}) {
  const at = c.at || nowISO();
  const inv = find(d.invoices, id);
  const po = d.pos.find(p => p.id === inv.poId);
  const vendor = d.vendors.find(v => v.id === inv.vendorId);
  const j: Journal = {
    id: uid(), no: nextNo(d, 'JV', at), date: data.date, type: 'Pembayaran', ref: `${inv.no} / ${po?.no ?? ''}`,
    description: `Pembayaran ${vendor?.name ?? ''} No. ${inv.vendorInvoiceNo}${data.ref ? ' — ' + data.ref : ''}`,
    lines: [{ account: '2-1100', debit: inv.payable, credit: 0 }, { account: '1-1100', debit: 0, credit: inv.payable }],
    invoiceId: inv.id, createdAt: at,
  };
  d.journals.unshift(j);
  inv.journalIds.push(j.id);
  inv.status = 'Paid';
  inv.paidDate = data.date;
  if (po) po.history.push(ev(d, 'PAID', { ...c, at, note: j.no }));
}

/* ---------- Vendor ---------- */
export type VendorInput = Omit<Vendor, 'id' | 'code'> & { id?: string; code?: string };

export function saveVendor(d: DB, data: VendorInput) {
  if (data.id) {
    Object.assign(find(d.vendors, data.id), data);
    return data.id;
  }
  const v: Vendor = { ...data, id: uid(), code: nextNo(d, 'VND').replace(/\/\d{4}\//, '-') } as Vendor;
  d.vendors.push(v);
  return v.id;
}
export function deleteVendor(d: DB, id: string) {
  if (d.pos.some(p => p.vendorId === id)) return false;
  d.vendors = d.vendors.filter(v => v.id !== id);
  return true;
}

