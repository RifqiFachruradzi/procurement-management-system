'use client';
import { ArrowLeft, Check, Eye, FileText, Lock, Pencil, RotateCcw, Unlock, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { noteDialog, toast } from '@/components/feedback';
import { NotFound } from '@/components/not-found';
import { HistoryCard, TrackingCard } from '@/components/tracking';
import { Badge, Card, DL, PageHead, StatusBadge } from '@/components/ui';
import { prTotal } from '@/lib/calc';
import { PR_STAGES } from '@/lib/constants';
import { fdate, num, rp } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';

export default function PRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pr = useDB(s => s.prs.find(p => p.id === id));
  const po = useDB(s => s.pos.find(p => p.id === pr?.poId));
  const run = useDB(s => s.run);
  const approver = useDB(s => s.settings.approverName);
  if (!pr) return <NotFound />;
  const open = pr.status === 'Open';

  const approve = () => noteDialog({
    title: `Setujui ${pr.no}`, confirm: 'Setujui', confirmClass: 'btn-success', byLabel: 'Disetujui oleh', byValue: approver,
    onConfirm: c => { run(d => ops.approvePR(d, pr.id, c)); toast('PR disetujui'); },
  });
  const reject = () => noteDialog({
    title: `Tolak ${pr.no}`, confirm: 'Tolak', confirmClass: 'btn-danger-solid', byLabel: 'Ditolak oleh', byValue: approver, noteLabel: 'Alasan penolakan', noteRequired: true,
    onConfirm: c => { run(d => ops.rejectPR(d, pr.id, c)); toast('PR ditolak'); },
  });
  const close = () => noteDialog({
    title: `Tutup ${pr.no}`, message: 'PR akan berstatus Closed.', confirm: 'Tutup PR', noteLabel: 'Alasan',
    onConfirm: c => { run(d => ops.closePR(d, pr.id, c)); toast('PR ditutup'); },
  });

  return (
    <>
      <PageHead title={pr.no} sub={<><Badge tone={PR_STAGES[pr.stage].tone}>{PR_STAGES[pr.stage].label}</Badge><StatusBadge status={pr.status} /></>}>
        <Link className="btn" href="/pr"><ArrowLeft className="size-4" />List PR</Link>
        {open && pr.stage === 'SUBMITTED' && <>
          <button className="btn btn-danger" onClick={reject}><X className="size-4" />Tolak</button>
          <button className="btn btn-success" onClick={approve}><Check className="size-4" />Setujui PR</button>
        </>}
        {open && (pr.stage === 'SUBMITTED' || pr.stage === 'REJECTED') && (
          <Link className="btn" href={`/pr/${pr.id}/edit`}>{pr.stage === 'REJECTED' ? <RotateCcw className="size-4" /> : <Pencil className="size-4" />}{pr.stage === 'REJECTED' ? 'Revisi' : 'Edit'}</Link>
        )}
        {open && pr.stage === 'APPROVED' && <Link className="btn btn-primary" href={`/po/new?pr=${pr.id}`}><FileText className="size-4" />Buat PO</Link>}
        {po && <Link className="btn" href={`/po/${po.id}`}><Eye className="size-4" />Lihat {po.no}</Link>}
        {open && (!po || po.status === 'Closed') && <button className="btn" onClick={close}><Lock className="size-4" />Tutup PR</button>}
        {!open && (!po || po.status !== 'Closed') && (
          <button className="btn" onClick={() => { run(d => ops.reopenPR(d, pr.id)); toast('PR dibuka kembali'); }}><Unlock className="size-4" />Buka Kembali</button>
        )}
      </PageHead>

      <div className="grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-[18px]">
          <Card title="Detail Permintaan">
            <DL items={[
              ['Pemohon', pr.requester], ['Departemen', pr.department], ['Tanggal PR', fdate(pr.date)],
              ['Dibutuhkan', fdate(pr.neededDate)], ['Prioritas', pr.priority], ['Estimasi Total', rp(prTotal(pr))],
              ['Keperluan', <span key="p" className="font-normal">{pr.purpose || '-'}</span>, true],
            ]} />
          </Card>
          <Card title="Item" bodyless>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>#</th><th>Barang / Jasa</th><th className="num">Qty</th><th className="num">Est. Harga</th><th className="num">Jumlah</th></tr></thead>
                <tbody>{pr.items.map((i, n) => <tr key={n}><td>{n + 1}</td><td>{i.name}</td><td className="num">{num(i.qty)} {i.unit}</td><td className="num">{rp(i.estPrice)}</td><td className="num">{rp(i.qty * i.estPrice)}</td></tr>)}</tbody>
                <tfoot><tr><td colSpan={4} className="text-right">Total Estimasi</td><td className="num">{rp(prTotal(pr))}</td></tr></tfoot>
              </table>
            </div>
          </Card>
          <HistoryCard events={[...pr.history, ...(po ? po.history.map(e => ({ ...e, po: po.no })) : [])]} />
        </div>
        <TrackingCard pr={pr} />
      </div>
    </>
  );
}
