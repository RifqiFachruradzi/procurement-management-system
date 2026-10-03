'use client';
import { Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useListState } from '@/components/list-state';
import { Alert, Badge, Empty, PageHead, SearchBox, Tabs, Toolbar } from '@/components/ui';
import { accName, VOUCHER_STATUS } from '@/lib/constants';
import { downloadCSV, fdate, rp } from '@/lib/format';
import { payableInvoices } from '@/lib/ops';
import { useDB } from '@/lib/store';
import type { VoucherStatus } from '@/lib/types';

export default function VouchersPage() {
  const router = useRouter();
  const { vouchers, invoices } = useDB();
  const ls = useListState();
  let list = vouchers;
  if (ls.status !== 'All') list = list.filter(v => v.status === ls.status);
  if (ls.q) list = list.filter(v => [v.no, v.payTo.name, v.description, ...v.invoiceIds.map(id => invoices.find(i => i.id === id)?.no)].join(' ').toLowerCase().includes(ls.q));
  const waiting = payableInvoices({ invoices });
  const count = (s: VoucherStatus) => vouchers.filter(v => v.status === s).length;

  const exportCSV = () => downloadCSV('jurnal-voucher.csv', [
    ['No Voucher', 'Tanggal', 'Dibayar kepada', 'Cara Bayar', 'Sumber Dana', 'Jumlah', 'Status', 'Tgl Bayar', 'Ref Bayar', 'Keterangan'],
    ...list.map(v => [v.no, v.date, v.payTo.name, v.method, accName(v.creditAccount), v.amount, VOUCHER_STATUS[v.status].label, v.payment?.date, v.payment?.ref, v.description]),
  ]);

  return (
    <>
      <PageHead title="List Jurnal Voucher" sub="Dokumen dasar pembayaran / bank keluar oleh kasir & finance.">
        <button className="btn" onClick={exportCSV}><Download className="size-4" />Export CSV</button>
        <Link className="btn btn-primary" href="/vouchers/new"><Plus className="size-4" />Buat Jurnal Voucher</Link>
      </PageHead>
      {waiting.length > 0 && (
        <Alert tone="info" className="mb-[18px]">
          {waiting.length} tagihan sudah dijurnal namun belum dibuatkan voucher pembayaran ({rp(waiting.reduce((s, i) => s + i.payable, 0))}).{' '}
          <Link className="link font-bold" href="/vouchers/new">Buat voucher</Link>
        </Alert>
      )}
      <div className="card">
        <Toolbar>
          <Tabs value={ls.status} onChange={v => ls.set('status', v)} options={[
            ['All', 'Semua'], ['Draft', `Draft (${count('Draft')})`], ['Checked', `Diperiksa (${count('Checked')})`],
            ['Approved', `Siap Bayar (${count('Approved')})`], ['Paid', 'Dibayar'], ['Cancelled', 'Batal'],
          ]} />
          <SearchBox value={ls.rawQ} onChange={v => ls.set('q', v)} placeholder="Cari no voucher, vendor, tagihan..." />
        </Toolbar>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>No Voucher</th><th>Tanggal</th><th>Dibayar kepada</th><th>Cara Bayar</th><th className="num">Jumlah</th><th>Status</th><th>Pembayaran</th></tr></thead>
            <tbody>
              {list.map(v => (
                <tr key={v.id} className="clickable" onClick={() => router.push(`/vouchers/${v.id}`)}>
                  <td><b>{v.no}</b><span className="sub">{v.invoiceIds.length} tagihan</span></td>
                  <td className="whitespace-nowrap">{fdate(v.date)}</td>
                  <td>{v.payTo.name}<span className="sub">{v.method === 'Tunai' ? 'Tunai' : `${v.payTo.bank} ${v.payTo.account}`}</span></td>
                  <td>{v.method}<span className="sub">{accName(v.creditAccount)}</span></td>
                  <td className="num">{rp(v.amount)}</td>
                  <td><Badge tone={VOUCHER_STATUS[v.status].tone}>{VOUCHER_STATUS[v.status].label}</Badge></td>
                  <td>{v.payment ? <>{fdate(v.payment.date)}<span className="sub">{v.payment.ref || '-'}</span></> : <span className="text-muted">-</span>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7}><Empty msg="Belum ada jurnal voucher" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
