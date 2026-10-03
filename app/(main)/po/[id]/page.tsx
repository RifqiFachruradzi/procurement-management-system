'use client';
import { ArrowLeft, Check, Copy, ExternalLink, Link2, Lock, Mail, Package, Pencil, Printer, ReceiptText, RotateCcw, Send, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { noteDialog, openDialog, toast } from '@/components/feedback';
import { NotFound } from '@/components/not-found';
import { PODocument } from '@/components/po-document';
import { HistoryCard, TrackingCard } from '@/components/tracking';
import { Alert, Badge, Card, cx, DL, PageHead, StatusBadge } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { PO_EDITABLE, PO_FLOW, PO_INVOICEABLE, PO_STAGES } from '@/lib/constants';
import { fdate, rp, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { getDB, useDB } from '@/lib/store';
import type { PO, Vendor } from '@/lib/types';

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const po = useDB(s => s.pos.find(p => p.id === id));
  const pr = useDB(s => s.prs.find(p => p.id === po?.prId));
  const v = useDB(s => s.vendors.find(x => x.id === po?.vendorId));
  const inv = useDB(s => s.invoices.find(i => i.id === po?.invoiceId));
  const { run, settings } = useDB();
  if (!po) return <NotFound />;
  const st = po.stage;
  const vendor = v ?? ({ name: '(vendor dihapus)', contact: '', email: '' } as Vendor);
  const vendorBy = `${vendor.contact} (${vendor.name})`;

  const act = {
    approve: () => noteDialog({ title: `Approval ${po.no}`, message: `Total ${rp(poTotals(po).total)} kepada ${vendor.name}.`, confirm: 'Setujui PO', confirmClass: 'btn-success',
      byLabel: 'Disetujui oleh', byValue: settings.approverName, onConfirm: c => { run(d => ops.approvePO(d, po.id, c)); toast('PO disetujui atasan. Siap dikirim ke vendor.'); } }),
    reject: () => noteDialog({ title: `Tolak ${po.no}`, confirm: 'Tolak PO', confirmClass: 'btn-danger-solid', byLabel: 'Ditolak oleh', byValue: settings.approverName,
      noteLabel: 'Alasan penolakan', noteRequired: true, onConfirm: c => { run(d => ops.rejectPO(d, po.id, c)); toast('PO ditolak'); } }),
    vaccept: () => noteDialog({ title: 'Catat Persetujuan Vendor', message: 'Gunakan ini bila vendor menyetujui via email/telepon. Vendor juga dapat menyetujui langsung melalui link portal.',
      confirm: 'Vendor Menyetujui', confirmClass: 'btn-success', byLabel: 'Nama penyetuju (vendor)', byValue: vendorBy, onConfirm: c => { run(d => ops.vendorAccept(d, po.id, c)); toast('PO disepakati vendor'); } }),
    vreject: () => noteDialog({ title: 'Catat Penolakan Vendor', confirm: 'Vendor Menolak', confirmClass: 'btn-danger-solid', byLabel: 'Nama (vendor)', byValue: vendorBy,
      noteLabel: 'Alasan / permintaan revisi', noteRequired: true, onConfirm: c => { run(d => ops.vendorReject(d, po.id, c)); toast('PO ditolak vendor, silakan revisi'); } }),
    ship: () => openDialog({ title: 'Barang Dikirim Vendor', fields: [
      { name: 'date', label: 'Tanggal Kirim', type: 'date', required: true, value: todayISO() },
      { name: 'courier', label: 'Ekspedisi', placeholder: 'Armada vendor / JNE / dll' },
      { name: 'ref', label: 'No. Resi / Surat Jalan', full: true },
    ], onConfirm: x => { run(d => ops.shipPO(d, po.id, { date: x.date, courier: x.courier, ref: x.ref })); toast('Status: dalam pengiriman'); } }),
    receive: () => openDialog({ title: 'Penerimaan Barang (Goods Receipt)', confirm: 'Terima Barang', confirmClass: 'btn-success', fields: [
      { name: 'date', label: 'Tanggal Terima', type: 'date', required: true, value: todayISO() },
      { name: 'receiver', label: 'Diterima oleh', required: true, value: settings.userName },
      { name: 'note', label: 'Kondisi / Catatan', type: 'textarea', value: 'Lengkap, kondisi baik' },
    ], onConfirm: x => {
      run(d => ops.receivePO(d, po.id, { date: x.date, receiver: x.receiver, note: x.note }));
      toast(getDB().pos.find(p => p.id === po.id)?.status === 'Closed' ? 'Barang diterima. PO & PR otomatis Closed.' : 'Barang diterima');
    } }),
    close: () => noteDialog({ title: `Tutup ${po.no}`, message: 'PO dan PR terkait akan berstatus Closed.', confirm: 'Tutup PO', noteLabel: 'Alasan',
      onConfirm: c => { run(d => ops.closePO(d, po.id, c)); toast('PO ditutup'); } }),
    send: () => sendDialog(po, vendor, false),
    link: () => sendDialog(po, vendor, true),
  };

  const rejectedAt = st === 'REJECTED' ? 1 : st === 'VENDOR_REJECTED' ? 3 : -1;
  const flowIdx = PO_FLOW.indexOf(st);
  const seg = (i: number) => rejectedAt >= 0 ? (i < rejectedAt ? 'bg-ok' : i === rejectedAt ? 'bg-bad' : 'bg-neutral-bg')
    : st === 'CLOSED' || i < flowIdx ? 'bg-ok' : i === flowIdx ? 'bg-brand' : 'bg-neutral-bg';
  const hint = st === 'RECEIVED' && po.invoiceId ? 'Barang diterima & tagihan dijurnal.' : PO_STAGES[st].hint;

  return (
    <>
      <PageHead title={`Form ${po.no}`} sub={<>
        <Badge tone={PO_STAGES[st].tone}>{PO_STAGES[st].label}</Badge><StatusBadge status={po.status} />
        <span>— {vendor.name}{pr && <> — <Link className="link" href={`/pr/${pr.id}`}>{pr.no}</Link></>}</span>
      </>}>
        <Link className="btn no-print" href="/po"><ArrowLeft className="size-4" />List PO</Link>
      </PageHead>

      <div className="card no-print mb-[18px]">
        <div className="card-body flex flex-wrap items-center gap-4">
          <div className="min-w-[240px] flex-1">
            <div className="mb-1.5 text-[13px] text-muted">Alur Approval PO</div>
            <div className="flex max-w-[520px] gap-[3px]">{PO_FLOW.map((k, i) => <span key={k} title={PO_STAGES[k].label} className={cx('h-1.5 flex-1 rounded-[3px]', seg(i))} />)}</div>
            <div className="mt-1.5 text-[13px] text-muted">{hint}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {st === 'PENDING' && <>
              <button className="btn btn-danger" onClick={act.reject}><X className="size-4" />Tolak</button>
              <button className="btn btn-success" onClick={act.approve}><Check className="size-4" />Setujui (Atasan)</button>
            </>}
            {PO_EDITABLE.includes(st) && <Link className="btn" href={`/po/${po.id}/edit`}>{st === 'PENDING' ? <Pencil className="size-4" /> : <RotateCcw className="size-4" />}{st === 'PENDING' ? 'Edit' : 'Revisi'}</Link>}
            {st === 'APPROVED' && <button className="btn btn-primary" onClick={act.send}><Send className="size-4" />Kirim ke Vendor</button>}
            {st === 'SENT' && <>
              <button className="btn" onClick={act.link}><Link2 className="size-4" />Link Vendor</button>
              <button className="btn btn-danger" onClick={act.vreject}><X className="size-4" />Vendor Menolak</button>
              <button className="btn btn-success" onClick={act.vaccept}><Check className="size-4" />Vendor Menyetujui</button>
            </>}
            {st === 'ACCEPTED' && <button className="btn btn-primary" onClick={act.ship}><Truck className="size-4" />Barang Dikirim</button>}
            {st === 'SHIPPED' && <button className="btn btn-primary" onClick={act.receive}><Package className="size-4" />Terima Barang</button>}
            {PO_INVOICEABLE.includes(st) && !inv && po.status === 'Open' && <Link className="btn" href={`/invoices/new?po=${po.id}`}><ReceiptText className="size-4" />Input Tagihan</Link>}
            {inv && <Link className="btn" href={`/invoices/${inv.id}`}><ReceiptText className="size-4" />{inv.no}</Link>}
            {po.status === 'Open' && !['PENDING', 'APPROVED', 'SENT'].includes(st) && <button className="btn" onClick={act.close}><Lock className="size-4" />Tutup PO</button>}
            <button className="btn" onClick={() => window.print()}><Printer className="size-4" />Cetak</button>
          </div>
        </div>
      </div>

      {st === 'REJECTED' && po.approvals.internal && <Alert tone="danger" className="no-print mb-[18px]">Ditolak atasan ({po.approvals.internal.by}): {po.approvals.internal.note || '-'}</Alert>}
      {st === 'VENDOR_REJECTED' && po.approvals.vendor && <Alert tone="danger" className="no-print mb-[18px]">Ditolak vendor ({po.approvals.vendor.by}): {po.approvals.vendor.note || '-'}</Alert>}

      <div className="grid gap-[18px] xl:grid-cols-[1.4fr_1fr]">
        <PODocument po={po} />
        <div className="no-print space-y-[18px]">
          {(po.shipment || po.receipt) && (
            <Card title="Pengiriman & Penerimaan">
              <DL items={[
                ...(po.shipment ? [['Ekspedisi', po.shipment.courier || '-'], ['No. Resi / SJ', po.shipment.ref || '-'], ['Tgl Kirim', fdate(po.shipment.date)]] as [string, string][] : []),
                ...(po.receipt ? [['Tgl Terima', fdate(po.receipt.date)], ['Penerima', po.receipt.receiver], ['Kondisi', po.receipt.note || '-']] as [string, string][] : []),
              ]} />
            </Card>
          )}
          {pr && <TrackingCard pr={pr} />}
          <HistoryCard events={po.history} />
        </div>
      </div>
    </>
  );
}

function sendDialog(po: PO, v: Vendor, linkOnly: boolean) {
  const { settings, run } = useDB.getState();
  const url = `${window.location.origin}/vendor-portal/${po.id}`;
  const t = poTotals(po);
  const subject = `Purchase Order ${po.no} — ${settings.company}`;
  const body = `Yth. ${v.contact || v.name},\n\nBersama ini kami sampaikan Purchase Order ${po.no} senilai ${rp(t.total)} (termasuk PPN).\nMohon ditinjau dan berikan persetujuan melalui tautan berikut:\n${url}\n\nTanggal pengiriman: ${fdate(po.deliveryDate)}\nTermin pembayaran: ${po.paymentTerms} hari\n\nTerima kasih,\n${settings.userName}\n${settings.company}`;
  const mailto = `mailto:${encodeURIComponent(v.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const copy = () => navigator.clipboard?.writeText(url).then(() => toast('Link disalin'), () => toast('Gagal menyalin link', true));

  openDialog({
    title: linkOnly ? 'Link Persetujuan Vendor' : `Kirim ${po.no} ke Vendor`, wide: true,
    confirm: linkOnly ? '' : 'Tandai Terkirim', cancel: linkOnly ? 'Tutup' : 'Batal',
    body: (
      <div className="space-y-4">
        <DL items={[['Vendor', v.name], ['Email', v.email || '-'], ['Total PO', rp(t.total)]]} />
        <div className="flex flex-col gap-[5px]">
          <span className="label">Link portal persetujuan vendor</span>
          <div className="flex gap-2">
            <input className="input text-[13px]" readOnly value={url} onFocus={e => e.target.select()} />
            <button type="button" className="btn" onClick={copy}><Copy className="size-4" />Salin</button>
            <a className="btn" href={url} target="_blank" rel="noopener"><ExternalLink className="size-4" />Buka</a>
          </div>
          <span className="hint">Vendor membuka link ini untuk meninjau Form PO lalu menekan Setujui / Tolak.</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={mailto}><Mail className="size-4" />Buka Email ke Vendor</a>
          <button type="button" className="btn" onClick={() => window.print()}><Printer className="size-4" />Cetak / PDF</button>
        </div>
        {!linkOnly && <Alert tone="info">Setelah PO dikirim (email/link), klik <b>Tandai Terkirim</b>. Status PO menjadi Menunggu Persetujuan Vendor.</Alert>}
      </div>
    ),
    onConfirm: () => {
      if (linkOnly) return;
      run(d => ops.sendPO(d, po.id, { note: v.email ? `Dikirim ke ${v.email}` : '' }));
      toast('PO terkirim ke vendor');
    },
  });
}
