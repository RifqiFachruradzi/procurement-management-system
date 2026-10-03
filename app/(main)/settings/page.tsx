'use client';
import { Check, Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { openDialog, toast } from '@/components/feedback';
import { Card, Field, FormGrid, PageHead } from '@/components/ui';
import { ACCOUNTS } from '@/lib/constants';
import { downloadBlob, todayISO } from '@/lib/format';
import { getDB, useDB } from '@/lib/store';
import type { DB, Settings } from '@/lib/types';

const FIELDS: [keyof Settings, string, boolean?][] = [
  ['company', 'Nama Perusahaan'], ['npwp', 'NPWP'], ['address', 'Alamat', true], ['shipTo', 'Alamat Pengiriman Default', true],
  ['userName', 'Nama Pengguna (Staff Procurement)'], ['approverName', 'Nama Atasan / Approver'],
  ['financeName', 'Pembuat Jurnal Voucher (Finance)'], ['checkerName', 'Pemeriksa Voucher (Accounting)'],
  ['financeApprover', 'Penyetuju Voucher (Finance Manager)'], ['cashierName', 'Kasir'],
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, run, reset, replace } = useDB();
  const [f, setF] = useState<Settings>(settings);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(d => { d.settings = { ...f }; });
    toast('Pengaturan disimpan');
  };
  const backup = () => {
    const { settings: s, counters, vendors, prs, pos, invoices, journals, vouchers } = getDB();
    downloadBlob(`procura-backup-${todayISO()}.json`, new Blob([JSON.stringify({ settings: s, counters, vendors, prs, pos, invoices, journals, vouchers }, null, 2)], { type: 'application/json' }));
  };
  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const d = JSON.parse(await file.text()) as DB;
      if (!Array.isArray(d.vendors) || !Array.isArray(d.prs) || !Array.isArray(d.pos)) throw new Error('invalid');
      replace(d);
      setF(useDB.getState().settings);
      toast('Data berhasil dipulihkan');
    } catch { toast('File backup tidak valid', true); }
  };
  const confirmReset = (demo: boolean) => openDialog({
    title: demo ? 'Reset ke Data Demo' : 'Hapus Semua Data', confirm: demo ? 'Reset' : 'Hapus Semua', confirmClass: 'btn-danger-solid',
    message: demo ? 'Semua data saat ini akan diganti dengan data demo.' : 'Semua PR, PO, vendor, tagihan, dan jurnal akan dihapus permanen dari browser ini.',
    onConfirm: () => { reset(demo); setF(useDB.getState().settings); toast(demo ? 'Data demo dimuat' : 'Semua data dihapus'); router.push('/'); },
  });

  return (
    <>
      <PageHead title="Pengaturan" sub="Profil perusahaan, pengguna, dan data aplikasi." />
      <form className="card" onSubmit={save}>
        <div className="card-head"><h3>Profil Perusahaan & Pengguna</h3></div>
        <div className="card-body">
          <FormGrid>
            {FIELDS.map(([k, l, full]) => (
              <Field key={k} label={l} full={full}><input className="input" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></Field>
            ))}
          </FormGrid>
        </div>
        <div className="flex justify-end border-t border-line px-[18px] py-3.5"><button className="btn btn-primary" type="submit"><Check className="size-4" />Simpan</button></div>
      </form>

      <div className="mt-[18px] grid gap-[18px] lg:grid-cols-2">
        <Card title="Bagan Akun (Jurnal)" bodyless>
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Nama Akun</th></tr></thead>
            <tbody>{Object.entries(ACCOUNTS).map(([k, v]) => <tr key={k}><td className="font-mono text-[13px]">{k}</td><td>{v}</td></tr>)}</tbody>
          </table>
        </Card>
        <Card title="Data Aplikasi" className="self-start">
          <p className="mb-4 text-muted">Data tersimpan di browser ini (localStorage). Gunakan backup untuk memindahkan data ke perangkat lain.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={backup}><Download className="size-4" />Backup JSON</button>
            <label className="btn"><Upload className="size-4" />Restore JSON<input type="file" accept="application/json" hidden onChange={e => restore(e.target.files?.[0])} /></label>
            <button className="btn" onClick={() => confirmReset(true)}><RotateCcw className="size-4" />Reset ke Data Demo</button>
            <button className="btn btn-danger" onClick={() => confirmReset(false)}><Trash2 className="size-4" />Hapus Semua Data</button>
          </div>
        </Card>
      </div>
    </>
  );
}
