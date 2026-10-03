'use client';
import { useParams } from 'next/navigation';
import { NotFound } from '@/components/not-found';
import { VendorForm } from '@/components/vendor-form';
import { useDB } from '@/lib/store';

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const vendor = useDB(s => s.vendors.find(v => v.id === id));
  return vendor ? <VendorForm vendor={vendor} /> : <NotFound />;
}
