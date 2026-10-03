'use client';
import { Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useListState } from '@/components/list-state';
import { Alert, Badge, Empty, PageHead, SearchBox, Tabs, Toolbar } from '@/components/ui';
import { PO_INVOICEABLE } from '@/lib/constants';
import { downloadCSV, fdate, rp, todayISO } from '@/lib/format';
import { useDB } from '@/lib/store';

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, pos, vendors } = useDB();
  const ls = useListState();
  const vName = (id: string) => vendors.find(v => v.id === id)?.name ?? '-';
  const poNo = (id: string) => pos.find(p => p.id === id)?.no ?? '-';

  let list = invoices;
  if (ls.status === 'Open') list = list.filter(i => i.status !== 'Paid');
  if (ls.status === 'Closed') list = list.filter(i => i.status === 'Paid');
  if (ls.q) list = list.filter(i => [i.no, i.vendorInvoiceNo, poNo(i.poId), vName(i.vendorId)].join(' ').toLowerCase().includes(ls.q));
  const pending = pos.filter(p => p.status === 'Open' && !p.invoiceId && PO_INVOICEABLE.includes(p.stage));

  const exportCSV = () => downloadCSV('tagihan-vendor.csv', [
    ['No Internal', 'No Invoice Vendor', 'No Faktur Pajak', 'Tanggal', 'Jatuh Tempo', 'No PO', 'Vendor', 'DPP', 'PPN', 'PPh', 'Total', 'Hutang', 'Status'],
    ...list.map(i => [i.no, i.vendorInvoiceNo, i.taxInvoiceNo, i.date, i.dueDate, poNo(i.poId), vName(i.vendorId), i.dpp, i.tax, i.pph, i.total, i.payable, i.status === 'Paid' ? 'Lunas' : 'Dijurnal']),
  ]);

  return (
    <>
      <PageHead title="Tagihan Vendor" sub="Input tagihan berdasarkan PO yang sudah disepakati vendor; jurnal terbentuk otomatis.">
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
        <Link className="btn btn-primary" href="/invoices/new"><Plus className="size-4" />Input Tagihan</Link>
      </PageHead>
      {pending.length > 0 && (
        <Alert tone="info" className="mb-[18px]">
          {pending.length} PO sudah disepakati vendor namun belum ditagihkan:{' '}
          {pending.map((p, i) => <span key={p.id}>{i > 0 && ', '}<Link className="link" href={`/invoices/new?po=${p.id}`}>{p.no}</Link></span>)}
        </Alert>
      )}
      <div className="card">
        <Toolbar>
          <Tabs value={ls.status} options={[['All', 'Semua'], ['Open', 'Belum Dibayar'], ['Closed', 'Lunas']]} onChange={v => ls.set('status', v)} />
          <SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari no tagihan, PO, vendor..." />
        </Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No Internal</th><th>No Invoice Vendor</th><th>Tanggal</th><th>Jatuh Tempo</th><th>No PO</th><th>Vendor</th><th className="num">Total</th><th className="num">Hutang</th><th>Status</th></tr></thead>
            <tbody>
              {list.map(i => {
                const overdue = i.status !== 'Paid' && i.dueDate < todayISO();
                return (
                  <tr key={i.id} className="clickable" onClick={() => router.push(`/invoices/${i.id}`)}>
                    <td><b>{i.no}</b></td><td>{i.vendorInvoiceNo}</td><td>{fdate(i.date)}</td>
                    <td>{fdate(i.dueDate)}{overdue && <span className="sub !text-bad">Lewat jatuh tempo</span>}</td>
                    <td>{poNo(i.poId)}</td><td>{vName(i.vendorId)}</td>
                    <td className="num">{rp(i.total)}</td><td className="num">{rp(i.payable)}</td>
                    <td>{i.status === 'Paid' ? <Badge tone="success">Lunas</Badge> : <Badge tone="info">Dijurnal</Badge>}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={9}><Empty msg="Belum ada tagihan" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
