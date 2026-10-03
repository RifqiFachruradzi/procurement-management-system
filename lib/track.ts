import { TRACK_STEPS, type TrackStepDef } from './constants';
import type { DB, HistoryEvent, PO, PR, Tone } from './types';

export type StepState = 'done' | 'rejected' | 'current' | 'pending';
export interface TrackStep extends TrackStepDef { state: StepState; event: HistoryEvent | null }
export interface Tracking { steps: TrackStep[]; doneCount: number; position: { label: string; tone: Tone }; po: PO | null; closed: boolean }

/** Derives the position of a PR within the full procurement flow (PR → PO → vendor → goods → invoice). */
export function trackPR(db: DB, pr: PR): Tracking {
  const po = pr.poId ? db.pos.find(p => p.id === pr.poId) ?? null : null;
  const prEv = pr.history;
  const poEv = po ? po.history : [];
  const lastIdx = (list: HistoryEvent[], key: string) => list.reduce((n, e, i) => (e.key === key ? i : n), -1);
  const rev = { pr: lastIdx(prEv, 'PR_UPDATED'), po: lastIdx(poEv, 'REVISED') };

  const steps: TrackStep[] = TRACK_STEPS.map(s => {
    let events = s.src === 'pr' ? prEv : poEv;
    // after a revision only later events count; earlier rejections stay in the history log
    if (s.revisable && rev[s.src] >= 0) events = events.slice(rev[s.src] + 1);
    let last: HistoryEvent | null = null;
    for (const e of events) if (e.key === s.key || (s.rej && e.key === s.rej)) last = e;
    const state: StepState = last ? (last.key === s.key ? 'done' : 'rejected') : 'pending';
    return { ...s, state, event: last };
  });

  const closed = pr.status === 'Closed';
  let cur = steps.findIndex(s => s.state !== 'done');
  if (cur === -1) cur = steps.length;
  const current = steps[cur];
  if (current && current.state === 'pending' && !closed) current.state = 'current';

  const doneCount = steps.filter(s => s.state === 'done').length;
  let position: Tracking['position'];
  if (closed && doneCount === steps.length) position = { label: 'Selesai — barang diterima & tagihan dijurnal', tone: 'neutral' };
  else if (closed) position = { label: 'Ditutup sebelum selesai', tone: 'neutral' };
  else if (!current) position = { label: 'Selesai', tone: 'neutral' };
  else if (current.state === 'rejected') position = { label: `${current.label}: ditolak, perlu revisi`, tone: 'danger' };
  else if (current.key === 'SHIPPED') position = { label: 'Menunggu pengiriman vendor', tone: 'info' };
  else if (current.key === 'RECEIVED') position = { label: 'Barang dalam perjalanan', tone: 'info' };
  else position = { label: `Menunggu: ${current.label}`, tone: 'warning' };

  return { steps, doneCount, position, po, closed };
}
