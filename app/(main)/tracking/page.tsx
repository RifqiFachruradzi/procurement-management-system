'use client';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useListState } from '@/components/list-state';
import { ProgressStrip } from '@/components/tracking';
import { Badge, Empty, PageHead, SearchBox, Tabs, Toolbar } from '@/components/ui';
import { fdt } from '@/lib/format';
import { useDB } from '@/lib/store';
import { trackPR } from '@/lib/track';

export default function TrackingListPage() {
  const router = useRouter();
  const db = useDB();
  const ls = useListState('Open');
  const vName = (id: string) => db.vendors.find(v => v.id === id)?.name ?? '';
  const rows = db.prs
    .filter(p => ls.status === 'All' || p.status === ls.status)
    .map(pr => ({ pr, t: trackPR(db, pr) }))
    .filter(({ pr, t }) => !ls.q || [pr.no, pr.requester, pr.department, pr.purpose, t.po?.no, t.po && vName(t.po.vendorId)].join(' ').toLowerCase().includes(ls.q));

  return (
    <>
      <PageHead title="Tracking PR s/d Barang Datang" sub="Lihat posisi setiap PR: approval, PO, persetujuan vendor, pengiriman, penerimaan, hingga tagihan." />
      <div className="card">
        <Toolbar>
          <Tabs value={ls.status} options={[['Open', 'Open'], ['Closed', 'Closed'], ['All', 'Semua']]} onChange={v => ls.set('status', v)} />
          <SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari no PR/PO, pemohon, vendor..." />
        </Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No PR</th><th>No PO / Vendor</th><th>Progress</th><th>Posisi Saat Ini</th><th>Update Terakhir</th><th /></tr></thead>
            <tbody>
              {rows.map(({ pr, t }) => {
                const last = t.steps.map(s => s.event).filter(Boolean).sort((a, b) => a!.at.localeCompare(b!.at)).pop();
                return (
                  <tr key={pr.id} className="clickable" onClick={() => router.push(`/tracking/${pr.id}`)}>
                    <td><b>{pr.no}</b><span className="sub">{pr.requester} — {pr.department}</span></td>
                    <td>{t.po ? <>{t.po.no}<span className="sub">{vName(t.po.vendorId)}</span></> : <span className="text-muted">Belum ada PO</span>}</td>
                    <td><ProgressStrip pr={pr} /><span className="sub mt-1">{t.doneCount} dari {t.steps.length} tahap</span></td>
                    <td><Badge tone={t.position.tone}>{t.position.label}</Badge></td>
                    <td className="whitespace-nowrap">{fdt(last?.at)}</td>
                    <td><ChevronRight className="size-4 text-muted" /></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}><Empty msg="Tidak ada PR" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
