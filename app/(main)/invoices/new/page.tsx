'use client';
import { ArrowLeft, BookText } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { JournalTable } from '@/components/journal-table';
import { Alert, Badge, Card, DL, Field, FormGrid, PageHead } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { accName, DEBIT_ACCOUNTS, PO_INVOICEABLE, PO_STAGES } from '@/lib/constants';
import { addDays, fdate, num, rp, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { PO } from '@/lib/types';

export default function NewInvoicePage() {
  const router = useRouter();
  const poId = useSearchParams().get('po') ?? '';
  const { pos, vendors } = useDB();
  const eligible = pos.filter(p => p.status === 'Open' && !p.invoiceId && PO_INVOICEABLE.includes(p.stage));
  const po = pos.find(p => p.id === poId);
  const valid = !!po && eligible.includes(po);
  const vName = (id: string) => vendors.find(v => v.id === id)?.name ?? '-';

  return (
    <>
      <PageHead title="Input Tagihan Vendor" sub="Panggil nomor PO yang sudah disepakati vendor; sistem membentuk jurnal hutang.">
        <Link className="btn" href="/invoices"><ArrowLeft className="size-4" />Kembali</Link>
      </PageHead>
      <Card>
        <Field label="Nomor PO *" hint="Hanya PO berstatus Disepakati Vendor / Dalam Pengiriman / Barang Diterima yang belum ditagihkan.">
          <select className="input max-w-[560px]" value={valid ? poId : ''} onChange={e => router.replace(`/invoices/new${e.target.value ? '?po=' + e.target.value : ''}`, { scroll: false })}>
            <option value="">Pilih / cari nomor PO...</option>
            {eligible.map(p => <option key={p.id} value={p.id}>{p.no} — {vName(p.vendorId)} — {rp(poTotals(p).total)}</option>)}
          </select>
        </Field>
        {po && !valid && <Alert tone="warning" className="mt-4">{po.no} tidak dapat ditagihkan (status: {PO_STAGES[po.stage].label}{po.invoiceId ? ', sudah ditagihkan' : ''}).</Alert>}
        {!eligible.length && <Alert tone="info" className="mt-4">Belum ada PO yang siap ditagihkan.</Alert>}
      </Card>
      {valid && <InvoiceForm key={po.id} po={po} vendorName={vName(po.vendorId)} />}
    </>
  );
}

function InvoiceForm({ po, vendorName }: { po: PO; vendorName: string }) {
  const router = useRouter();
  const { run, invoices } = useDB();
  const t = poTotals(po);
  const [f, setF] = useState({
    vendorInvoiceNo: '', taxInvoiceNo: '', date: todayISO(), dueDate: addDays(todayISO(), po.paymentTerms),
    dpp: t.dpp, tax: t.tax, pphRate: 0, debitAccount: DEBIT_ACCOUNTS[0], notes: '',
  });
  const [tried, setTried] = useState(false);
  const p = ops.invoicePreview(f);
  const diff = p.total - t.total;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!f.vendorInvoiceNo.trim() || !f.date || !f.dueDate) return toast('Lengkapi field yang wajib diisi', true);
    if (invoices.some(i => i.vendorId === po.vendorId && i.vendorInvoiceNo.toLowerCase() === f.vendorInvoiceNo.trim().toLowerCase())) {
      return toast('No. invoice vendor ini sudah pernah diinput', true);
    }
    const id = run(d => ops.postInvoice(d, { ...f, vendorInvoiceNo: f.vendorInvoiceNo.trim(), poId: po.id }));
    toast(`${useDB.getState().invoices.find(i => i.id === id)?.no} diposting & jurnal terbentuk`);
    router.push(`/invoices/${id}`);
  };

  return (
    <>
      <Card className="mt-[18px]" title={`Data PO ${po.no}`} right={<Badge tone={PO_STAGES[po.stage].tone}>{PO_STAGES[po.stage].label}</Badge>} bodyless>
        <div className="card-body">
          <DL items={[
            ['Vendor', vendorName], ['Tanggal PO', fdate(po.date)], ['DPP PO', rp(t.dpp)], ['PPN PO', rp(t.tax)], ['Total PO', rp(t.total)],
            ['Penerimaan Barang', po.received && po.receipt ? `Diterima ${fdate(po.receipt.date)}` : 'Belum diterima'],
          ]} />
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Harga</th><th className="num">Jumlah</th></tr></thead>
            <tbody>{po.items.map((i, n) => <tr key={n}><td>{i.name}</td><td className="num">{num(i.qty)} {i.unit}</td><td className="num">{rp(i.price)}</td><td className="num">{rp(i.qty * i.price)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <form className="card mt-[18px]" onSubmit={submit} noValidate>
        <div className="card-head"><h3>Data Tagihan</h3></div>
        <div className="card-body">
          <FormGrid>
            <Field label="No. Invoice Vendor *"><input className={`input ${tried && !f.vendorInvoiceNo.trim() ? 'invalid' : ''}`} value={f.vendorInvoiceNo} onChange={e => setF({ ...f, vendorInvoiceNo: e.target.value })} /></Field>
            <Field label="No. Faktur Pajak"><input className="input" placeholder="010.000-26.xxxxxxxx" value={f.taxInvoiceNo} onChange={e => setF({ ...f, taxInvoiceNo: e.target.value })} /></Field>
            <Field label="Tanggal Invoice *"><input className="input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value, dueDate: addDays(e.target.value, po.paymentTerms) })} /></Field>
            <Field label="Jatuh Tempo *" hint={`Termin ${po.paymentTerms} hari`}><input className="input" type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></Field>
            <Field label="DPP (Rp) *"><input className="input" type="number" min={0} value={f.dpp} onChange={e => setF({ ...f, dpp: Number(e.target.value) })} /></Field>
            <Field label="PPN (Rp)"><input className="input" type="number" min={0} value={f.tax} onChange={e => setF({ ...f, tax: Number(e.target.value) })} /></Field>
            <Field label="PPh 23 dipotong (%)" hint="Untuk tagihan jasa, umumnya 2%"><input className="input" type="number" min={0} step="any" value={f.pphRate} onChange={e => setF({ ...f, pphRate: Number(e.target.value) })} /></Field>
            <Field label="Akun Debit *">
              <select className="input" value={f.debitAccount} onChange={e => setF({ ...f, debitAccount: e.target.value })}>
                {DEBIT_ACCOUNTS.map(c => <option key={c} value={c}>{accName(c)}</option>)}
              </select>
            </Field>
            <Field label="Keterangan" full><input className="input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
          </FormGrid>
        </div>
        <div className="card-body space-y-3.5 border-t border-line">
          {diff ? (
            <Alert tone="warning">Nilai tagihan berbeda {rp(Math.abs(diff))} ({diff > 0 ? 'lebih besar' : 'lebih kecil'}) dari nilai PO. Pastikan sudah dikonfirmasi dengan vendor.</Alert>
          ) : (
            <Alert tone="success">Nilai tagihan sesuai PO{po.received ? ' dan barang sudah diterima (3-way match).' : '. Barang belum diterima; PO akan Closed otomatis setelah penerimaan barang.'}</Alert>
          )}
          <h3 className="text-[15px]">Preview Jurnal</h3>
          <div className="rounded-lg border border-line"><JournalTable lines={p.lines} /></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-[18px] py-3.5">
          <Link className="btn" href="/invoices">Batal</Link>
          <button className="btn btn-primary" type="submit"><BookText className="size-4" />Posting Tagihan & Jurnal</button>
        </div>
      </form>
    </>
  );
}
