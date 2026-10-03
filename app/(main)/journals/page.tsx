'use client';
import { Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react';
import { useListState } from '@/components/list-state';
import { Empty, PageHead, Tabs, Toolbar } from '@/components/ui';
import { journalTotals } from '@/lib/calc';
import { ACCOUNTS, accName } from '@/lib/constants';
import { downloadCSV, fdate, rp } from '@/lib/format';
import { useDB } from '@/lib/store';

export default function JournalsPage() {
  const router = useRouter();
  const journals = useDB(s => s.journals);
  const ls = useListState();
  const list = ls.status === 'All' ? journals : journals.filter(j => j.type === ls.status);
  const total = list.reduce((s, j) => s + journalTotals(j).debit, 0);

  const exportCSV = () => downloadCSV('jurnal.csv', [
    ['No Jurnal', 'Tanggal', 'Tipe', 'Keterangan', 'Referensi', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'],
    ...list.flatMap(j => j.lines.map(l => [j.no, j.date, j.type, j.description, j.ref, l.account, ACCOUNTS[l.account], l.debit, l.credit])),
  ]);

  return (
    <>
      <PageHead title="Jurnal Umum" sub={`${list.length} jurnal — total ${rp(total)}`}>
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
      </PageHead>
      <div className="card">
        <Toolbar><Tabs value={ls.status} options={[['All', 'Semua'], ['Pembelian', 'Pembelian'], ['Pembayaran', 'Pembayaran']]} onChange={v => ls.set('status', v)} /></Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No Jurnal</th><th>Tanggal</th><th>Keterangan</th><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
            <tbody>
              {list.map(j => (
                <Fragment key={j.id}>
                  {j.lines.map((l, i) => (
                    <tr key={i} className="clickable" onClick={() => router.push(`/invoices/${j.invoiceId}`)}>
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
              {!list.length && <tr><td colSpan={6}><Empty msg="Belum ada jurnal" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
