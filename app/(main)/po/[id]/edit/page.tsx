'use client';
import { useParams } from 'next/navigation';
import { NotFound } from '@/components/not-found';
import { POForm } from '@/components/po-form';
import { Alert } from '@/components/ui';
import { PO_EDITABLE } from '@/lib/constants';
import { useDB } from '@/lib/store';

export default function EditPOPage() {
  const { id } = useParams<{ id: string }>();
  const po = useDB(s => s.pos.find(p => p.id === id));
  if (!po) return <NotFound />;
  if (!PO_EDITABLE.includes(po.stage)) return <Alert tone="warning">PO yang sudah dikirim/disepakati vendor tidak dapat diubah.</Alert>;
  return <POForm po={po} />;
}
