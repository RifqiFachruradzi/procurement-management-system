'use client';
import { poTotals } from '@/lib/calc';
import { fdate, num, rp } from '@/lib/format';
import { useDB } from '@/lib/store';
import type { Approval, PO } from '@/lib/types';

function Sign({ title, a, fallback, stamp }: { title: string; a?: Approval; fallback: string; stamp?: string }) {
  return (
    <div className="text-center">
      <div>{title}</div>
      <div className={`grid h-14 place-items-center text-xs font-bold tracking-[.1em] uppercase ${a?.rejected ? 'text-red-700' : stamp ? 'text-neutral-600' : 'text-green-700'}`}>
        {a ? <span>{a.rejected ? 'Ditolak' : 'Disetujui'}<br />{fdate(a.at)}</span> : stamp ? <span>{stamp}</span> : null}
      </div>
      <div className="border-t border-neutral-900 pt-2">{a ? a.by : fallback}</div>
    </div>
  );
}

/** The printable Purchase Order form, including approval signature blocks. */
export function PODocument({ po }: { po: PO }) {
  const s = useDB(st => st.settings);
  const v = useDB(st => st.vendors.find(x => x.id === po.vendorId));
  const pr = useDB(st => st.prs.find(x => x.id === po.prId));
  const t = poTotals(po);
  const created = po.history.find(e => e.key === 'PO_CREATED');

  return (
    <div className="doc rounded-[10px] border border-line p-5 sm:p-10">
      <div className="flex flex-col justify-between gap-5 border-b-2 border-neutral-900 pb-4 sm:flex-row">
        <div>
          <b className="text-lg">{s.company}</b>
          <div className="text-[13px] text-neutral-600">{s.address}</div>
          <div className="text-[13px] text-neutral-600">NPWP {s.npwp}</div>
        </div>
        <div className="sm:text-right">
          <h2 className="text-[26px] tracking-[.06em]">PURCHASE ORDER</h2>
          <div className="font-bold">{po.no}</div>
          <div className="text-[13px] text-neutral-600">Tanggal: {fdate(po.date)}</div>
          <div className="text-[13px] text-neutral-600">Ref PR: {pr?.no ?? '-'}</div>
        </div>
      </div>

      <div className="my-5 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[11px] tracking-[.08em] text-neutral-500 uppercase">Kepada (Vendor)</span>
          <b>{v?.name ?? '(vendor dihapus)'}</b><br />
          {v?.address}<br />
          Up. {v?.contact || '-'} — {v?.phone}<br />
          {v?.email}<br />
          NPWP {v?.npwp || '-'}
        </div>
        <div>
          <span className="mb-1 block text-[11px] tracking-[.08em] text-neutral-500 uppercase">Kirim ke</span>
          {po.shipTo}
          <span className="mt-3 mb-1 block text-[11px] tracking-[.08em] text-neutral-500 uppercase">Pengiriman / Pembayaran</span>
          Tanggal kirim: {fdate(po.deliveryDate)}<br />
          Termin: {po.paymentTerms} hari setelah tagihan diterima
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>#</th><th>Deskripsi</th><th className="num">Qty</th><th>Satuan</th><th className="num">Harga</th><th className="num">Jumlah</th></tr></thead>
          <tbody>
            {po.items.map((i, n) => (
              <tr key={n}><td>{n + 1}</td><td>{i.name}</td><td className="num">{num(i.qty)}</td><td>{i.unit}</td><td className="num">{rp(i.price)}</td><td className="num">{rp(i.qty * i.price)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 ml-auto w-full max-w-[340px] text-sm">
        <Row l="Subtotal" r={rp(t.subtotal)} />
        {t.discount > 0 && <Row l="Diskon" r={`- ${rp(t.discount)}`} />}
        <Row l="DPP" r={rp(t.dpp)} />
        <Row l={`PPN ${po.taxRate}%`} r={rp(t.tax)} />
        <div className="mt-1.5 flex justify-between border-t border-neutral-900 pt-2.5 text-lg font-bold"><span>Total</span><span>{rp(t.total)}</span></div>
      </div>

      {po.notes && <div className="mt-4 text-[13px] text-neutral-600"><b>Catatan:</b> {po.notes}</div>}

      <div className="mt-9 grid gap-5 text-[13px] sm:grid-cols-3">
        <Sign title="Dibuat oleh" fallback={created?.by ?? s.userName} stamp={`Diajukan ${fdate(created?.at)}`} />
        <Sign title="Disetujui (Atasan)" a={po.approvals.internal} fallback={s.approverName} />
        <Sign title="Disetujui (Vendor)" a={po.approvals.vendor} fallback={`${v?.contact ?? ''} — ${v?.name ?? ''}`} />
      </div>
    </div>
  );
}

const Row = ({ l, r }: { l: string; r: string }) => <div className="flex justify-between py-1"><span>{l}</span><span>{r}</span></div>;
