'use client';
import { ArrowLeft, FileText, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { openDialog, toast } from '@/components/feedback';
import { JournalTable } from '@/components/journal-table';
import { NotFound } from '@/components/not-found';
import { Badge, Card, DL, PageHead } from '@/components/ui';
import { accName } from '@/lib/constants';
import { fdate, rp, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { invoices, pos, vendors, journals, run } = useDB();
  const inv = invoices.find(i => i.id === id);
  if (!inv) return <NotFound />;
  const po = pos.find(p => p.id === inv.poId);
  const v = vendors.find(x => x.id === inv.vendorId);
  const js = inv.journalIds.map(j => journals.find(x => x.id === j)).filter(x => !!x);

  const pay = () => openDialog({
    title: `Pembayaran ${inv.no}`, confirm: 'Posting Pembayaran',
    fields: [
      { name: 'date', label: 'Tanggal Bayar', type: 'date', required: true, value: todayISO() },
      { name: 'amount', label: 'Jumlah', type: 'readonly', value: rp(inv.payable) },
      { name: 'ref', label: 'Referensi (no. transfer / bukti)', full: true },
    ],
    message: `Jurnal: Debit ${accName('2-1100')} / Kredit ${accName('1-1100')}`,
    onConfirm: x => { run(d => ops.payInvoice(d, inv.id, { date: x.date, ref: x.ref })); toast('Pembayaran diposting'); },
  });

  return (
    <>
      <PageHead title={inv.no} sub={<>{inv.status === 'Paid' ? <Badge tone="success">Lunas</Badge> : <Badge tone="info">Dijurnal — belum dibayar</Badge>}<span>— {v?.name}</span></>}>
        <Link className="btn" href="/invoices"><ArrowLeft className="size-4" />List Tagihan</Link>
        {po && <Link className="btn" href={`/po/${po.id}`}><FileText className="size-4" />{po.no}</Link>}
        {inv.status !== 'Paid' && <button className="btn btn-primary" onClick={pay}><Wallet className="size-4" />Catat Pembayaran</button>}
      </PageHead>
      <div className="grid gap-[18px] lg:grid-cols-2">
        <Card title="Detail Tagihan" className="self-start">
          <DL items={[
            ['No. Invoice Vendor', inv.vendorInvoiceNo], ['No. Faktur Pajak', inv.taxInvoiceNo || '-'],
            ['Tanggal', fdate(inv.date)], ['Jatuh Tempo', fdate(inv.dueDate)],
            ['No PO', po?.no ?? '-'], ['Vendor', v?.name ?? '-'],
            ['DPP', rp(inv.dpp)], ['PPN', rp(inv.tax)],
            [`PPh 23 (${inv.pphRate}%)`, rp(inv.pph)], ['Total Tagihan', rp(inv.total)],
            ['Hutang ke Vendor', rp(inv.payable)], ...(inv.paidDate ? [['Tanggal Bayar', fdate(inv.paidDate)] as [string, string]] : []),
            ['Rekening Vendor', `${v?.bank ?? '-'} ${v?.account ?? ''}`, true],
            ...(inv.notes ? [['Keterangan', inv.notes, true] as [string, string, boolean]] : []),
          ]} />
        </Card>
        <div className="space-y-[18px]">
          {js.map(j => (
            <Card key={j.id} title={`${j.no} — ${j.type}`} right={<span className="text-muted">{fdate(j.date)}</span>} bodyless>
              <p className="px-[18px] pt-3.5 pb-2.5 text-muted">{j.description}</p>
              <JournalTable lines={j.lines} />
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
