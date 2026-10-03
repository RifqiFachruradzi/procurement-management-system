'use client';
import { ArrowLeft, ClipboardList, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { blankItem, ItemsEditor, validItems, type EditorItem } from '@/components/items-editor';
import { Alert, Empty, Field, FormGrid, PageHead } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { addDays, rp, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { PO, PR } from '@/lib/types';

const fromPR = (pr?: PR): EditorItem[] => (pr ? pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: 0 })) : [blankItem()]);

export function POForm({ po, initialPrId }: { po?: PO; initialPrId?: string }) {
  const router = useRouter();
  const { prs, vendors: allVendors, settings, run } = useDB();
  const eligible = prs.filter(p => p.status === 'Open' && p.stage === 'APPROVED');
  const vendors = allVendors.filter(v => v.active || v.id === po?.vendorId);

  const [prId, setPrId] = useState(po?.prId ?? (eligible.some(p => p.id === initialPrId) ? initialPrId! : ''));
  const pr = prs.find(p => p.id === prId);
  const [f, setF] = useState({
    vendorId: po?.vendorId ?? '',
    date: po?.date ?? todayISO(),
    deliveryDate: po?.deliveryDate ?? pr?.neededDate ?? addDays(todayISO(), 14),
    paymentTerms: po?.paymentTerms ?? 30,
    shipTo: po?.shipTo ?? settings.shipTo,
    notes: po?.notes ?? '',
    discount: po?.discount ?? 0,
    taxRate: po?.taxRate ?? 11,
  });
  const [items, setItems] = useState<EditorItem[]>(po ? po.items.map(i => ({ ...i })) : fromPR(pr));
  const [tried, setTried] = useState(false);
  const back = po ? `/po/${po.id}` : '/po';
  const t = poTotals({ items: items.map(i => ({ ...i })), discount: f.discount, taxRate: f.taxRate });
  const bad = (ok: unknown) => (tried && !ok ? 'invalid' : '');

  if (!po && !eligible.length) {
    return (
      <>
        <PageHead title="Buat Purchase Order"><Link className="btn" href="/po"><ArrowLeft className="size-4" />Kembali</Link></PageHead>
        <div className="card">
          <Empty msg="Belum ada PR berstatus Disetujui. PO dibuat dari PR yang sudah disetujui atasan." icon={ClipboardList}>
            <Link className="btn btn-primary" href="/pr?stage=SUBMITTED">Lihat PR menunggu approval</Link>
          </Empty>
        </div>
      </>
    );
  }

  const choosePR = (id: string) => {
    setPrId(id);
    const p = prs.find(x => x.id === id);
    setItems(fromPR(p));
    if (p) setF(x => ({ ...x, deliveryDate: p.neededDate }));
  };
  const chooseVendor = (id: string) => {
    const v = allVendors.find(x => x.id === id);
    setF(x => ({ ...x, vendorId: id, paymentTerms: v ? v.terms : x.paymentTerms }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!prId || !f.vendorId || !f.deliveryDate || !f.shipTo.trim()) return toast('Lengkapi field yang wajib diisi', true);
    if (!validItems(items)) return toast('Setiap item wajib memiliki nama dan qty > 0', true);
    if (items.some(i => !(i.price > 0))) return toast('Harga satuan wajib diisi sesuai penawaran/kesepakatan vendor', true);
    const data: ops.POInput = { prId, ...f, discount: Number(f.discount) || 0, taxRate: Number(f.taxRate) || 0, paymentTerms: Number(f.paymentTerms) || 0,
      items: items.map(i => ({ name: i.name.trim(), qty: i.qty, unit: i.unit.trim() || 'pcs', price: i.price })) };
    const id = run(d => (po ? ops.updatePO(d, po.id, data) : ops.createPO(d, data)));
    toast(po ? 'PO disimpan & diajukan untuk approval' : `${useDB.getState().pos.find(p => p.id === id)?.no} dibuat, menunggu approval atasan`);
    router.push(`/po/${id}`);
  };

  const revising = po && po.stage !== 'PENDING';
  return (
    <>
      <PageHead title={po ? `${revising ? 'Revisi' : 'Edit'} ${po.no}` : 'Buat Purchase Order'}
        sub={revising ? 'Menyimpan revisi akan mengajukan ulang PO ke atasan untuk approval.' : 'PO akan diajukan ke atasan untuk approval sebelum dikirim ke vendor.'}>
        <Link className="btn" href={back}><ArrowLeft className="size-4" />Kembali</Link>
      </PageHead>
      {po?.approvals.internal?.rejected && <Alert tone="danger" className="mb-[18px]">Ditolak atasan: {po.approvals.internal.note || '-'}</Alert>}
      {po?.approvals.vendor?.rejected && <Alert tone="danger" className="mb-[18px]">Ditolak vendor: {po.approvals.vendor.note || '-'}</Alert>}

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-head"><h3>Informasi PO</h3></div>
        <div className="card-body">
          <FormGrid>
            <Field label="Referensi PR *">
              {po ? <input className="input" readOnly value={pr?.no ?? '-'} /> : (
                <select className={`input ${bad(prId)}`} value={prId} onChange={e => choosePR(e.target.value)}>
                  <option value="">Pilih PR disetujui...</option>
                  {eligible.map(p => <option key={p.id} value={p.id}>{p.no} — {p.purpose.slice(0, 50)}</option>)}
                </select>
              )}
            </Field>
            <Field label="Vendor *" hint={<Link className="link" href="/vendors/new">Tambah vendor baru</Link>}>
              <select className={`input ${bad(f.vendorId)}`} value={f.vendorId} onChange={e => chooseVendor(e.target.value)}>
                <option value="">Pilih vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category}</option>)}
              </select>
            </Field>
            <Field label="Tanggal PO"><input className="input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Tanggal Pengiriman *"><input className={`input ${bad(f.deliveryDate)}`} type="date" value={f.deliveryDate} onChange={e => setF({ ...f, deliveryDate: e.target.value })} /></Field>
            <Field label="Termin Pembayaran (hari)"><input className="input" type="number" min={0} value={f.paymentTerms} onChange={e => setF({ ...f, paymentTerms: Number(e.target.value) })} /></Field>
            <Field label="Alamat Pengiriman *" full><input className={`input ${bad(f.shipTo.trim())}`} value={f.shipTo} onChange={e => setF({ ...f, shipTo: e.target.value })} /></Field>
            <Field label="Catatan / Syarat" full><textarea className="input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
          </FormGrid>
        </div>
        <div className="card-head border-t"><h3>Item PO</h3>{pr && <span className="text-sm text-muted">Item dari {pr.no} — isi harga satuan sesuai penawaran vendor</span>}</div>
        <div className="card-body">
          <ItemsEditor items={items} onChange={setItems} priceLabel="Harga Satuan" showErrors={tried} />
          <div className="ml-auto w-full max-w-[340px] text-sm">
            <Row l="Subtotal"><b>{rp(t.subtotal)}</b></Row>
            <Row l="Diskon (Rp)"><input className="input h-[30px] w-[130px] text-right" type="number" min={0} value={f.discount} onChange={e => setF({ ...f, discount: Number(e.target.value) })} /></Row>
            <Row l="DPP"><b>{rp(t.dpp)}</b></Row>
            <Row l="PPN (%)"><input className="input h-[30px] w-[130px] text-right" type="number" min={0} step="any" value={f.taxRate} onChange={e => setF({ ...f, taxRate: Number(e.target.value) })} /></Row>
            <Row l="Nilai PPN"><b>{rp(t.tax)}</b></Row>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2.5 text-lg font-bold"><span>Total</span><span>{rp(t.total)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-[18px] py-3.5">
          <Link className="btn" href={back}>Batal</Link>
          <button className="btn btn-primary" type="submit"><Send className="size-4" />Simpan & Ajukan Approval</button>
        </div>
      </form>
    </>
  );
}

const Row = ({ l, children }: { l: string; children: React.ReactNode }) => <div className="flex items-center justify-between gap-3 py-1"><span>{l}</span>{children}</div>;
