'use client';
import { ArrowLeft, Check, Eye, FileText, Lock, Pencil, RotateCcw, Unlock, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { noteDialog, toast } from '@/components/feedback';
import { NotFound } from '@/components/not-found';
import { HistoryCard, TrackingCard, useTrack } from '@/components/tracking';
import { Badge, Card, DL, PageHead, StatusBadge } from '@/components/ui';
import { PR_STAGES } from '@/lib/constants';
import { fdate, fdt, num } from '@/lib/format';
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

  const waiting = open && (pr.stage === 'SUBMITTED' || pr.stage === 'SUPERVISOR_APPROVED');
  const level = pr.stage === 'SUBMITTED' ? 'Atasan Pemohon' : 'Procurement';
  const levelBy = pr.stage === 'SUBMITTED' ? pr.supervisor : approver;
  const approve = () => noteDialog({
    title: `Setujui ${pr.no} — ${level}`, confirm: 'Setujui', confirmClass: 'btn-success', byLabel: `Disetujui oleh (${level})`, byValue: levelBy,
    message: pr.stage === 'SUBMITTED' ? 'Setelah disetujui atasan pemohon, PR diteruskan ke Procurement untuk approval akhir.' : 'Approval akhir: PR dapat dibuatkan PO.',
    onConfirm: c => { run(d => ops.approvePR(d, pr.id, c)); toast(pr.stage === 'SUBMITTED' ? 'PR disetujui atasan pemohon, diteruskan ke Procurement' : 'PR disetujui Procurement, siap dibuat PO'); },
  });
  const reject = () => noteDialog({
    title: `Tolak ${pr.no} — ${level}`, confirm: 'Tolak', confirmClass: 'btn-danger-solid', byLabel: `Ditolak oleh (${level})`, byValue: levelBy, noteLabel: 'Alasan penolakan', noteRequired: true,
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
        {waiting && <>
          <button className="btn btn-danger" onClick={reject}><X className="size-4" />Tolak</button>
          <button className="btn btn-success" onClick={approve}><Check className="size-4" />Setujui ({level})</button>
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
              ['Pemohon', pr.requester], ['Atasan Pemohon', pr.supervisor || '-'], ['Departemen', pr.department], ['Tanggal PR', fdate(pr.date)],
              ['Dibutuhkan', fdate(pr.neededDate)], ['Prioritas', pr.priority], ['Jumlah Item', `${pr.items.length} item`],
              ['Keperluan', <span key="p" className="font-normal">{pr.purpose || '-'}</span>, true],
            ]} />
          </Card>
          <ApprovalCard prId={pr.id} />
          <Card title="Item" bodyless>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>#</th><th>Barang / Jasa</th><th className="num">Qty</th><th>Satuan</th></tr></thead>
                <tbody>{pr.items.map((i, n) => <tr key={n}><td>{n + 1}</td><td>{i.name}</td><td className="num">{num(i.qty)}</td><td>{i.unit}</td></tr>)}</tbody>
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

/** Signature-style summary of the PR approval chain: Pemohon → Atasan Pemohon → Procurement. */
function ApprovalCard({ prId }: { prId: string }) {
  const pr = useDB(s => s.prs.find(p => p.id === prId))!;
  const approver = useDB(s => s.settings.approverName);
  const t = useTrack(pr);
  const step = (key: string) => t.steps.find(s => s.key === key)!;
  const boxes = [
    { title: 'Pemohon', name: pr.requester, s: step('PR_CREATED'), ok: 'Diajukan' },
    { title: 'Atasan Pemohon', name: pr.supervisor || '-', s: step('PR_SUPERVISOR_APPROVED'), ok: 'Disetujui' },
    { title: 'Procurement', name: approver, s: step('PR_APPROVED'), ok: 'Disetujui' },
  ];
  return (
    <Card title="Persetujuan PR">
      <div className="grid gap-3 sm:grid-cols-3">
        {boxes.map(b => {
          const tone = b.s.state === 'done' ? 'text-ok' : b.s.state === 'rejected' ? 'text-bad' : b.s.state === 'current' ? 'text-warn' : 'text-muted';
          const label = b.s.state === 'done' ? b.ok : b.s.state === 'rejected' ? 'Ditolak' : b.s.state === 'current' ? 'Menunggu' : '-';
          return (
            <div key={b.title} className="rounded-lg border border-line p-3 text-center">
              <div className="text-xs tracking-wider text-muted uppercase">{b.title}</div>
              <div className={`my-2 text-xs font-bold tracking-[.1em] uppercase ${tone}`}>{label}</div>
              <div className="border-t border-line pt-2 font-bold">{b.s.event?.by ?? b.name}</div>
              <div className="text-xs text-muted">{b.s.event ? fdt(b.s.event.at) : '\u00a0'}</div>
              {b.s.event?.note && <div className="mt-1 text-xs text-muted">{b.s.event.note}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
