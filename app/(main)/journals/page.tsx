'use client';
import { Download, Rows3, TableProperties } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { useListState } from '@/components/list-state';
import { Badge, Empty, PageHead, SearchBox, Tabs, Toolbar } from '@/components/ui';
import { journalTotals } from '@/lib/calc';
import { ACCOUNTS, accName } from '@/lib/constants';
import { downloadCSV, fdate, rp } from '@/lib/format';
import { useDB } from '@/lib/store';

export default function JournalEntriesPage() {
  const router = useRouter();
  const journals = useDB(s => s.journals);
  const ls = useListState();
  const [detail, setDetail] = useState(false);
  let list = ls.status === 'All' ? journals : journals.filter(j => j.type === ls.status);
  if (ls.q) list = list.filter(j => [j.no, j.description, j.ref, ...j.lines.map(l => accName(l.account))].join(' ').toLowerCase().includes(ls.q));
  const total = list.reduce((s, j) => s + journalTotals(j).debit, 0);

  const exportCSV = () => downloadCSV('jurnal-entry.csv', [
    ['No Jurnal', 'Tanggal', 'Tipe', 'Keterangan', 'Referensi', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'],
    ...list.flatMap(j => j.lines.map(l => [j.no, j.date, j.type, j.description, j.ref, l.account, ACCOUNTS[l.account], l.debit, l.credit])),
  ]);

  return (
    <>
      <PageHead title="List Jurnal Entry" sub={`${list.length} jurnal — total ${rp(total)}`}>
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
      </PageHead>
      <div className="card">
        <Toolbar>
          <Tabs value={ls.status} options={[['All', 'Semua'], ['Pembelian', 'Pembelian'], ['Pembayaran', 'Pembayaran']]} onChange={v => ls.set('status', v)} />
          <SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari no jurnal, keterangan, akun..." />
          <div className="ml-auto">
            <Tabs value={detail ? 'd' : 's'} options={[['s', 'Ringkas'], ['d', 'Detail Akun']]} onChange={v => setDetail(v === 'd')} />
          </div>
        </Toolbar>
        <div className="overflow-x-auto">
          {detail ? (
            <table className="tbl">
              <thead><tr><th>No Jurnal</th><th>Tanggal</th><th>Keterangan</th><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
              <tbody>
                {list.map(j => (
                  <Fragment key={j.id}>
                    {j.lines.map((l, i) => (
                      <tr key={i} className="clickable" onClick={() => router.push(`/journals/${j.id}`)}>
                        {i === 0 && <>
                          <td rowSpan={j.lines.length} className="align-top"><b>{j.no}</b><span className="sub">{j.type}</span></td>
                          <td rowSpan={j.lines.length} className="align-top whitespace-nowrap">{fdate(j.date)}</td>
                          <td rowSpan={j.lines.length} className="max-w-[300px] align-top">{j.description}<span className="sub">Ref: {j.ref}</span></td>
                        </>}
                        <td className={l.credit ? 'pl-9' : ''}>{accName(l.account)}</td>
                        <td className="num">{l.debit ? rp(l.debit) : ''}</td>
                        <td className="num">{l.credit ? rp(l.credit) : ''}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {!list.length && <tr><td colSpan={6}><Empty msg="Belum ada jurnal entry" /></td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="tbl">
              <thead><tr><th>No Jurnal</th><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th>Referensi</th><th className="num">Debit</th><th className="num">Kredit</th><th>Status</th></tr></thead>
              <tbody>
                {list.map(j => {
                  const t = journalTotals(j);
                  return (
                    <tr key={j.id} className="clickable" onClick={() => router.push(`/journals/${j.id}`)}>
                      <td><b>{j.no}</b><span className="sub">{j.lines.length} baris</span></td>
                      <td className="whitespace-nowrap">{fdate(j.date)}</td>
                      <td><Badge tone={j.type === 'Pembelian' ? 'info' : 'success'}>{j.type}</Badge></td>
                      <td className="max-w-[320px]">{j.description}</td>
                      <td className="text-sm text-muted">{j.ref}</td>
                      <td className="num">{rp(t.debit)}</td>
                      <td className="num">{rp(t.credit)}</td>
                      <td>{t.debit === t.credit ? <Badge tone="neutral">Posted</Badge> : <Badge tone="danger">Tidak seimbang</Badge>}</td>
                    </tr>
                  );
                })}
                {!list.length && <tr><td colSpan={8}><Empty msg="Belum ada jurnal entry" /></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        {detail ? <Rows3 className="size-3.5" /> : <TableProperties className="size-3.5" />}
        Jurnal pembelian terbentuk saat tagihan vendor diposting; jurnal pembayaran terbentuk saat Jurnal Voucher dibayar kasir.
      </p>
    </>
  );
}
