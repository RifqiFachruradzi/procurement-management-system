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

export interface PRItem { name: string; qty: number; unit: string; estPrice: number }
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
}

export interface JournalLine { account: string; debit: number; credit: number }
export interface Journal {
  id: string; no: string; date: string; type: 'Pembelian' | 'Pembayaran'; ref: string; description: string;
  lines: JournalLine[]; invoiceId: string; createdAt: string;
}

export interface Settings { company: string; address: string; npwp: string; userName: string; approverName: string; shipTo: string }

export interface DB {
  settings: Settings; counters: Record<string, number>;
  vendors: Vendor[]; prs: PR[]; pos: PO[]; invoices: Invoice[]; journals: Journal[];
}
