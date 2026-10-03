'use client';
import { Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useListState } from '@/components/list-state';
import { ProgressStrip } from '@/components/tracking';
import { Badge, Empty, PageHead, SearchBox, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { PR_STAGES } from '@/lib/constants';
import { downloadCSV, fdate, num } from '@/lib/format';
import { useDB } from '@/lib/store';
import { trackPR } from '@/lib/track';
import type { PRStage } from '@/lib/types';

export default function PRListPage() {
  const router = useRouter();
  const db = useDB();
  const ls = useListState();
  let list = db.prs;
  if (ls.status !== 'All') list = list.filter(p => p.status === ls.status);
  if (ls.stage) list = list.filter(p => p.stage === ls.stage && p.status === 'Open');
  if (ls.q) list = list.filter(p => [p.no, p.requester, p.department, p.purpose, ...p.items.map(i => i.name)].join(' ').toLowerCase().includes(ls.q));

  const exportCSV = () => downloadCSV('purchase-request.csv', [
    ['No PR', 'Tanggal', 'Pemohon', 'Departemen', 'Keperluan', 'Tgl Dibutuhkan', 'Item', 'Tahap', 'Posisi', 'Status'],
    ...list.map(p => [p.no, p.date, p.requester, p.department, p.purpose, p.neededDate, p.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join('; '), PR_STAGES[p.stage].label, trackPR(db, p).position.label, p.status]),
  ]);

  return (
    <>
      <PageHead title="List Purchase Request" sub={`${db.prs.length} PR — ${db.prs.filter(p => p.status === 'Open').length} open, ${db.prs.filter(p => p.status === 'Closed').length} closed`}>
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
        <Link className="btn btn-primary" href="/pr/new"><Plus className="size-4" />Buat PR</Link>
      </PageHead>
      <div className="card">
        <Toolbar>
          <Tabs value={ls.status} options={[['All', 'Semua'], ['Open', 'Open'], ['Closed', 'Closed']]} onChange={v => ls.set('status', v)} />
          <SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari nomor, pemohon, barang..." />
          {ls.stage && <><Badge tone="info">{PR_STAGES[ls.stage as PRStage]?.label}</Badge><button className="link text-sm" onClick={ls.clearStage}>Hapus filter</button></>}
        </Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No PR</th><th>Tanggal</th><th>Pemohon</th><th>Keperluan</th><th className="num">Item</th><th>Tahap PR</th><th>Posisi</th><th>Status</th></tr></thead>
            <tbody>
              {list.map(pr => (
                <tr key={pr.id} className="clickable" onClick={() => router.push(`/pr/${pr.id}`)}>
                  <td><b>{pr.no}</b>{pr.priority === 'Tinggi' && <span className="sub !text-bad">Prioritas tinggi</span>}</td>
                  <td>{fdate(pr.date)}<span className="sub">Butuh: {fdate(pr.neededDate)}</span></td>
                  <td>{pr.requester}<span className="sub">{pr.department}</span></td>
                  <td className="max-w-[260px]">{pr.purpose}<span className="sub">{pr.items.map(i => i.name).join(', ')}</span></td>
                  <td className="num">{pr.items.length}<span className="sub">{num(pr.items.reduce((s, i) => s + i.qty, 0))} qty</span></td>
                  <td><Badge tone={PR_STAGES[pr.stage].tone}>{PR_STAGES[pr.stage].label}</Badge></td>
                  <td><ProgressStrip pr={pr} withLabel /></td>
                  <td><StatusBadge status={pr.status} /></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8}><Empty msg="Tidak ada PR yang cocok" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
