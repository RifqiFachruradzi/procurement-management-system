export type Status = 'Open' | 'Closed';
export type PRStage = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PO_CREATED';
export type POStage = 'PENDING' | 'REJECTED' | 'APPROVED' | 'SENT' | 'VENDOR_REJECTED' | 'ACCEPTED' | 'SHIPPED' | 'RECEIVED' | 'CLOSED';
export type Priority = 'Rendah' | 'Normal' | 'Tinggi';
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'open';

export type EventKey =
  | 'PR_CREATED' | 'PR_UPDATED' | 'PR_APPROVED' | 'PR_REJECTED'
  | 'PO_CREATED' | 'PO_UPDATED' | 'PO_APPROVED' | 'PO_REJECTED' | 'REVISED' | 'PO_SENT'
  | 'VENDOR_ACCEPTED' | 'VENDOR_REJECTED' | 'SHIPPED' | 'RECEIVED' | 'INVOICED' | 'PAID'
  | 'CLOSED' | 'REOPENED';

export interface HistoryEvent { key: EventKey; at: string; by: string; note: string; po?: string }

/** PR lines carry no price: prices are set with the vendor when the PO is created. */
export interface PRItem { name: string; qty: number; unit: string }
export interface POItem { name: string; qty: number; unit: string; price: number }

export interface Vendor {
  id: string; code: string; name: string; category: string; contact: string; email: string; phone: string;
  address: string; npwp: string; terms: number; bank: string; account: string; rating: 'A' | 'B' | 'C'; active: boolean;
}

export interface PR {
  id: string; no: string; date: string; requester: string; department: string; neededDate: string;
  purpose: string; priority: Priority; items: PRItem[]; status: Status; stage: PRStage; poId: string | null;
  history: HistoryEvent[];
}

export interface Approval { by: string; at: string; note: string; rejected?: boolean }
export interface Shipment { date: string; courier: string; ref: string }
export interface Receipt { date: string; receiver: string; note: string }

export interface PO {
  id: string; no: string; date: string; prId: string; vendorId: string; items: POItem[];
  discount: number; taxRate: number; deliveryDate: string; paymentTerms: number; shipTo: string; notes: string;
  status: Status; stage: POStage; invoiceId: string | null; received: boolean;
  approvals: { internal?: Approval; vendor?: Approval };
  shipment: Shipment | null; receipt: Receipt | null; history: HistoryEvent[];
}

export interface Invoice {
  id: string; no: string; vendorInvoiceNo: string; taxInvoiceNo: string; date: string; dueDate: string;
  poId: string; vendorId: string; dpp: number; tax: number; pph: number; pphRate: number; total: number; payable: number;
  debitAccount: string; notes: string; status: 'Posted' | 'Paid'; paidDate?: string; journalIds: string[]; createdAt: string;
  /** Payment voucher that settles this invoice (null while not yet proposed for payment). */
  voucherId?: string | null;
}

export interface JournalLine { account: string; debit: number; credit: number }
export interface Journal {
  id: string; no: string; date: string; type: 'Pembelian' | 'Pembayaran'; ref: string; description: string;
  lines: JournalLine[]; invoiceId?: string; voucherId?: string; createdAt: string;
}

export type VoucherStatus = 'Draft' | 'Checked' | 'Approved' | 'Paid' | 'Cancelled';
export type PayMethod = 'Transfer' | 'Cek/Giro' | 'Tunai';
export type VoucherEventKey = 'CREATED' | 'CHECKED' | 'APPROVED' | 'RETURNED' | 'PAID' | 'CANCELLED';
export interface VoucherEvent { key: VoucherEventKey; at: string; by: string; note: string }

/** Journal Voucher: the payment document that authorises the cashier to pay a vendor (bank/cash out). */
export interface Voucher {
  id: string; no: string; date: string; vendorId: string; invoiceIds: string[]; amount: number;
  method: PayMethod; creditAccount: string; description: string;
  payTo: { name: string; bank: string; account: string };
  status: VoucherStatus; preparedBy: string;
  checked?: Approval; approved?: Approval;
  payment?: { date: string; ref: string; by: string };
  journalId?: string; createdAt: string; history: VoucherEvent[];
}

export interface Settings {
  company: string; address: string; npwp: string; userName: string; approverName: string; shipTo: string;
  financeName: string; checkerName: string; financeApprover: string; cashierName: string;
}

export interface DB {
  settings: Settings; counters: Record<string, number>;
  vendors: Vendor[]; prs: PR[]; pos: PO[]; invoices: Invoice[]; journals: Journal[]; vouchers: Voucher[];
}
