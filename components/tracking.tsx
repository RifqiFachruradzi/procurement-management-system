'use client';
import { Check, CheckCircle2, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { EVENT_LABELS } from '@/lib/constants';
import { fdt } from '@/lib/format';
import { useDB } from '@/lib/store';
import { trackPR } from '@/lib/track';
import type { HistoryEvent, PR } from '@/lib/types';
import { Alert, Badge, cx } from './ui';

export function useTrack(pr: PR) {
  const db = useDB();
  return trackPR(db, pr);
}

export function ProgressStrip({ pr, withLabel }: { pr: PR; withLabel?: boolean }) {
  const t = useTrack(pr);
  return (
    <div>
      <div className="flex min-w-[120px] gap-[3px]" title={t.position.label}>
        {t.steps.map(s => (
          <span key={s.key} className={cx('h-1.5 flex-1 rounded-[3px]',
            s.state === 'done' ? 'bg-ok' : s.state === 'rejected' ? 'bg-bad' : s.state === 'current' ? 'bg-brand' : 'bg-neutral-bg')} />
        ))}
      </div>
      {withLabel && <span className="sub mt-1">{t.position.label}</span>}
    </div>
  );
}

export function TrackingCard({ pr }: { pr: PR }) {
  const t = useTrack(pr);
  const vendors = useDB(s => s.vendors);
  const tone = t.position.tone === 'danger' ? 'danger' : t.position.tone === 'neutral' ? 'success' : 'info';
  return (
    <section className="card self-start">
      <div className="card-head">
        <h3>Posisi PR s/d Barang Datang</h3>
        <Badge tone="neutral">{t.doneCount}/{t.steps.length}</Badge>
      </div>
      <div className="card-body">
        <Alert tone={tone} className="mb-[18px]">{t.position.label}</Alert>
        <ol>
          {t.steps.map((s, i) => (
            <li key={s.key} className="relative flex gap-3.5 pb-[18px] last:pb-0">
              {i < t.steps.length - 1 && <span className={cx('absolute top-7 bottom-0 left-[13px] w-0.5', s.state === 'done' ? 'bg-ok' : 'bg-line')} />}
              <span className={cx('z-[1] grid size-7 shrink-0 place-items-center rounded-full border-2',
                s.state === 'done' && 'border-ok bg-ok text-white',
                s.state === 'rejected' && 'border-bad bg-bad text-white',
                s.state === 'current' && 'border-brand bg-surface text-brand ring-4 ring-brand/20',
                s.state === 'pending' && 'border-line bg-surface text-muted')}>
                {s.state === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : s.state === 'rejected' ? <X className="size-3.5" strokeWidth={3} /> : s.state === 'current' ? <Clock className="size-3.5" /> : null}
              </span>
              <div className="min-w-0">
                <div className={s.state === 'pending' ? 'text-muted' : 'font-bold'}>{s.label}</div>
                {s.event ? (
                  <div className="text-[13px] text-muted">
                    {fdt(s.event.at)} — {s.event.by}
                    {s.event.note && <><br />{s.event.note}</>}
                  </div>
                ) : s.state === 'current' ? <div className="text-[13px] text-muted">Sedang diproses</div> : null}
                {s.key === 'PO_CREATED' && t.po && (
                  <div className="text-[13px] text-muted">
                    <Link className="link" href={`/po/${t.po.id}`}>{t.po.no}</Link> — {vendors.find(v => v.id === t.po!.vendorId)?.name}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        {t.closed && t.doneCount === t.steps.length && (
          <div className="mt-4 flex items-center gap-2 text-sm text-ok"><CheckCircle2 className="size-4" />Proses pengadaan selesai</div>
        )}
      </div>
    </section>
  );
}

export function HistoryCard({ events }: { events: HistoryEvent[] }) {
  const list = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="card">
      <div className="card-head"><h3>Riwayat Aktivitas</h3></div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <tbody>
            {list.map((e, i) => (
              <tr key={i}>
                <td className="w-[160px] text-sm text-muted">{fdt(e.at)}</td>
                <td>
                  <b>{EVENT_LABELS[e.key]}</b>{e.po && <span className="text-muted"> ({e.po})</span>}
                  <span className="sub">{e.by}{e.note && ` — ${e.note}`}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
