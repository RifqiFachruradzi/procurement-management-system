# Procura — Procurement Management System

Aplikasi web procurement dengan UI minimalis (font Arial Narrow, ikon SVG, tanpa emoji). Berjalan sepenuhnya di browser tanpa build step; data tersimpan di `localStorage`.

**Live:** https://rifqifachruradzi.github.io/procurement-management-system/ (GitHub Pages, otomatis deploy setiap push ke `main`).

## Alur

```
PR dibuat ─► PR disetujui atasan ─► PO dibuat ─► PO disetujui atasan ─► PO dikirim ke vendor
   ─► Vendor menyetujui (portal vendor) ─► Barang dikirim ─► Barang diterima (GR)
   ─► Tagihan vendor diinput (panggil No PO) ─► Jurnal otomatis ─► PO & PR Closed
```

## Fitur

| Menu | Fungsi |
| --- | --- |
| Dashboard | KPI PR/PO open-closed, nilai PO open, hutang, daftar "Perlu Tindakan", posisi PO |
| Purchase Request | Buat/edit PR, approval (setujui/tolak dengan catatan), list PR dengan filter Open/Closed, export CSV |
| Purchase Order | Buat PO dari PR yang disetujui, Form PO siap cetak dengan blok tanda tangan, approval atasan, kirim ke vendor (link portal + email), revisi bila ditolak, pengiriman & penerimaan barang, list PO Open/Closed |
| Portal Vendor | Halaman `#/vendor-portal/<id>` untuk vendor meninjau Form PO dan menekan Setujui / Tolak |
| Tracking PR | Timeline 10 tahap: posisi PR sampai barang datang & tagihan dijurnal |
| Database Vendor | CRUD vendor (kontak, NPWP, termin, rekening, rating, status aktif) |
| Tagihan Vendor | Input tagihan dengan memanggil No PO yang sudah disepakati vendor, cek selisih terhadap PO (3-way match), PPh 23, preview & posting jurnal, catat pembayaran |
| Jurnal | Jurnal pembelian (Dr Persediaan/Beban, Dr PPN Masukan, Cr Hutang Usaha, Cr Hutang PPh 23) dan pembayaran (Dr Hutang Usaha, Cr Kas & Bank), export CSV |
| Pengaturan | Profil perusahaan, nama user & approver, bagan akun, backup/restore JSON, reset data demo |

Status **Open/Closed**: PO dan PR otomatis menjadi *Closed* ketika barang sudah diterima **dan** tagihan sudah dijurnal. Keduanya juga dapat ditutup manual.

## Menjalankan lokal

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Catatan

- Data disimpan per-browser (localStorage). Portal vendor bekerja pada browser yang sama; untuk persetujuan vendor lintas perangkat diperlukan backend (bisa ditambahkan kemudian).
- Deploy: workflow `.github/workflows/pages.yml`. Jika Pages belum aktif, aktifkan di **Settings → Pages → Source: GitHub Actions**.
