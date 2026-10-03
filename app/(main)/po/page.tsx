'use client';
import { Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useListState } from '@/components/list-state';
import { Badge, Empty, PageHead, SearchBox, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { PO_STAGES } from '@/lib/constants';
import { downloadCSV, fdate, rp } from '@/lib/format';
import { useDB } from '@/lib/store';
import type { POStage } from '@/lib/types';

export default function POListPage() {
  const router = useRouter();
  const { pos, prs, vendors, invoices } = useDB();
  const ls = useListState();
  const vName = (id: string) => vendors.find(v => v.id === id)?.name ?? '(vendor dihapus)';
  const prNo = (id: string) => prs.find(p => p.id === id)?.no ?? '-';

  let list = pos;
  if (ls.status !== 'All') list = list.filter(p => p.status === ls.status);
  if (ls.stage === 'REJECTED') list = list.filter(p => p.stage === 'REJECTED' || p.stage === 'VENDOR_REJECTED');
  else if (ls.stage) list = list.filter(p => p.stage === ls.stage);
  if (ls.q) list = list.filter(p => [p.no, prNo(p.prId), vName(p.vendorId), ...p.items.map(i => i.name)].join(' ').toLowerCase().includes(ls.q));

  const exportCSV = () => downloadCSV('purchase-order.csv', [
    ['No PO', 'Tanggal', 'No PR', 'Vendor', 'DPP', 'PPN', 'Total', 'Tahap', 'Status'],
    ...list.map(p => { const t = poTotals(p); return [p.no, p.date, prNo(p.prId), vName(p.vendorId), t.dpp, t.tax, t.total, PO_STAGES[p.stage].label, p.status]; }),
  ]);
  const stageLabel = ls.stage === 'REJECTED' ? 'Ditolak' : ls.stage ? PO_STAGES[ls.stage as POStage]?.label : '';

  return (
    <>
      <PageHead title="List Purchase Order" sub={`${pos.length} PO — ${pos.filter(p => p.status === 'Open').length} open, ${pos.filter(p => p.status === 'Closed').length} closed`}>
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
        <Link className="btn btn-primary" href="/po/new"><Plus className="size-4" />Buat PO</Link>
      </PageHead>
      <div className="card">
        <Toolbar>
          <Tabs value={ls.status} options={[['All', 'Semua'], ['Open', 'Open'], ['Closed', 'Closed']]} onChange={v => ls.set('status', v)} />
          <SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari nomor PO/PR, vendor, barang..." />
          {stageLabel && <><Badge tone="info">{stageLabel}</Badge><button className="link text-sm" onClick={ls.clearStage}>Hapus filter</button></>}
        </Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No PO</th><th>Tanggal</th><th>Ref PR</th><th>Vendor</th><th className="num">Total</th><th>Tahap / Posisi</th><th>Tagihan</th><th>Status</th></tr></thead>
            <tbody>
              {list.map(po => {
                const inv = invoices.find(i => i.id === po.invoiceId);
                return (
                  <tr key={po.id} className="clickable" onClick={() => router.push(`/po/${po.id}`)}>
                    <td><b>{po.no}</b></td>
                    <td>{fdate(po.date)}<span className="sub">Kirim: {fdate(po.deliveryDate)}</span></td>
                    <td>{prNo(po.prId)}</td>
                    <td>{vName(po.vendorId)}</td>
                    <td className="num">{rp(poTotals(po).total)}</td>
                    <td><Badge tone={PO_STAGES[po.stage].tone}>{PO_STAGES[po.stage].label}</Badge></td>
                    <td>{inv ? <Badge tone={inv.status === 'Paid' ? 'success' : 'info'}>{inv.status === 'Paid' ? 'Lunas' : 'Dijurnal'}</Badge> : <span className="text-muted">-</span>}</td>
                    <td><StatusBadge status={po.status} /></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8}><Empty msg="Tidak ada PO yang cocok" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
