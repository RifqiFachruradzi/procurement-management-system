'use client';
import { ArrowLeft, FileCheck2, Printer, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { JournalTable } from '@/components/journal-table';
import { NotFound } from '@/components/not-found';
import { Badge, Card, DL, PageHead } from '@/components/ui';
import { fdate, fdt } from '@/lib/format';
import { useDB } from '@/lib/store';

export default function JournalEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { journals, invoices, vouchers, settings } = useDB();
  const j = journals.find(x => x.id === id);
  if (!j) return <NotFound />;
  const inv = invoices.find(i => i.id === j.invoiceId);
  const v = vouchers.find(x => x.id === j.voucherId);

  return (
    <>
      <PageHead title={j.no} sub={<><Badge tone={j.type === 'Pembelian' ? 'info' : 'success'}>{j.type}</Badge><span>— {fdate(j.date)}</span></>}>
        <Link className="btn no-print" href="/journals"><ArrowLeft className="size-4" />List Jurnal Entry</Link>
        {inv && <Link className="btn no-print" href={`/invoices/${inv.id}`}><ReceiptText className="size-4" />{inv.no}</Link>}
        {v && <Link className="btn no-print" href={`/vouchers/${v.id}`}><FileCheck2 className="size-4" />{v.no}</Link>}
        <button className="btn no-print" onClick={() => window.print()}><Printer className="size-4" />Cetak</button>
      </PageHead>
      <div className="grid gap-[18px] lg:grid-cols-[1fr_1.4fr]">
        <Card title="Informasi Jurnal" className="self-start">
          <DL items={[
            ['No Jurnal', j.no], ['Tanggal', fdate(j.date)], ['Tipe', j.type], ['Perusahaan', settings.company],
            ['Referensi', j.ref, true], ['Keterangan', <span key="d" className="font-normal">{j.description}</span>, true],
            ['Sumber', v ? `Jurnal Voucher ${v.no}` : inv ? `Tagihan Vendor ${inv.no}` : '-'], ['Diposting', fdt(j.createdAt)],
          ]} />
        </Card>
        <Card title="Baris Jurnal" bodyless><JournalTable lines={j.lines} /></Card>
      </div>
    </>
  );
}
