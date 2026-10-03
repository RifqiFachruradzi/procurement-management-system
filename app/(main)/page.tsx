'use client';
import { Banknote, ClipboardList, FileCheck2, FileText, Plus, ReceiptText, RotateCcw, Send, Truck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProgressStrip, useTrack } from '@/components/tracking';
import { Badge, Card, Empty, PageHead, StatusBadge } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { PO_FLOW, PO_INVOICEABLE, PO_STAGES } from '@/lib/constants';
import { fdate, rp } from '@/lib/format';
import { useDB } from '@/lib/store';
import type { PR } from '@/lib/types';

export default function Dashboard() {
  const { prs, pos, invoices, vouchers, settings } = useDB();
  const openPO = pos.filter(p => p.status === 'Open');
  const unpaid = invoices.filter(i => i.status !== 'Paid');

  const kpis = [
    { l: 'PR Open', v: prs.filter(p => p.status === 'Open').length, s: `${prs.filter(p => p.status === 'Closed').length} PR closed`, i: ClipboardList, h: '/pr?status=Open' },
    { l: 'PO Open', v: openPO.length, s: `${pos.filter(p => p.status === 'Closed').length} PO closed`, i: FileText, h: '/po?status=Open' },
    { l: 'Nilai PO Open', v: rp(openPO.reduce((s, p) => s + poTotals(p).total, 0)), s: 'Termasuk PPN', i: Wallet, h: '/po?status=Open' },
    { l: 'Hutang Belum Dibayar', v: rp(unpaid.reduce((s, i) => s + i.payable, 0)), s: `${unpaid.length} tagihan`, i: ReceiptText, h: '/invoices?status=Open' },
  ];
  const todos = [
    { l: 'PR menunggu approval', n: prs.filter(p => p.status === 'Open' && p.stage === 'SUBMITTED').length, i: ClipboardList, h: '/pr?stage=SUBMITTED' },
    { l: 'PR disetujui, belum dibuat PO', n: prs.filter(p => p.status === 'Open' && p.stage === 'APPROVED').length, i: Plus, h: '/pr?stage=APPROVED' },
    { l: 'PO menunggu approval atasan', n: pos.filter(p => p.stage === 'PENDING').length, i: FileText, h: '/po?stage=PENDING' },
    { l: 'PO menunggu persetujuan vendor', n: pos.filter(p => p.stage === 'SENT').length, i: Send, h: '/po?stage=SENT' },
    { l: 'PO ditolak, perlu revisi', n: pos.filter(p => p.stage === 'REJECTED' || p.stage === 'VENDOR_REJECTED').length, i: RotateCcw, h: '/po?stage=REJECTED' },
    { l: 'Barang dalam pengiriman', n: pos.filter(p => p.stage === 'SHIPPED').length, i: Truck, h: '/po?stage=SHIPPED' },
    { l: 'Tagihan belum dibuatkan Jurnal Voucher', n: invoices.filter(i => i.status === 'Posted' && !i.voucherId).length, i: FileCheck2, h: '/vouchers/new' },
    { l: 'Jurnal Voucher menunggu pemeriksaan/approval', n: vouchers.filter(v => v.status === 'Draft' || v.status === 'Checked').length, i: FileCheck2, h: '/vouchers?status=Checked' },
    { l: 'Jurnal Voucher siap dibayar kasir', n: vouchers.filter(v => v.status === 'Approved').length, i: Banknote, h: '/vouchers?status=Approved' },
    { l: 'PO belum ditagihkan vendor', n: pos.filter(p => p.status === 'Open' && !p.invoiceId && PO_INVOICEABLE.includes(p.stage)).length, i: ReceiptText, h: '/invoices/new' },
  ];
  const stageCounts = PO_FLOW.map(k => ({ k, n: pos.filter(p => p.stage === k).length }));
  const max = Math.max(1, ...stageCounts.map(s => s.n));

  return (
    <>
      <PageHead title="Dashboard" sub={`Ringkasan pengadaan ${settings.company}`}>
        <Link className="btn" href="/po/new"><FileText className="size-4" />Buat PO</Link>
        <Link className="btn btn-primary" href="/pr/new"><Plus className="size-4" />Buat PR</Link>
      </PageHead>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px]">
        {kpis.map(k => (
          <Link key={k.l} href={k.h} className="card px-[18px] py-4 transition-colors hover:border-muted/40">
            <div className="flex items-center gap-1.5 text-[13px] text-muted"><k.i className="size-4" />{k.l}</div>
            <div className="mt-1.5 text-[28px] font-bold">{k.v}</div>
            <div className="text-xs text-muted">{k.s}</div>
          </Link>
        ))}
      </div>

      <div className="mt-[18px] grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <Card title="Perlu Tindakan" bodyless>
          <ul>
            {todos.map(t => (
              <li key={t.l}>
                <Link href={t.h} className="flex items-center gap-3 border-b border-line px-[18px] py-3 hover:bg-surface-2">
                  <span className="grid size-[34px] place-items-center rounded-lg bg-surface-2"><t.i className="size-4" /></span>
                  <span>{t.l}</span>
                  <span className={`ml-auto text-lg font-bold ${t.n ? '' : 'text-muted'}`}>{t.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Posisi PO" right={<Link className="link" href="/po">Lihat semua</Link>}>
          <div className="flex flex-col gap-2.5">
            {stageCounts.map(s => (
              <Link key={s.k} href={`/po?stage=${s.k}`} className="grid grid-cols-[150px_1fr_30px] items-center gap-2.5 text-sm">
                <span>{PO_STAGES[s.k].label}</span>
                <div className="h-2 overflow-hidden rounded bg-neutral-bg"><div className="h-full rounded bg-accent transition-all" style={{ width: `${(s.n / max) * 100}%` }} /></div>
                <span className="text-right font-bold">{s.n}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-[18px]" title="PR Terbaru & Posisinya" right={<Link className="link" href="/tracking">Tracking lengkap</Link>} bodyless>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No PR</th><th>Pemohon</th><th>Progress</th><th>Posisi Saat Ini</th><th>Status</th></tr></thead>
            <tbody>
              {prs.slice(0, 6).map(pr => <RecentRow key={pr.id} pr={pr} />)}
              {!prs.length && <tr><td colSpan={5}><Empty msg="Belum ada PR" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function RecentRow({ pr }: { pr: PR }) {
  const router = useRouter();
  const t = useTrack(pr);
  return (
    <tr className="clickable" onClick={() => router.push(`/tracking/${pr.id}`)}>
      <td><b>{pr.no}</b><span className="sub">{fdate(pr.date)}</span></td>
      <td>{pr.requester}<span className="sub">{pr.department}</span></td>
      <td><ProgressStrip pr={pr} /></td>
      <td><Badge tone={t.position.tone}>{t.position.label}</Badge></td>
      <td><StatusBadge status={pr.status} /></td>
    </tr>
  );
}
