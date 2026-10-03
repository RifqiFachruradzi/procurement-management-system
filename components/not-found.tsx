'use client';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Empty } from './ui';

export function NotFound({ msg = 'Halaman atau data tidak ditemukan.' }: { msg?: string }) {
  return (
    <div className="card">
      <Empty msg={msg} icon={AlertCircle}><Link className="btn btn-primary" href="/">Ke Dashboard</Link></Empty>
    </div>
  );
}
