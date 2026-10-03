# Procura — Procurement Management System

Procurement web app built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**, with Zustand + Immer for state and lucide-react for icons. Minimalist UI in Arial Narrow, SVG icons (no emoji), and light/dark mode.

## Flow

```
PR dibuat ─► PR disetujui atasan ─► PO dibuat ─► PO disetujui atasan ─► PO dikirim ke vendor
   ─► Vendor menyetujui (portal vendor) ─► Barang dikirim ─► Barang diterima (GR)
   ─► Tagihan vendor diinput (panggil No PO) ─► Jurnal Entry pembelian ─► PO & PR Closed
   ─► Jurnal Voucher (Dibuat ► Diperiksa ► Disetujui) ─► Dibayar kasir (bank/kas keluar) ─► Jurnal Entry pembayaran
```

| Halaman | Fungsi |
| --- | --- |
| `/` Dashboard | KPI PR/PO open-closed, nilai PO open, hutang, "Perlu Tindakan", posisi PO |
| `/pr` Purchase Request | Buat/edit/revisi PR, approval (setujui/tolak + catatan), list Open/Closed, export CSV |
| `/po` Purchase Order | PO dari PR disetujui, Form PO siap cetak + blok tanda tangan, approval atasan, kirim ke vendor (link + email), revisi, pengiriman & penerimaan barang |
| `/vendor-portal/[id]` | Halaman vendor untuk meninjau Form PO dan menekan Setujui / Tolak |
| `/tracking` | Timeline 10 tahap posisi PR sampai barang datang & tagihan dijurnal |
| `/vendors` | Database vendor (kontak, NPWP, termin, rekening, rating, status) |
| `/invoices` | Input tagihan dengan memanggil No PO yang sudah disepakati, cek selisih (3-way match), PPh 23, preview & posting jurnal, pembayaran |
| `/vouchers` | **Jurnal Voucher**: dokumen dasar pembayaran / bank keluar. Pilih tagihan per vendor → diperiksa Accounting → disetujui Finance Manager → dibayar Kasir (no. transfer/cek). Cetak voucher dengan terbilang & 4 tanda tangan |
| `/journals` | **List Jurnal Entry** (ringkas / detail akun) dan halaman detail per jurnal, export CSV |
| `/settings` | Profil perusahaan, user & approver, bagan akun, backup/restore JSON, reset data demo |

PO dan PR otomatis **Closed** saat barang diterima **dan** tagihan sudah dijurnal.

## Struktur

```
app/(main)/...        halaman dengan sidebar (dashboard, pr, po, tracking, vendors, invoices, journals, settings)
app/vendor-portal/    halaman persetujuan untuk vendor (tanpa sidebar)
components/           UI (shell, dialog/toast, form, PO document, tracking timeline)
lib/ops.ts            logika bisnis (approval, PO, GR, invoice, jurnal)
lib/store.ts          state Zustand + persist (localStorage)
lib/track.ts          perhitungan posisi PR
lib/seed.ts           data demo
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
```

## Deploy ke Vercel

1. https://vercel.com/new → **Import** `procurement-management-system`.
2. Framework Preset: **Next.js** (otomatis terdeteksi; `vercel.json` juga menetapkannya). Biarkan Build/Output default.
3. **Production Branch** harus `main` (Project Settings → Git). Setiap push ke `main` otomatis menjadi deployment production.

## Catatan

Data saat ini disimpan per-browser (localStorage). Untuk multi-user dan persetujuan vendor lintas perangkat, langkah berikutnya adalah menambahkan database (mis. Postgres via Vercel Marketplace) dan API route — logika bisnis di `lib/ops.ts` sudah terpisah sehingga mudah dipindahkan ke server.
