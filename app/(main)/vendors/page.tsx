'use client';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { openDialog, toast } from '@/components/feedback';
import { useListState } from '@/components/list-state';
import { Badge, Empty, PageHead, SearchBox, Toolbar } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { downloadCSV, rp } from '@/lib/format';
import * as ops from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { Vendor } from '@/lib/types';

export default function VendorsPage() {
  const { vendors, pos, run } = useDB();
  const ls = useListState();
  const list = ls.q ? vendors.filter(v => [v.code, v.name, v.category, v.contact, v.email, v.npwp].join(' ').toLowerCase().includes(ls.q)) : vendors;

  const remove = (v: Vendor) => openDialog({
    title: 'Hapus Vendor', confirm: 'Hapus', confirmClass: 'btn-danger-solid', message: <>Hapus <b className="text-fg">{v.name}</b> dari database?</>,
    onConfirm: () => {
      if (!run(d => ops.deleteVendor(d, v.id))) { toast('Vendor memiliki PO. Nonaktifkan melalui Edit.', true); return false; }
      toast('Vendor dihapus');
    },
  });
  const exportCSV = () => downloadCSV('vendor.csv', [
    ['Kode', 'Nama', 'Kategori', 'Kontak', 'Email', 'Telepon', 'Alamat', 'NPWP', 'Termin', 'Bank', 'No Rekening', 'Rating', 'Status'],
    ...list.map(v => [v.code, v.name, v.category, v.contact, v.email, v.phone, v.address, v.npwp, v.terms, v.bank, v.account, v.rating, v.active ? 'Aktif' : 'Nonaktif']),
  ]);

  return (
    <>
      <PageHead title="Database Vendor" sub={`${vendors.length} vendor terdaftar — ${vendors.filter(v => v.active).length} aktif`}>
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
        <Link className="btn btn-primary" href="/vendors/new"><Plus className="size-4" />Tambah Vendor</Link>
      </PageHead>
      <div className="card">
        <Toolbar><SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari kode, nama, kategori, kontak..." /></Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Vendor</th><th>Kategori</th><th>Kontak</th><th>Termin</th><th className="num">PO (Open/Total)</th><th className="num">Nilai PO</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map(v => {
                const vp = pos.filter(p => p.vendorId === v.id);
                return (
                  <tr key={v.id}>
                    <td className="font-mono text-[13px]">{v.code}</td>
                    <td><b>{v.name}</b><span className="sub">NPWP {v.npwp || '-'} · Rating {v.rating}</span></td>
                    <td>{v.category || '-'}</td>
                    <td>{v.contact || '-'}<span className="sub">{v.email} {v.phone}</span></td>
                    <td className="whitespace-nowrap">{v.terms} hari</td>
                    <td className="num">{vp.filter(p => p.status === 'Open').length} / {vp.length}</td>
                    <td className="num">{rp(vp.reduce((s, p) => s + poTotals(p).total, 0))}</td>
                    <td>{v.active ? <Badge tone="success">Aktif</Badge> : <Badge tone="neutral">Nonaktif</Badge>}</td>
                    <td className="num">
                      <Link className="btn btn-ghost btn-sm btn-icon" href={`/vendors/${v.id}/edit`} title="Edit"><Pencil className="size-4" /></Link>
                      <button className="btn btn-ghost btn-sm btn-icon btn-danger" onClick={() => remove(v)} title="Hapus"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={9}><Empty msg="Belum ada vendor" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
