'use client';
import { ArrowLeft, FileCheck2, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { JournalTable } from '@/components/journal-table';
import { Alert, Card, Empty, Field, FormGrid, PageHead } from '@/components/ui';
import { accName, CASH_ACCOUNTS, PAY_METHODS } from '@/lib/constants';
import { fdate, rp, terbilang, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { PayMethod } from '@/lib/types';

export default function NewVoucherPage() {
  const sp = useSearchParams();
  const { invoices, vendors } = useDB();
  const open = ops.payableInvoices({ invoices });
  const vendorIds = [...new Set(open.map(i => i.vendorId))];
  const preInv = invoices.find(i => i.id === sp.get('inv'));
  const initialVendor = sp.get('vendor') ?? preInv?.vendorId ?? '';
  const [vendorId, setVendorId] = useState(vendorIds.includes(initialVendor) ? initialVendor : '');

  return (
    <>
      <PageHead title="Buat Jurnal Voucher" sub="Ajukan pembayaran tagihan vendor sebagai dasar bank/kas keluar.">
        <Link className="btn" href="/vouchers"><ArrowLeft className="size-4" />Kembali</Link>
      </PageHead>
      {!open.length ? (
        <div className="card">
          <Empty msg="Tidak ada tagihan yang menunggu pembayaran. Voucher dibuat dari tagihan vendor yang sudah dijurnal." icon={ReceiptText}>
            <Link className="btn btn-primary" href="/invoices">Lihat Tagihan Vendor</Link>
          </Empty>
        </div>
      ) : (
        <>
          <Card>
            <Field label="Vendor (penerima pembayaran) *" hint="Hanya vendor yang memiliki tagihan berstatus dijurnal dan belum dibuatkan voucher.">
              <select className="input max-w-[560px]" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                <option value="">Pilih vendor...</option>
                {vendorIds.map(id => {
                  const list = open.filter(i => i.vendorId === id);
                  return <option key={id} value={id}>{vendors.find(v => v.id === id)?.name} — {list.length} tagihan — {rp(list.reduce((s, i) => s + i.payable, 0))}</option>;
                })}
              </select>
            </Field>
          </Card>
          {vendorId && <VoucherForm key={vendorId} vendorId={vendorId} preselect={preInv?.vendorId === vendorId ? preInv.id : undefined} />}
        </>
      )}
    </>
  );
}

function VoucherForm({ vendorId, preselect }: { vendorId: string; preselect?: string }) {
  const router = useRouter();
  const { invoices, vendors, pos, run, settings } = useDB();
  const vendor = vendors.find(v => v.id === vendorId)!;
  const list = ops.payableInvoices({ invoices }, vendorId);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : list.map(i => i.id));
  const [f, setF] = useState({ date: todayISO(), method: 'Transfer' as PayMethod, creditAccount: CASH_ACCOUNTS[0], description: '' });
  const total = list.filter(i => selected.includes(i.id)).reduce((s, i) => s + i.payable, 0);
  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const missingBank = f.method !== 'Tunai' && (!vendor.bank || !vendor.account);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected.length) return toast('Pilih minimal satu tagihan', true);
    if (!f.date) return toast('Isi tanggal voucher', true);
    const ordered = list.filter(i => selected.includes(i.id)).map(i => i.id);
    const id = run(d => ops.createVoucher(d, { ...f, vendorId, invoiceIds: ordered, description: f.description.trim() }, { by: settings.financeName }));
    toast(`${useDB.getState().vouchers.find(v => v.id === id)?.no} dibuat, menunggu pemeriksaan`);
    router.push(`/vouchers/${id}`);
  };

  return (
    <form className="mt-[18px] space-y-[18px]" onSubmit={submit} noValidate>
      <Card title="Pilih Tagihan" right={<span className="text-muted">{selected.length} dipilih — <b className="text-fg">{rp(total)}</b></span>} bodyless>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th className="w-10" /><th>No Tagihan</th><th>Invoice Vendor</th><th>No PO</th><th>Jatuh Tempo</th><th className="num">Hutang</th></tr></thead>
            <tbody>
              {list.map(i => (
                <tr key={i.id} className="clickable" onClick={() => toggle(i.id)}>
                  <td><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} onClick={e => e.stopPropagation()} /></td>
                  <td><b>{i.no}</b></td><td>{i.vendorInvoiceNo}</td><td>{pos.find(p => p.id === i.poId)?.no ?? '-'}</td>
                  <td>{fdate(i.dueDate)}{i.dueDate < todayISO() && <span className="sub !text-bad">Lewat jatuh tempo</span>}</td>
                  <td className="num">{rp(i.payable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Data Pembayaran">
        <FormGrid>
          <Field label="Tanggal Voucher *"><input className="input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Cara Bayar">
            <select className="input" value={f.method} onChange={e => {
              const method = e.target.value as PayMethod;
              setF({ ...f, method, creditAccount: method === 'Tunai' ? '1-1100' : f.creditAccount === '1-1100' ? CASH_ACCOUNTS[0] : f.creditAccount });
            }}>{PAY_METHODS.map(m => <option key={m}>{m}</option>)}</select>
          </Field>
          <Field label="Sumber Dana (Akun Kredit)">
            <select className="input" value={f.creditAccount} onChange={e => setF({ ...f, creditAccount: e.target.value })}>
              {CASH_ACCOUNTS.map(c => <option key={c} value={c}>{accName(c)}</option>)}
            </select>
          </Field>
          <Field label="Rekening Tujuan"><input className="input" readOnly value={f.method === 'Tunai' ? 'Tunai' : `${vendor.bank || '-'} ${vendor.account || ''} a.n. ${vendor.name}`} /></Field>
          <Field label="Keterangan" full><input className="input" placeholder="Mis. pembayaran tagihan bulan Oktober" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        </FormGrid>
        {missingBank && <Alert tone="warning" className="mt-4">Data rekening vendor belum lengkap. Lengkapi di <Link className="link" href={`/vendors/${vendor.id}/edit`}>Database Vendor</Link>.</Alert>}
        <div className="mt-4 rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm"><span className="text-muted">Terbilang:</span> <i>{terbilang(total)}</i></div>
      </Card>

      <Card title="Preview Jurnal Pembayaran" right={<span className="text-sm text-muted">Diposting otomatis saat kasir membayar</span>} bodyless>
        <JournalTable lines={ops.voucherLines({ invoices }, selected, f.creditAccount)} />
      </Card>

      <div className="flex justify-end gap-2">
        <Link className="btn" href="/vouchers">Batal</Link>
        <button className="btn btn-primary" type="submit"><FileCheck2 className="size-4" />Simpan & Ajukan Pemeriksaan</button>
      </div>
    </form>
  );
}
