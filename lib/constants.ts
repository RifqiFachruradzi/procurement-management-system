import type { EventKey, PayMethod, POStage, PRStage, Tone, VoucherEventKey, VoucherStatus } from './types';

export const ACCOUNTS: Record<string, string> = {
  '1-1100': 'Kas Kecil',
  '1-1110': 'Bank BCA',
  '1-1120': 'Bank Mandiri',
  '1-1400': 'Persediaan Barang',
  '1-1500': 'PPN Masukan',
  '1-2100': 'Aset Tetap - Peralatan',
  '2-1100': 'Hutang Usaha',
  '2-1300': 'Hutang PPh 23',
  '5-1100': 'Beban Operasional',
  '5-1200': 'Beban Perlengkapan Kantor',
  '5-1300': 'Beban Jasa & Pemeliharaan',
};
export const DEBIT_ACCOUNTS = ['1-1400', '1-2100', '5-1100', '5-1200', '5-1300'];
export const CASH_ACCOUNTS = ['1-1110', '1-1120', '1-1100'];
export const PAY_METHODS: PayMethod[] = ['Transfer', 'Cek/Giro', 'Tunai'];

export const VOUCHER_STATUS: Record<VoucherStatus, { label: string; tone: Tone; hint: string }> = {
  Draft: { label: 'Draft — menunggu pemeriksaan', tone: 'warning', hint: 'Langkah berikutnya: diperiksa oleh Accounting.' },
  Checked: { label: 'Diperiksa — menunggu approval', tone: 'info', hint: 'Langkah berikutnya: disetujui oleh Finance Manager.' },
  Approved: { label: 'Disetujui — siap dibayar', tone: 'success', hint: 'Siap dibayar: kasir/finance melakukan pembayaran (bank keluar).' },
  Paid: { label: 'Dibayar', tone: 'neutral', hint: 'Pembayaran selesai dan jurnal pembayaran telah diposting.' },
  Cancelled: { label: 'Dibatalkan', tone: 'danger', hint: 'Voucher dibatalkan; tagihan kembali dapat dibuatkan voucher.' },
};
export const VOUCHER_FLOW: VoucherStatus[] = ['Draft', 'Checked', 'Approved', 'Paid'];
export const VOUCHER_EVENT_LABELS: Record<VoucherEventKey, string> = {
  CREATED: 'Voucher dibuat', CHECKED: 'Diperiksa', APPROVED: 'Disetujui', RETURNED: 'Dikembalikan untuk revisi',
  PAID: 'Dibayar (bank/kas keluar)', CANCELLED: 'Dibatalkan',
};
export const accName = (code: string) => `${code} ${ACCOUNTS[code] ?? ''}`;

export const PR_STAGES: Record<PRStage, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Menunggu Approval', tone: 'warning' },
  APPROVED: { label: 'Disetujui', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
  PO_CREATED: { label: 'PO Dibuat', tone: 'info' },
};

export const PO_STAGES: Record<POStage, { label: string; tone: Tone; hint: string }> = {
  PENDING: { label: 'Menunggu Approval Atasan', tone: 'warning', hint: 'Langkah berikutnya: approval atasan.' },
  REJECTED: { label: 'Ditolak Atasan', tone: 'danger', hint: 'Ditolak atasan — revisi PO lalu ajukan ulang.' },
  APPROVED: { label: 'Disetujui Atasan', tone: 'info', hint: 'Disetujui atasan — kirim PO ke vendor untuk persetujuan.' },
  SENT: { label: 'Menunggu Persetujuan Vendor', tone: 'warning', hint: 'Menunggu vendor menyetujui PO melalui link portal vendor.' },
  VENDOR_REJECTED: { label: 'Ditolak Vendor', tone: 'danger', hint: 'Ditolak vendor — revisi PO lalu ajukan ulang.' },
  ACCEPTED: { label: 'Disepakati Vendor', tone: 'success', hint: 'Disepakati vendor — menunggu pengiriman. Tagihan sudah dapat diinput.' },
  SHIPPED: { label: 'Dalam Pengiriman', tone: 'info', hint: 'Barang dalam perjalanan — lakukan penerimaan barang saat tiba.' },
  RECEIVED: { label: 'Barang Diterima', tone: 'success', hint: 'Barang diterima — input tagihan vendor untuk menutup PO.' },
  CLOSED: { label: 'Selesai', tone: 'neutral', hint: 'PO selesai (Closed).' },
};
export const PO_FLOW: POStage[] = ['PENDING', 'APPROVED', 'SENT', 'ACCEPTED', 'SHIPPED', 'RECEIVED', 'CLOSED'];
export const PO_EDITABLE: POStage[] = ['PENDING', 'REJECTED', 'VENDOR_REJECTED', 'APPROVED'];
export const PO_INVOICEABLE: POStage[] = ['ACCEPTED', 'SHIPPED', 'RECEIVED'];

export interface TrackStepDef { key: EventKey; label: string; src: 'pr' | 'po'; rej?: EventKey; revisable?: boolean }
export const TRACK_STEPS: TrackStepDef[] = [
  { key: 'PR_CREATED', label: 'PR Dibuat', src: 'pr' },
  { key: 'PR_APPROVED', label: 'PR Disetujui', src: 'pr', rej: 'PR_REJECTED', revisable: true },
  { key: 'PO_CREATED', label: 'PO Dibuat', src: 'po' },
  { key: 'PO_APPROVED', label: 'PO Disetujui Atasan', src: 'po', rej: 'PO_REJECTED', revisable: true },
  { key: 'PO_SENT', label: 'PO Dikirim ke Vendor', src: 'po', revisable: true },
  { key: 'VENDOR_ACCEPTED', label: 'PO Disetujui Vendor', src: 'po', rej: 'VENDOR_REJECTED', revisable: true },
  { key: 'SHIPPED', label: 'Barang Dikirim Vendor', src: 'po' },
  { key: 'RECEIVED', label: 'Barang Diterima (GR)', src: 'po' },
  { key: 'INVOICED', label: 'Tagihan Diinput & Dijurnal', src: 'po' },
  { key: 'CLOSED', label: 'Selesai / Closed', src: 'pr' },
];

export const EVENT_LABELS: Record<EventKey, string> = {
  PR_CREATED: 'PR dibuat', PR_UPDATED: 'PR diperbarui', PR_APPROVED: 'PR disetujui', PR_REJECTED: 'PR ditolak',
  PO_CREATED: 'PO dibuat', PO_UPDATED: 'PO diperbarui', PO_APPROVED: 'PO disetujui atasan', PO_REJECTED: 'PO ditolak atasan',
  REVISED: 'PO direvisi & diajukan ulang', PO_SENT: 'PO dikirim ke vendor', VENDOR_ACCEPTED: 'PO disetujui vendor',
  VENDOR_REJECTED: 'PO ditolak vendor', SHIPPED: 'Barang dikirim vendor', RECEIVED: 'Barang diterima',
  INVOICED: 'Tagihan diinput & dijurnal', PAID: 'Tagihan dibayar', CLOSED: 'Ditutup (Closed)', REOPENED: 'Dibuka kembali',
};
