import { poTotals } from './calc';
import { addDays } from './format';
import * as ops from './ops';
import type { DB, Vendor } from './types';

export function emptyDB(): DB {
  return {
    settings: {
      company: 'PT Contoh Sejahtera',
      address: 'Jl. Jend. Sudirman No. 10, Jakarta 10220',
      npwp: '01.234.567.8-012.000',
      userName: 'Rifqi Fachruradzi',
      approverName: 'Budi Santoso (Head of Procurement)',
      shipTo: 'Gudang Utama, Jl. Industri Raya No. 5, Bekasi',
      financeName: 'Maya Sari (Staff Finance)',
      checkerName: 'Teguh Prasetyo (Accounting)',
      financeApprover: 'Ratna Dewi (Finance Manager)',
      cashierName: 'Joko Susilo (Kasir)',
    },
    counters: {}, vendors: [], prs: [], pos: [], invoices: [], journals: [], vouchers: [],
  };
}

/** Demo data covering every stage of the procurement flow. */
export function seedDB(): DB {
  const db = emptyDB();
  const t = (daysAgo: number, h = 9) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  const day = (daysAgo: number) => t(daysAgo).slice(0, 10);

  const vendorData: Omit<Vendor, 'id' | 'code' | 'active'>[] = [
    { name: 'PT Sinar Jaya Abadi', category: 'ATK & Perlengkapan', contact: 'Andi Wijaya', email: 'sales@sinarjaya.co.id', phone: '021-5551234', address: 'Jl. Gajah Mada 21, Jakarta Barat', npwp: '02.111.222.3-031.000', terms: 30, bank: 'BCA', account: '1234567890', rating: 'A' },
    { name: 'CV Teknik Mandiri', category: 'Sparepart & Teknik', contact: 'Sri Lestari', email: 'order@teknikmandiri.id', phone: '022-7203344', address: 'Jl. Soekarno-Hatta 88, Bandung', npwp: '03.222.333.4-421.000', terms: 14, bank: 'Mandiri', account: '1310009988776', rating: 'A' },
    { name: 'PT Data Prima Solusi', category: 'IT & Elektronik', contact: 'Kevin Hartono', email: 'b2b@dataprima.com', phone: '021-2988776', address: 'Jl. HR Rasuna Said Kav. 3, Jakarta Selatan', npwp: '01.333.444.5-061.000', terms: 30, bank: 'BNI', account: '0987654321', rating: 'B' },
    { name: 'PT Bersih Cemerlang', category: 'Jasa Kebersihan', contact: 'Dewi Anggraini', email: 'cs@bersihcemerlang.co.id', phone: '021-8877665', address: 'Jl. Kalimalang 12, Bekasi', npwp: '04.444.555.6-407.000', terms: 30, bank: 'BRI', account: '0345012345678', rating: 'B' },
    { name: 'PT Logistik Nusantara', category: 'Ekspedisi', contact: 'Hendra Saputra', email: 'ops@logistiknusantara.id', phone: '031-5432109', address: 'Jl. Tanjung Perak 7, Surabaya', npwp: '05.555.666.7-614.000', terms: 45, bank: 'BCA', account: '5550001112', rating: 'A' },
  ];
  const V = vendorData.map(v => {
    const id = ops.saveVendor(db, { ...v, active: true });
    return db.vendors.find(x => x.id === id)!;
  });
  const ship = db.settings.shipTo;
  const fromPR = (prId: string, prices: number[]) => db.prs.find(p => p.id === prId)!.items.map((i, n) => ({ ...i, price: prices[n] }));

  // 1) Full cycle — closed & paid
  let pr = ops.createPR(db, { requester: 'Rina Marlina', supervisor: 'Hendra Wijaya (GA Manager)', department: 'General Affairs', neededDate: day(20), purpose: 'Kebutuhan ATK kuartal IV', items: [
    { name: 'Kertas A4 80gsm', qty: 50, unit: 'rim' },
    { name: 'Tinta Printer Epson 003', qty: 20, unit: 'pcs' },
    { name: 'Map Plastik', qty: 100, unit: 'pcs' },
  ] }, { at: t(40) });
  ops.approvePR(db, pr, { at: t(39, 8) });
  ops.approvePR(db, pr, { at: t(39), note: 'OK, sesuai budget' });
  let po = ops.createPO(db, { prId: pr, vendorId: V[0].id, items: fromPR(pr, [53000, 83000, 2000]), taxRate: 11, discount: 50000, deliveryDate: day(28), paymentTerms: 30, shipTo: ship }, { at: t(38) });
  ops.approvePO(db, po, { at: t(37) });
  ops.sendPO(db, po, { at: t(37, 14), note: 'Dikirim ke sales@sinarjaya.co.id' });
  ops.vendorAccept(db, po, { at: t(36), by: 'Andi Wijaya (PT Sinar Jaya Abadi)', note: 'Siap kirim minggu depan' });
  ops.shipPO(db, po, { courier: 'Armada Vendor', ref: 'SJ-88123', date: day(31) }, { at: t(31) });
  ops.receivePO(db, po, { date: day(30), receiver: 'Agus (Gudang)', note: 'Lengkap, kondisi baik' }, { at: t(30) });
  const tot = poTotals(db.pos.find(p => p.id === po)!);
  const inv = ops.postInvoice(db, { poId: po, vendorInvoiceNo: 'SJA/INV/2026/0912', taxInvoiceNo: '010.000-26.12345678', date: day(29), dueDate: addDays(day(29), 30), dpp: tot.dpp, tax: tot.tax, pphRate: 0, debitAccount: '5-1200' }, { at: t(29) });
  const jv = ops.createVoucher(db, { date: day(7), vendorId: V[0].id, invoiceIds: [inv], method: 'Transfer', creditAccount: '1-1110', description: 'Pembayaran ATK kuartal IV' }, { at: t(7) });
  ops.checkVoucher(db, jv, { at: t(6) });
  ops.approveVoucher(db, jv, { at: t(6, 15) });
  ops.payVoucher(db, jv, { date: day(5), ref: 'TRF-BCA-0012345' }, { at: t(5) });

  // 2) Shipped, not yet invoiced
  pr = ops.createPR(db, { requester: 'Fajar Nugroho', supervisor: 'Agus Salim (Maintenance Manager)', department: 'Maintenance', neededDate: day(-3), purpose: 'Penggantian bearing & v-belt mesin produksi line 2', priority: 'Tinggi', items: [
    { name: 'Bearing SKF 6205', qty: 12, unit: 'pcs' },
    { name: 'V-Belt B-52', qty: 6, unit: 'pcs' },
  ] }, { at: t(12) });
  ops.approvePR(db, pr, { at: t(11, 8) });
  ops.approvePR(db, pr, { at: t(11) });
  po = ops.createPO(db, { prId: pr, vendorId: V[1].id, items: fromPR(pr, [120000, 95000]), taxRate: 11, discount: 0, deliveryDate: day(-2), paymentTerms: 14, shipTo: ship }, { at: t(10) });
  ops.approvePO(db, po, { at: t(9) });
  ops.sendPO(db, po, { at: t(9, 13) });
  ops.vendorAccept(db, po, { at: t(8), by: 'Sri Lestari (CV Teknik Mandiri)' });
  ops.shipPO(db, po, { courier: 'JNE Trucking', ref: 'JTR-55128890', date: day(2) }, { at: t(2) });
  const tot2 = poTotals(db.pos.find(p => p.id === po)!);
  const inv2 = ops.postInvoice(db, { poId: po, vendorInvoiceNo: 'TM/INV/10/0458', taxInvoiceNo: '010.000-26.22334455', date: day(2), dueDate: addDays(day(2), 14), dpp: tot2.dpp, tax: tot2.tax, pphRate: 0, debitAccount: '1-1400' }, { at: t(2, 11) });
  const jv2 = ops.createVoucher(db, { date: day(1), vendorId: V[1].id, invoiceIds: [inv2], method: 'Transfer', creditAccount: '1-1120', description: 'Pembayaran bearing & v-belt line 2 (termin 14 hari)' }, { at: t(1) });
  ops.checkVoucher(db, jv2, { at: t(0, 8) });

  // 3) Sent to vendor, waiting for vendor approval
  pr = ops.createPR(db, { requester: 'Yoga Pratama', supervisor: 'Bambang Irawan (IT Manager)', department: 'IT', neededDate: day(-14), purpose: 'Laptop untuk karyawan baru divisi Finance', items: [
    { name: 'Laptop Lenovo ThinkPad E14 i5/16GB/512GB', qty: 3, unit: 'unit' },
    { name: 'Mouse Wireless Logitech M331', qty: 3, unit: 'pcs' },
  ] }, { at: t(6) });
  ops.approvePR(db, pr, { at: t(5, 8) });
  ops.approvePR(db, pr, { at: t(5) });
  po = ops.createPO(db, { prId: pr, vendorId: V[2].id, items: fromPR(pr, [13500000, 250000]), taxRate: 11, discount: 500000, deliveryDate: day(-10), paymentTerms: 30, shipTo: db.settings.address }, { at: t(4) });
  ops.approvePO(db, po, { at: t(3) });
  ops.sendPO(db, po, { at: t(3, 15) });

  // 4) PO waiting internal approval
  pr = ops.createPR(db, { requester: 'Lia Kurniawati', supervisor: 'Hendra Wijaya (GA Manager)', department: 'General Affairs', neededDate: day(-20), purpose: 'Kontrak jasa kebersihan bulan depan', items: [
    { name: 'Jasa Cleaning Service (bulanan)', qty: 1, unit: 'paket' },
  ] }, { at: t(3) });
  ops.approvePR(db, pr, { at: t(2, 8) });
  ops.approvePR(db, pr, { at: t(2) });
  ops.createPO(db, { prId: pr, vendorId: V[3].id, items: fromPR(pr, [18000000]), taxRate: 11, discount: 0, deliveryDate: day(-25), paymentTerms: 30, shipTo: db.settings.address, notes: 'Termasuk bahan pembersih.' }, { at: t(1) });

  // 5) PR approved, no PO yet
  pr = ops.createPR(db, { requester: 'Dimas Aryo', supervisor: 'Rudi Hartono (Warehouse Manager)', department: 'Warehouse', neededDate: day(-12), purpose: 'Pallet tambahan untuk area penyimpanan baru', items: [
    { name: 'Pallet Plastik 120x100', qty: 40, unit: 'pcs' },
  ] }, { at: t(2) });
  ops.approvePR(db, pr, { at: t(1, 8) });
  ops.approvePR(db, pr, { at: t(1) });

  // 6) PR waiting approval
  ops.createPR(db, { requester: 'Nadia Putri', supervisor: 'Sinta Maharani (Marketing Manager)', department: 'Marketing', neededDate: day(-7), purpose: 'Material promosi pameran', items: [
    { name: 'X-Banner 60x160', qty: 6, unit: 'pcs' },
    { name: 'Brosur A5 Full Color', qty: 2000, unit: 'lembar' },
  ] }, { at: t(0, 8) });


  // 8) PR approved by the requester's supervisor, waiting for Procurement
  pr = ops.createPR(db, { requester: 'Putri Ayu', supervisor: 'Ratna Dewi (Finance Manager)', department: 'Finance', neededDate: day(-10), purpose: 'Lemari arsip tahan api untuk dokumen keuangan', items: [
    { name: 'Lemari Arsip Tahan Api 4 Laci', qty: 2, unit: 'unit' },
  ] }, { at: t(0, 9) });
  ops.approvePR(db, pr, { at: t(0, 11), note: 'Disetujui, mohon diproses' });

  return db;
}
