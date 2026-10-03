import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <img src="/logo.svg" alt="" className="mx-auto mb-4 size-10" />
        <h1 className="text-2xl">Halaman tidak ditemukan</h1>
        <p className="mt-1 mb-5 text-muted">Alamat yang Anda buka tidak tersedia.</p>
        <Link className="btn btn-primary" href="/">Ke Dashboard</Link>
      </div>
    </div>
  );
}
