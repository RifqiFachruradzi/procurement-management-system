'use client';
import { ArrowLeft, FileCheck2, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { JournalTable } from '@/components/journal-table';
import { NotFound } from '@/components/not-found';
import { Badge, Card, DL, PageHead } from '@/components/ui';
import { VOUCHER_STATUS } from '@/lib/constants';
import { fdate, rp } from '@/lib/format';
import { useDB } from '@/lib/store';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { invoices, pos, vendors, journals, vouchers } = useDB();
  const inv = invoices.find(i => i.id === id);
  if (!inv) return <NotFound />;
  const po = pos.find(p => p.id === inv.poId);
  const v = vendors.find(x => x.id === inv.vendorId);
  const voucher = vouchers.find(x => x.id === inv.voucherId);
  const js = inv.journalIds.map(j => journals.find(x => x.id === j)).filter(x => !!x);

  return (
    <>
      <PageHead title={inv.no} sub={<>{inv.status === 'Paid' ? <Badge tone="success">Lunas</Badge> : <Badge tone={voucher ? 'warning' : 'info'}>{voucher ? 'Dalam proses pembayaran' : 'Dijurnal — belum dibayar'}</Badge>}<span>— {v?.name}</span></>}>
        <Link className="btn" href="/invoices"><ArrowLeft className="size-4" />List Tagihan</Link>
        {po && <Link className="btn" href={`/po/${po.id}`}><FileText className="size-4" />{po.no}</Link>}
        {voucher && <Link className="btn" href={`/vouchers/${voucher.id}`}><FileCheck2 className="size-4" />{voucher.no}</Link>}
        {inv.status === 'Posted' && !voucher && (
          <Link className="btn btn-primary" href={`/vouchers/new?inv=${inv.id}`}><FileCheck2 className="size-4" />Buat Jurnal Voucher</Link>
        )}
      </PageHead>
      <div className="grid gap-[18px] lg:grid-cols-2">
        <Card title="Detail Tagihan" className="self-start">
          <DL items={[
            ['No. Invoice Vendor', inv.vendorInvoiceNo], ['No. Faktur Pajak', inv.taxInvoiceNo || '-'],
            ['Tanggal', fdate(inv.date)], ['Jatuh Tempo', fdate(inv.dueDate)],
            ['No PO', po?.no ?? '-'], ['Vendor', v?.name ?? '-'],
            ['DPP', rp(inv.dpp)], ['PPN', rp(inv.tax)],
            [`PPh 23 (${inv.pphRate}%)`, rp(inv.pph)], ['Total Tagihan', rp(inv.total)],
            ['Hutang ke Vendor', rp(inv.payable)], ['Jurnal Voucher', voucher ? `${voucher.no} — ${VOUCHER_STATUS[voucher.status].label}` : '-'], ...(inv.paidDate ? [['Tanggal Bayar', fdate(inv.paidDate)] as [string, string]] : []),
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
