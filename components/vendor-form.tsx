'use client';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { Field, FormGrid, PageHead } from '@/components/ui';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { Vendor } from '@/lib/types';

const blank: ops.VendorInput = { name: '', category: '', contact: '', email: '', phone: '', address: '', npwp: '', terms: 30, bank: '', account: '', rating: 'B', active: true };

export function VendorForm({ vendor }: { vendor?: Vendor }) {
  const router = useRouter();
  const run = useDB(s => s.run);
  const vendors = useDB(s => s.vendors);
  const categories = [...new Set(vendors.map(v => v.category).filter(Boolean))];
  const [f, setF] = useState<ops.VendorInput>(vendor ? { ...vendor } : blank);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof ops.VendorInput>(k: K, v: ops.VendorInput[K]) => setF(x => ({ ...x, [k]: v }));
  const emailOk = /^\S+@\S+\.\S+$/.test(f.email);
  const bad = (ok: boolean) => (tried && !ok ? 'invalid' : '');
  const text = (k: keyof ops.VendorInput, label: string, required = false, full = false) => (
    <Field label={label + (required ? ' *' : '')} full={full}>
      <input className={`input ${bad(!required || !!String(f[k]).trim())}`} value={String(f[k] ?? '')} onChange={e => set(k, e.target.value as never)} />
    </Field>
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!f.name.trim() || !f.contact.trim()) return toast('Lengkapi field yang wajib diisi', true);
    if (!emailOk) return toast('Format email tidak valid', true);
    run(d => ops.saveVendor(d, { ...f, terms: Number(f.terms) || 0 }));
    toast('Vendor disimpan');
    router.push('/vendors');
  };

  return (
    <>
      <PageHead title={vendor ? `Edit ${vendor.name}` : 'Tambah Vendor'}>
        <Link className="btn" href="/vendors"><ArrowLeft className="size-4" />Kembali</Link>
      </PageHead>
      <form className="card" onSubmit={submit} noValidate>
        <div className="card-head"><h3>Profil Vendor</h3>{vendor && <span className="font-mono text-[13px] text-muted">{vendor.code}</span>}</div>
        <div className="card-body">
          <FormGrid>
            {text('name', 'Nama Perusahaan', true)}
            <Field label="Kategori">
              <input className="input" list="cat-list" value={f.category} onChange={e => set('category', e.target.value)} />
              <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </Field>
            {text('npwp', 'NPWP')}
            {text('contact', 'Nama Kontak', true)}
            <Field label="Email *"><input className={`input ${bad(emailOk)}`} type="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
            {text('phone', 'Telepon')}
            {text('address', 'Alamat', false, true)}
          </FormGrid>
        </div>
        <div className="card-head border-t"><h3>Pembayaran</h3></div>
        <div className="card-body">
          <FormGrid>
            <Field label="Termin Default (hari)"><input className="input" type="number" min={0} value={f.terms} onChange={e => set('terms', Number(e.target.value))} /></Field>
            {text('bank', 'Bank')}
            {text('account', 'No. Rekening')}
            <Field label="Rating">
              <select className="input" value={f.rating} onChange={e => set('rating', e.target.value as Vendor['rating'])}>{['A', 'B', 'C'].map(r => <option key={r}>{r}</option>)}</select>
            </Field>
            <Field label="Status">
              <select className="input" value={f.active ? '1' : '0'} onChange={e => set('active', e.target.value === '1')}><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
            </Field>
          </FormGrid>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-[18px] py-3.5">
          <Link className="btn" href="/vendors">Batal</Link>
          <button className="btn btn-primary" type="submit"><Check className="size-4" />Simpan Vendor</button>
        </div>
      </form>
    </>
  );
}
