'use client';
import { useSearchParams } from 'next/navigation';
import { POForm } from '@/components/po-form';

export default function NewPOPage() {
  const pr = useSearchParams().get('pr') ?? undefined;
  return <POForm key={pr} initialPrId={pr} />;
}
