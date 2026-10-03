'use client';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/feedback';
import { blankItem, ItemsEditor, validItems, type EditorItem } from '@/components/items-editor';
import { Alert, Field, FormGrid, PageHead } from '@/components/ui';
import { addDays, todayISO } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { PR, Priority } from '@/lib/types';

export function PRForm({ pr }: { pr?: PR }) {
  const router = useRouter();
  const run = useDB(s => s.run);
  const settings = useDB(s => s.settings);
  const prs = useDB(s => s.prs);
  const departments = [...new Set(prs.map(p => p.department))];
  const supervisors = [...new Set(prs.map(p => p.supervisor).filter(Boolean))];
  const [f, setF] = useState({
    requester: pr?.requester ?? settings.userName,
    supervisor: pr?.supervisor ?? '',
    department: pr?.department ?? '',
    date: pr?.date ?? todayISO(),
    neededDate: pr?.neededDate ?? addDays(todayISO(), 7),
    priority: (pr?.priority ?? 'Normal') as Priority,
    purpose: pr?.purpose ?? '',
  });
  const [items, setItems] = useState<EditorItem[]>(pr ? pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: 0 })) : [blankItem()]);
  const [tried, setTried] = useState(false);
  const back = pr ? `/pr/${pr.id}` : '/pr';
  const bad = (v: string) => tried && !v.trim() ? 'invalid' : '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!f.requester.trim() || !f.supervisor.trim() || !f.department.trim() || !f.neededDate || !f.purpose.trim()) return toast('Lengkapi field yang wajib diisi', true);
    if (!validItems(items)) return toast('Setiap item wajib memiliki nama dan qty > 0', true);
    const data: ops.PRInput = { ...f, items: items.map(i => ({ name: i.name.trim(), qty: i.qty, unit: i.unit.trim() || 'pcs' })) };
    const id = run(d => (pr ? ops.updatePR(d, pr.id, data) : ops.createPR(d, data)));
    toast(pr ? 'PR diperbarui dan diajukan ulang' : `${useDB.getState().prs.find(p => p.id === id)?.no} berhasil diajukan`);
    router.push(`/pr/${id}`);
  };

  const rejected = pr?.history.filter(h => h.key === 'PR_REJECTED' || h.key === 'PR_SUPERVISOR_REJECTED').pop();
  return (
    <>
      <PageHead title={pr ? `${pr.stage === 'REJECTED' ? 'Revisi' : 'Edit'} ${pr.no}` : 'Buat Purchase Request'} sub="Ajukan kebutuhan barang/jasa untuk disetujui atasan.">
        <Link className="btn" href={back}><ArrowLeft className="size-4" />Kembali</Link>
      </PageHead>
      {pr?.stage === 'REJECTED' && rejected && <Alert tone="danger" className="mb-[18px]">Ditolak oleh {rejected.by}: {rejected.note || '-'}</Alert>}
      <form className="card" onSubmit={submit} noValidate>
        <div className="card-head"><h3>Informasi Permintaan</h3></div>
        <div className="card-body">
          <FormGrid>
            <Field label="Pemohon *"><input className={`input ${bad(f.requester)}`} value={f.requester} onChange={e => setF({ ...f, requester: e.target.value })} /></Field>
            <Field label="Atasan Pemohon *" hint="Penyetuju pertama PR, sebelum Procurement">
              <input className={`input ${bad(f.supervisor)}`} list="sup-list" placeholder="Nama & jabatan atasan" value={f.supervisor} onChange={e => setF({ ...f, supervisor: e.target.value })} />
              <datalist id="sup-list">{supervisors.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Departemen *">
              <input className={`input ${bad(f.department)}`} list="dept-list" value={f.department} onChange={e => setF({ ...f, department: e.target.value })} />
              <datalist id="dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist>
            </Field>
            <Field label="Tanggal PR"><input className="input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Tanggal Dibutuhkan *"><input className={`input ${bad(f.neededDate)}`} type="date" value={f.neededDate} onChange={e => setF({ ...f, neededDate: e.target.value })} /></Field>
            <Field label="Prioritas">
              <select className="input" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Priority })}>
                {['Rendah', 'Normal', 'Tinggi'].map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Keperluan / Justifikasi *" full><textarea className={`input ${bad(f.purpose)}`} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></Field>
          </FormGrid>
        </div>
        <div className="card-head border-t"><h3>Daftar Barang / Jasa</h3><span className="text-sm text-muted">Harga ditentukan saat pembuatan PO</span></div>
        <div className="card-body"><ItemsEditor items={items} onChange={setItems} showErrors={tried} /></div>
        <div className="flex justify-end gap-2 border-t border-line px-[18px] py-3.5">
          <Link className="btn" href={back}>Batal</Link>
          <button className="btn btn-primary" type="submit"><Send className="size-4" />{pr ? 'Simpan & Ajukan' : 'Ajukan PR'}</button>
        </div>
      </form>
    </>
  );
}
