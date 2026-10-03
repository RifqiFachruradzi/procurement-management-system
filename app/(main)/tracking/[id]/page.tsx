'use client';
import { ArrowLeft, ClipboardList, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NotFound } from '@/components/not-found';
import { HistoryCard, TrackingCard } from '@/components/tracking';
import { Badge, Card, DL, PageHead, StatusBadge } from '@/components/ui';
import { poTotals } from '@/lib/calc';
import { PO_STAGES } from '@/lib/constants';
import { fdate, rp } from '@/lib/format';
import { useDB } from '@/lib/store';

export default function TrackingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pr = useDB(s => s.prs.find(p => p.id === id));
  const po = useDB(s => s.pos.find(p => p.id === pr?.poId));
  const v = useDB(s => s.vendors.find(x => x.id === po?.vendorId));
  if (!pr) return <NotFound />;

  return (
    <>
      <PageHead title={`Tracking ${pr.no}`} sub={pr.purpose}>
        <Link className="btn" href="/tracking"><ArrowLeft className="size-4" />Semua PR</Link>
        <Link className="btn" href={`/pr/${pr.id}`}><ClipboardList className="size-4" />Detail PR</Link>
        {po && <Link className="btn" href={`/po/${po.id}`}><FileText className="size-4" />Form PO</Link>}
      </PageHead>
      <div className="grid gap-[18px] lg:grid-cols-2">
        <TrackingCard pr={pr} />
        <div className="space-y-[18px]">
          <Card title="Ringkasan">
            <DL items={[
              ['Pemohon', pr.requester], ['Departemen', pr.department], ['Dibutuhkan', fdate(pr.neededDate)], ['Status PR', <StatusBadge key="s" status={pr.status} />],
              ...(po ? [
                ['No PO', po.no], ['Vendor', v?.name ?? '-'], ['Tahap PO', <Badge key="t" tone={PO_STAGES[po.stage].tone}>{PO_STAGES[po.stage].label}</Badge>],
                ['Nilai PO', rp(poTotals(po).total)], ['Estimasi Tiba', fdate(po.deliveryDate)],
                ...(po.shipment ? [['Resi / SJ', `${po.shipment.courier} ${po.shipment.ref}`.trim() || '-']] : []),
              ] as [string, React.ReactNode][] : []),
            ]} />
          </Card>
          <HistoryCard events={[...pr.history, ...(po ? po.history.map(e => ({ ...e, po: po.no })) : [])]} />
        </div>
      </div>
    </>
  );
}
