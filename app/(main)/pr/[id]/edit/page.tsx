'use client';
import { useParams } from 'next/navigation';
import { NotFound } from '@/components/not-found';
import { PRForm } from '@/components/pr-form';
import { Alert } from '@/components/ui';
import { useDB } from '@/lib/store';

export default function EditPRPage() {
  const { id } = useParams<{ id: string }>();
  const pr = useDB(s => s.prs.find(p => p.id === id));
  if (!pr) return <NotFound />;
  if (pr.status !== 'Open' || !['SUBMITTED', 'REJECTED'].includes(pr.stage)) return <Alert tone="warning">PR yang sudah diproses tidak dapat diubah.</Alert>;
  return <PRForm pr={pr} />;
}
