'use client';
import { ArrowLeft, Banknote, BookText, Check, CheckCheck, Printer, Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { noteDialog, openDialog, toast } from '@/components/feedback';
import { NotFound } from '@/components/not-found';
import { Badge, Card, cx, PageHead } from '@/components/ui';
import { VoucherDocument } from '@/components/voucher-document';
import { accName, VOUCHER_EVENT_LABELS, VOUCHER_FLOW, VOUCHER_STATUS } from '@/lib/constants';
import { fdt, rp, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';

export default function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { vouchers, invoices, journals, settings, run } = useDB();
  const v = vouchers.find(x => x.id === id);
  if (!v) return <NotFound />;
  const st = v.status;
  const journal = journals.find(j => j.id === v.journalId);
  const idx = VOUCHER_FLOW.indexOf(st);

  const act = {
    check: () => noteDialog({ title: `Periksa ${v.no}`, message: `Pastikan tagihan, faktur pajak, dan nilai ${rp(v.amount)} sudah sesuai dokumen pendukung.`,
      confirm: 'Sudah Diperiksa', confirmClass: 'btn-success', byLabel: 'Diperiksa oleh', byValue: settings.checkerName,
      onConfirm: c => { run(d => ops.checkVoucher(d, v.id, c)); toast('Voucher diperiksa, menunggu approval'); } }),
    approve: () => noteDialog({ title: `Setujui ${v.no}`, message: `Pembayaran ${rp(v.amount)} kepada ${v.payTo.name}.`, confirm: 'Setujui Pembayaran',
      confirmClass: 'btn-success', byLabel: 'Disetujui oleh', byValue: settings.financeApprover,
      onConfirm: c => { run(d => ops.approveVoucher(d, v.id, c)); toast('Voucher disetujui, siap dibayar kasir'); } }),
    ret: () => noteDialog({ title: `Kembalikan ${v.no}`, confirm: 'Kembalikan ke Draft', confirmClass: 'btn-danger-solid', byLabel: 'Oleh',
      byValue: st === 'Checked' ? settings.financeApprover : settings.checkerName, noteLabel: 'Alasan / koreksi yang diperlukan', noteRequired: true,
      onConfirm: c => { run(d => ops.returnVoucher(d, v.id, c)); toast('Voucher dikembalikan ke Draft'); } }),
    cancel: () => noteDialog({ title: `Batalkan ${v.no}`, message: 'Tagihan dalam voucher ini akan kembali tersedia untuk dibuatkan voucher baru.', confirm: 'Batalkan Voucher',
      confirmClass: 'btn-danger-solid', noteLabel: 'Alasan', noteRequired: true,
      onConfirm: c => { run(d => ops.cancelVoucher(d, v.id, c)); toast('Voucher dibatalkan'); } }),
    pay: () => openDialog({
      title: `Pembayaran ${v.no} (${v.method === 'Tunai' ? 'Kas' : 'Bank'} Keluar)`, confirm: 'Posting Pembayaran', confirmClass: 'btn-success',
      message: <>Bayar <b className="text-fg">{rp(v.amount)}</b> kepada {v.payTo.name}{v.method !== 'Tunai' && ` (${v.payTo.bank} ${v.payTo.account})`} dari {accName(v.creditAccount)}.</>,
      fields: [
        { name: 'date', label: 'Tanggal Bayar', type: 'date', required: true, value: todayISO() },
        { name: 'ref', label: v.method === 'Cek/Giro' ? 'No. Cek / Giro' : v.method === 'Transfer' ? 'No. Referensi Transfer' : 'No. Bukti Kas', required: v.method !== 'Tunai' },
        { name: 'by', label: 'Dibayar oleh (Kasir)', required: true, value: settings.cashierName, full: true },
      ],
      onConfirm: x => {
        const jid = run(d => ops.payVoucher(d, v.id, { date: x.date, ref: x.ref, by: x.by }));
        toast(`Pembayaran diposting — ${useDB.getState().journals.find(j => j.id === jid)?.no}`);
      },
    }),
  };

  return (
    <>
      <PageHead title={v.no} sub={<><Badge tone={VOUCHER_STATUS[st].tone}>{VOUCHER_STATUS[st].label}</Badge><span>— {v.payTo.name} — {rp(v.amount)}</span></>}>
        <Link className="btn no-print" href="/vouchers"><ArrowLeft className="size-4" />List Voucher</Link>
      </PageHead>

      <div className="card no-print mb-[18px]">
        <div className="card-body flex flex-wrap items-center gap-4">
          <div className="min-w-[240px] flex-1">
            <div className="mb-1.5 text-[13px] text-muted">Alur Jurnal Voucher: Dibuat → Diperiksa → Disetujui → Dibayar</div>
            <div className="flex max-w-[420px] gap-[3px]">
              {VOUCHER_FLOW.map((k, i) => (
                <span key={k} title={VOUCHER_STATUS[k].label} className={cx('h-1.5 flex-1 rounded-[3px]',
                  st === 'Cancelled' ? 'bg-bad' : st === 'Paid' || i < idx ? 'bg-ok' : i === idx ? 'bg-brand' : 'bg-neutral-bg')} />
              ))}
            </div>
            <div className="mt-1.5 text-[13px] text-muted">{VOUCHER_STATUS[st].hint}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {st === 'Draft' && <>
              <button className="btn btn-danger" onClick={act.cancel}><X className="size-4" />Batalkan</button>
              <button className="btn btn-success" onClick={act.check}><Check className="size-4" />Periksa (Accounting)</button>
            </>}
            {st === 'Checked' && <>
              <button className="btn btn-danger" onClick={act.ret}><Undo2 className="size-4" />Kembalikan</button>
              <button className="btn btn-success" onClick={act.approve}><CheckCheck className="size-4" />Setujui (Finance Manager)</button>
            </>}
            {st === 'Approved' && <>
              <button className="btn btn-danger" onClick={act.ret}><Undo2 className="size-4" />Kembalikan</button>
              <button className="btn btn-primary" onClick={act.pay}><Banknote className="size-4" />Bayar (Kasir)</button>
            </>}
            {journal && <Link className="btn" href={`/journals/${journal.id}`}><BookText className="size-4" />{journal.no}</Link>}
            <button className="btn" onClick={() => window.print()}><Printer className="size-4" />Cetak</button>
          </div>
        </div>
      </div>

      <div className="grid gap-[18px] xl:grid-cols-[1.5fr_1fr]">
        <VoucherDocument v={v} />
        <div className="no-print space-y-[18px]">
          <Card title="Tagihan Terkait" bodyless>
            <ul>
              {v.invoiceIds.map(iid => {
                const inv = invoices.find(i => i.id === iid);
                return inv && (
                  <li key={iid}>
                    <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 border-b border-line px-[18px] py-3 hover:bg-surface-2">
                      <span><b>{inv.no}</b><span className="sub">{inv.vendorInvoiceNo}</span></span>
                      <span className="text-right">{rp(inv.payable)}<span className="sub">{inv.status === 'Paid' ? 'Lunas' : 'Belum dibayar'}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Riwayat Voucher" bodyless>
            <table className="tbl">
              <tbody>
                {[...v.history].reverse().map((e, i) => (
                  <tr key={i}><td className="w-[150px] text-sm text-muted">{fdt(e.at)}</td><td><b>{VOUCHER_EVENT_LABELS[e.key]}</b><span className="sub">{e.by}{e.note && ` — ${e.note}`}</span></td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
