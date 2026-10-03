'use client';
import { accName } from '@/lib/constants';
import { fdate, rp, terbilang } from '@/lib/format';
import { voucherLines } from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { Approval, Voucher } from '@/lib/types';

function Sign({ title, a, fallback, label = 'Disetujui' }: { title: string; a?: { by: string; at?: string; date?: string }; fallback: string; label?: string }) {
  return (
    <div className="text-center">
      <div>{title}</div>
      <div className="grid h-14 place-items-center text-[11px] font-bold tracking-[.1em] text-green-700 uppercase">
        {a && <span>{label}<br />{fdate(a.at ?? a.date)}</span>}
      </div>
      <div className="border-t border-neutral-900 pt-2">{a ? a.by : fallback}</div>
    </div>
  );
}

/** Printable Journal Voucher — the basis document for the cashier to issue a bank/cash payment. */
export function VoucherDocument({ v }: { v: Voucher }) {
  const s = useDB(st => st.settings);
  const invoices = useDB(st => st.invoices);
  const pos = useDB(st => st.pos);
  const journal = useDB(st => st.journals.find(j => j.id === v.journalId));
  const invs = v.invoiceIds.map(id => invoices.find(i => i.id === id)).filter(i => !!i);
  const lines = voucherLines({ invoices }, v.invoiceIds, v.creditAccount);
  const created = { by: v.preparedBy, at: v.createdAt } as Approval;

  return (
    <div className="doc rounded-[10px] border border-line p-5 sm:p-10">
      <div className="flex flex-col justify-between gap-5 border-b-2 border-neutral-900 pb-4 sm:flex-row">
        <div>
          <b className="text-lg">{s.company}</b>
          <div className="text-[13px] text-neutral-600">{s.address}</div>
          <div className="text-[13px] text-neutral-600">NPWP {s.npwp}</div>
        </div>
        <div className="sm:text-right">
          <h2 className="text-[22px] tracking-[.06em]">JURNAL VOUCHER</h2>
          <div className="text-[13px] text-neutral-600">Bukti Pengeluaran {v.method === 'Tunai' ? 'Kas' : 'Bank'}</div>
          <div className="font-bold">{v.no}</div>
          <div className="text-[13px] text-neutral-600">Tanggal: {fdate(v.date)}</div>
          {(v.status === 'Paid' || v.status === 'Cancelled') && (
            <div className={`mt-2 inline-block -rotate-6 rounded border-2 px-3 py-0.5 text-sm font-bold tracking-[.2em] uppercase ${v.status === 'Paid' ? 'border-green-700 text-green-700' : 'border-red-700 text-red-700'}`}>
              {v.status === 'Paid' ? 'Lunas' : 'Batal'}
            </div>
          )}
        </div>
      </div>

      <div className="my-5 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[11px] tracking-[.08em] text-neutral-500 uppercase">Dibayarkan kepada</span>
          <b>{v.payTo.name}</b><br />
          {v.method === 'Tunai' ? 'Pembayaran tunai' : <>Rek. {v.payTo.bank} {v.payTo.account}</>}
        </div>
        <div>
          <span className="mb-1 block text-[11px] tracking-[.08em] text-neutral-500 uppercase">Cara bayar / Sumber dana</span>
          {v.method} — {accName(v.creditAccount)}
          {v.payment && <><br />Dibayar {fdate(v.payment.date)}{v.payment.ref && ` — Ref ${v.payment.ref}`}</>}
        </div>
      </div>

      <div className="mb-1 text-[11px] tracking-[.08em] text-neutral-500 uppercase">Rincian tagihan</div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>No Tagihan</th><th>Invoice Vendor</th><th>No PO</th><th>Jatuh Tempo</th><th className="num">Jumlah</th></tr></thead>
          <tbody>
            {invs.map(i => (
              <tr key={i.id}><td>{i.no}</td><td>{i.vendorInvoiceNo}</td><td>{pos.find(p => p.id === i.poId)?.no ?? '-'}</td><td>{fdate(i.dueDate)}</td><td className="num">{rp(i.payable)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={4} className="text-right">Total Dibayar</td><td className="num">{rp(v.amount)}</td></tr></tfoot>
        </table>
      </div>
      <div className="mt-3 rounded border border-neutral-300 px-3 py-2 text-sm"><b>Terbilang:</b> <i>{terbilang(v.amount)}</i></div>
      {v.description && <div className="mt-3 text-sm"><b>Keterangan:</b> {v.description}</div>}

      <div className="mt-5 mb-1 text-[11px] tracking-[.08em] text-neutral-500 uppercase">Jurnal {journal ? journal.no : '(diposting saat dibayar)'}</div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
          <tbody>
            {lines.map((l, i) => <tr key={i}><td className={l.credit ? 'pl-8' : ''}>{accName(l.account)}</td><td className="num">{l.debit ? rp(l.debit) : ''}</td><td className="num">{l.credit ? rp(l.credit) : ''}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="mt-9 grid grid-cols-2 gap-5 text-[13px] sm:grid-cols-4">
        <Sign title="Dibuat oleh" a={created} fallback={s.financeName} label="Dibuat" />
        <Sign title="Diperiksa oleh" a={v.checked} fallback={s.checkerName} label="Diperiksa" />
        <Sign title="Disetujui oleh" a={v.approved} fallback={s.financeApprover} />
        <Sign title="Dibayar oleh (Kasir)" a={v.payment} fallback={s.cashierName} label="Dibayar" />
      </div>
    </div>
  );
}
