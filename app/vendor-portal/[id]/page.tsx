'use client';
import { Check, Printer, X, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { FeedbackHost, toast } from '@/components/feedback';
import { PODocument } from '@/components/po-document';
import { StoreGate } from '@/components/store-gate';
import { Alert, Badge, Empty, Field, FormGrid } from '@/components/ui';
import { PO_STAGES } from '@/lib/constants';
import { fdt } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';

/** Public-facing page where the vendor reviews and approves/rejects a PO. */
export default function VendorPortalPage() {
  return (
    <StoreGate>
      <Portal />
      <FeedbackHost />
    </StoreGate>
  );
}

function Portal() {
  const { id } = useParams<{ id: string }>();
  const po = useDB(s => s.pos.find(p => p.id === id));
  const v = useDB(s => s.vendors.find(x => x.id === po?.vendorId));
  const company = useDB(s => s.settings.company);
  const run = useDB(s => s.run);
  const [f, setF] = useState({ by: v?.contact ?? '', title: '', note: '' });
  const [tried, setTried] = useState<'accept' | 'reject' | null>(null);

  const decide = (kind: 'accept' | 'reject') => {
    setTried(kind);
    if (!f.by.trim()) return toast('Isi nama penyetuju', true);
    if (kind === 'reject' && !f.note.trim()) return toast('Isi catatan alasan penolakan', true);
    const c = { by: `${f.by.trim()}${f.title.trim() ? ', ' + f.title.trim() : ''} (${v?.name ?? ''})`, note: f.note.trim() };
    run(d => (kind === 'accept' ? ops.vendorAccept(d, po!.id, c) : ops.vendorReject(d, po!.id, c)));
    toast(kind === 'accept' ? 'PO disetujui. Terima kasih.' : 'PO ditolak. Pembeli akan menerima catatan Anda.');
  };

  return (
    <div className="mx-auto max-w-[960px] px-4 pt-7 pb-16">
      <div className="no-print mb-5 flex items-center gap-3">
        <img src="/logo.svg" alt="" className="size-[34px]" />
        <div><b className="text-[19px]">Portal Vendor</b><div className="text-muted">{company}</div></div>
      </div>
      {!po ? (
        <div className="card"><Empty msg="PO tidak ditemukan atau link tidak valid." icon={XCircle} /></div>
      ) : (
        <>
          {po.stage === 'SENT' ? (
            <section className="card no-print mb-[18px]">
              <div className="card-head"><h3>Persetujuan {po.no}</h3><Badge tone="warning">Menunggu persetujuan Anda</Badge></div>
              <div className="card-body">
                <FormGrid>
                  <Field label="Nama penyetuju *"><input className={`input ${tried && !f.by.trim() ? 'invalid' : ''}`} value={f.by} onChange={e => setF({ ...f, by: e.target.value })} /></Field>
                  <Field label="Jabatan"><input className="input" placeholder="Sales Manager" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
                  <Field label="Catatan untuk pembeli" full>
                    <textarea className={`input ${tried === 'reject' && !f.note.trim() ? 'invalid' : ''}`} placeholder="Konfirmasi ketersediaan, estimasi kirim, atau alasan penolakan"
                      value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
                  </Field>
                </FormGrid>
                <div className="mt-[18px] flex flex-wrap justify-end gap-2">
                  <button className="btn btn-danger" onClick={() => decide('reject')}><X className="size-4" />Tolak PO</button>
                  <button className="btn btn-success" onClick={() => decide('accept')}><Check className="size-4" />Setujui PO</button>
                </div>
              </div>
            </section>
          ) : po.approvals.vendor && !po.approvals.vendor.rejected ? (
            <Alert tone="success" className="no-print mb-[18px]">PO telah disetujui pada {fdt(po.approvals.vendor.at)} oleh {po.approvals.vendor.by}. Terima kasih.</Alert>
          ) : po.stage === 'VENDOR_REJECTED' ? (
            <Alert tone="danger" className="no-print mb-[18px]">PO ditolak: {po.approvals.vendor?.note}. Pembeli akan mengirim revisi.</Alert>
          ) : (
            <Alert tone="info" className="no-print mb-[18px]">PO ini belum siap untuk persetujuan vendor (status: {PO_STAGES[po.stage].label}).</Alert>
          )}
          <PODocument po={po} />
          <div className="no-print mt-[18px] text-right"><button className="btn" onClick={() => window.print()}><Printer className="size-4" />Cetak / Simpan PDF</button></div>
        </>
      )}
    </div>
  );
}
