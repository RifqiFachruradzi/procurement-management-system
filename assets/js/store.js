/* Data layer: persistence (localStorage), business actions, and demo seed */

const ACCOUNTS = {
  '1-1100': 'Kas & Bank',
  '1-1400': 'Persediaan Barang',
  '1-1500': 'PPN Masukan',
  '1-2100': 'Aset Tetap - Peralatan',
  '2-1100': 'Hutang Usaha',
  '2-1300': 'Hutang PPh 23',
  '5-1100': 'Beban Operasional',
  '5-1200': 'Beban Perlengkapan Kantor',
  '5-1300': 'Beban Jasa & Pemeliharaan',
};
const DEBIT_ACCOUNTS = ['1-1400', '1-2100', '5-1100', '5-1200', '5-1300'];

const PR_STAGES = {
  SUBMITTED: { label: 'Menunggu Approval', tone: 'warning' },
  APPROVED: { label: 'Disetujui', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
  PO_CREATED: { label: 'PO Dibuat', tone: 'info' },
};

const PO_STAGES = {
  PENDING: { label: 'Menunggu Approval Atasan', tone: 'warning' },
  REJECTED: { label: 'Ditolak Atasan', tone: 'danger' },
  APPROVED: { label: 'Disetujui Atasan', tone: 'info' },
  SENT: { label: 'Menunggu Persetujuan Vendor', tone: 'warning' },
  VENDOR_REJECTED: { label: 'Ditolak Vendor', tone: 'danger' },
  ACCEPTED: { label: 'Disepakati Vendor', tone: 'success' },
  SHIPPED: { label: 'Dalam Pengiriman', tone: 'info' },
  RECEIVED: { label: 'Barang Diterima', tone: 'success' },
  CLOSED: { label: 'Selesai', tone: 'neutral' },
};
const PO_FLOW = ['PENDING', 'APPROVED', 'SENT', 'ACCEPTED', 'SHIPPED', 'RECEIVED', 'CLOSED'];

const TRACK_STEPS = [
  { key: 'PR_CREATED', label: 'PR Dibuat', src: 'pr' },
  { key: 'PR_APPROVED', label: 'PR Disetujui', src: 'pr', rej: 'PR_REJECTED', revisable: true },
  { key: 'PO_CREATED', label: 'PO Dibuat', src: 'po' },
  { key: 'PO_APPROVED', label: 'PO Disetujui Atasan', src: 'po', rej: 'PO_REJECTED', revisable: true },
  { key: 'PO_SENT', label: 'PO Dikirim ke Vendor', src: 'po', revisable: true },
  { key: 'VENDOR_ACCEPTED', label: 'PO Disetujui Vendor', src: 'po', rej: 'VENDOR_REJECTED', revisable: true },
  { key: 'SHIPPED', label: 'Barang Dikirim Vendor', src: 'po' },
  { key: 'RECEIVED', label: 'Barang Diterima (GR)', src: 'po' },
  { key: 'INVOICED', label: 'Tagihan Diinput & Dijurnal', src: 'po' },
  { key: 'CLOSED', label: 'Selesai / Closed', src: 'pr' },
];

const EVENT_LABELS = {
  PR_CREATED: 'PR dibuat', PR_UPDATED: 'PR diperbarui', PR_APPROVED: 'PR disetujui', PR_REJECTED: 'PR ditolak',
  PO_CREATED: 'PO dibuat', PO_APPROVED: 'PO disetujui atasan', PO_REJECTED: 'PO ditolak atasan', REVISED: 'PO direvisi & diajukan ulang',
  PO_UPDATED: 'PO diperbarui', PO_SENT: 'PO dikirim ke vendor', VENDOR_ACCEPTED: 'PO disetujui vendor', VENDOR_REJECTED: 'PO ditolak vendor',
  SHIPPED: 'Barang dikirim vendor', RECEIVED: 'Barang diterima', INVOICED: 'Tagihan diinput & dijurnal', PAID: 'Tagihan dibayar',
  CLOSED: 'Ditutup (Closed)', REOPENED: 'Dibuka kembali',
};

const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + Number(n || 0)); return x.toISOString().slice(0, 10); };
const round = n => Math.round(Number(n) || 0);

const Store = (() => {
  const KEY = 'procura.pms.v1';
  let db = null;

  function empty() {
    return {
      settings: {
        company: 'PT Contoh Sejahtera',
        address: 'Jl. Jend. Sudirman No. 10, Jakarta 10220',
        npwp: '01.234.567.8-012.000',
        userName: 'Rifqi Fachruradzi',
        approverName: 'Budi Santoso (Head of Procurement)',
        shipTo: 'Gudang Utama, Jl. Industri Raya No. 5, Bekasi',
      },
      counters: {},
      vendors: [], prs: [], pos: [], invoices: [], journals: [],
    };
  }

  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !db.vendors) { db = empty(); Seed.run(); save(); }
    return db;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable */ }
  }
  function reset(withSeed = true) {
    db = empty();
    if (withSeed) Seed.run();
    save();
  }
  function replace(data) { db = Object.assign(empty(), data); save(); }
  function nextNo(prefix, at) {
    const year = new Date(at || Date.now()).getFullYear();
    const k = `${prefix}-${year}`;
    db.counters[k] = (db.counters[k] || 0) + 1;
    return `${prefix}/${year}/${String(db.counters[k]).padStart(4, '0')}`;
  }
  const byId = (col, id) => db[col].find(x => x.id === id);

  return { load, save, reset, replace, nextNo, byId, get db() { return db; } };
})();

/* ---------- Calculations ---------- */
function prTotal(pr) { return pr.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.estPrice) || 0), 0); }
function poTotals(po) {
  const subtotal = po.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const discount = Number(po.discount) || 0;
  const dpp = Math.max(0, subtotal - discount);
  const tax = round(dpp * (Number(po.taxRate) || 0) / 100);
  return { subtotal, discount, dpp, tax, total: dpp + tax };
}
function journalTotals(j) {
  return j.lines.reduce((s, l) => ({ debit: s.debit + (Number(l.debit) || 0), credit: s.credit + (Number(l.credit) || 0) }), { debit: 0, credit: 0 });
}

/* ---------- Tracking ---------- */
function trackPR(pr) {
  const db = Store.db;
  const po = pr.poId ? Store.byId('pos', pr.poId) : null;
  const prEv = pr.history || [];
  const poEv = po ? po.history : [];
  const lastIdx = (list, key) => { let n = -1; list.forEach((e, i) => { if (e.key === key) n = i; }); return n; };
  const rev = { pr: lastIdx(prEv, 'PR_UPDATED'), po: lastIdx(poEv, 'REVISED') };

  const steps = TRACK_STEPS.map(s => {
    let events = s.src === 'pr' ? prEv : poEv;
    // after a revision only later events count; earlier rejections remain in the history log
    if (s.revisable && rev[s.src] >= 0) events = events.slice(rev[s.src] + 1);
    let last = null;
    for (const e of events) if (e.key === s.key || (s.rej && e.key === s.rej)) last = e;
    let state = 'pending';
    if (last) state = last.key === s.key ? 'done' : 'rejected';
    return { ...s, state, event: last };
  });

  // Forward consistency: a step is only "done" if everything before it is done (except closing manually)
  const closed = pr.status === 'Closed';
  let currentIdx = steps.findIndex(s => s.state !== 'done');
  if (currentIdx === -1) currentIdx = steps.length;
  if (currentIdx < steps.length && steps[currentIdx].state === 'pending' && !closed) steps[currentIdx].state = 'current';
  // INVOICED may occur before RECEIVED; that's fine — it shows as done out of order.

  const doneCount = steps.filter(s => s.state === 'done').length;
  let position;
  const cur = steps[currentIdx];
  if (closed && doneCount === steps.length) position = { label: 'Selesai — barang diterima & tagihan dijurnal', tone: 'neutral' };
  else if (closed) position = { label: 'Ditutup sebelum selesai', tone: 'neutral' };
  else if (cur && cur.state === 'rejected') position = { label: `${cur.label}: ditolak, perlu revisi`, tone: 'danger' };
  else if (cur) position = { label: `Menunggu: ${cur.label}`, tone: 'warning' };
  else position = { label: 'Selesai', tone: 'neutral' };
  if (!closed && cur && cur.key === 'SHIPPED') position = { label: 'Menunggu pengiriman vendor', tone: 'info' };
  if (!closed && cur && cur.key === 'RECEIVED') position = { label: 'Barang dalam perjalanan', tone: 'info' };

  return { steps, currentIdx, doneCount, position, po, closed, db };
}

/* ---------- Business actions ---------- */
const Actions = (() => {
  const db = () => Store.db;
  const ev = (key, o = {}) => ({ key, at: o.at || nowISO(), by: o.by || db().settings.userName, note: o.note || '' });
  const commit = (o) => { if (!o || !o.noSave) Store.save(); };

  function createPR(data, o = {}) {
    const at = o.at || nowISO();
    const pr = {
      id: uid(), no: Store.nextNo('PR', at), date: data.date || at.slice(0, 10),
      requester: data.requester, department: data.department, neededDate: data.neededDate,
      purpose: data.purpose || '', priority: data.priority || 'Normal',
      items: data.items, status: 'Open', stage: 'SUBMITTED', poId: null,
      history: [ev('PR_CREATED', { ...o, at, by: data.requester })],
    };
    db().prs.unshift(pr); commit(o); return pr;
  }
  function updatePR(id, data, o = {}) {
    const pr = Store.byId('prs', id);
    Object.assign(pr, data);
    if (pr.stage === 'REJECTED') { pr.stage = 'SUBMITTED'; }
    pr.history.push(ev('PR_UPDATED', o));
    commit(o); return pr;
  }
  function approvePR(id, o = {}) {
    const pr = Store.byId('prs', id);
    pr.stage = 'APPROVED'; pr.history.push(ev('PR_APPROVED', { by: db().settings.approverName, ...o })); commit(o); return pr;
  }
  function rejectPR(id, o = {}) {
    const pr = Store.byId('prs', id);
    pr.stage = 'REJECTED'; pr.history.push(ev('PR_REJECTED', { by: db().settings.approverName, ...o })); commit(o); return pr;
  }
  function closePR(id, o = {}) {
    const pr = Store.byId('prs', id);
    pr.status = 'Closed'; pr.history.push(ev('CLOSED', o)); commit(o); return pr;
  }
  function reopenPR(id, o = {}) {
    const pr = Store.byId('prs', id);
    pr.status = 'Open'; pr.history = pr.history.filter(e => e.key !== 'CLOSED'); pr.history.push(ev('REOPENED', o)); commit(o); return pr;
  }

  function createPO(data, o = {}) {
    const at = o.at || nowISO();
    const pr = Store.byId('prs', data.prId);
    const po = {
      id: uid(), no: Store.nextNo('PO', at), date: data.date || at.slice(0, 10),
      prId: data.prId, vendorId: data.vendorId, items: data.items,
      discount: Number(data.discount) || 0, taxRate: Number(data.taxRate) || 0,
      deliveryDate: data.deliveryDate, paymentTerms: Number(data.paymentTerms) || 0,
      shipTo: data.shipTo, notes: data.notes || '',
      status: 'Open', stage: 'PENDING', invoiceId: null, received: false,
      approvals: {}, shipment: null, receipt: null,
      history: [ev('PO_CREATED', { ...o, at })],
    };
    db().pos.unshift(po);
    if (pr) { pr.poId = po.id; pr.stage = 'PO_CREATED'; }
    commit(o); return po;
  }
  function updatePO(id, data, o = {}) {
    const po = Store.byId('pos', id);
    Object.assign(po, data);
    if (po.stage === 'REJECTED' || po.stage === 'VENDOR_REJECTED' || po.stage === 'APPROVED') {
      po.stage = 'PENDING'; po.approvals = {}; po.history.push(ev('REVISED', o));
    } else po.history.push(ev('PO_UPDATED', o));
    commit(o); return po;
  }
  function approvePO(id, o = {}) {
    const po = Store.byId('pos', id);
    const e = ev('PO_APPROVED', { by: db().settings.approverName, ...o });
    po.stage = 'APPROVED'; po.approvals.internal = { by: e.by, at: e.at, note: e.note }; po.history.push(e); commit(o); return po;
  }
  function rejectPO(id, o = {}) {
    const po = Store.byId('pos', id);
    const e = ev('PO_REJECTED', { by: db().settings.approverName, ...o });
    po.stage = 'REJECTED'; po.approvals.internal = { by: e.by, at: e.at, note: e.note, rejected: true }; po.history.push(e); commit(o); return po;
  }
  function sendPO(id, o = {}) {
    const po = Store.byId('pos', id);
    po.stage = 'SENT'; po.history.push(ev('PO_SENT', o)); commit(o); return po;
  }
  function vendorAccept(id, o = {}) {
    const po = Store.byId('pos', id);
    const e = ev('VENDOR_ACCEPTED', o);
    po.stage = 'ACCEPTED'; po.approvals.vendor = { by: e.by, at: e.at, note: e.note }; po.history.push(e); commit(o); return po;
  }
  function vendorReject(id, o = {}) {
    const po = Store.byId('pos', id);
    const e = ev('VENDOR_REJECTED', o);
    po.stage = 'VENDOR_REJECTED'; po.approvals.vendor = { by: e.by, at: e.at, note: e.note, rejected: true }; po.history.push(e); commit(o); return po;
  }
  function shipPO(id, data, o = {}) {
    const po = Store.byId('pos', id);
    po.stage = 'SHIPPED'; po.shipment = data;
    po.history.push(ev('SHIPPED', { ...o, note: [data.courier, data.ref].filter(Boolean).join(' — ') }));
    commit(o); return po;
  }
  function receivePO(id, data, o = {}) {
    const po = Store.byId('pos', id);
    po.stage = 'RECEIVED'; po.received = true; po.receipt = data;
    po.history.push(ev('RECEIVED', { ...o, by: data.receiver || o.by, note: data.note }));
    autoClose(po, o); commit(o); return po;
  }
  function closePO(id, o = {}) {
    const po = Store.byId('pos', id);
    po.stage = 'CLOSED'; po.status = 'Closed'; po.history.push(ev('CLOSED', o));
    const pr = Store.byId('prs', po.prId);
    if (pr && pr.status !== 'Closed') { pr.status = 'Closed'; pr.history.push(ev('CLOSED', o)); }
    commit(o); return po;
  }
  function autoClose(po, o = {}) {
    if (po.received && po.invoiceId && po.status !== 'Closed') {
      closePO(po.id, { ...o, noSave: true, note: 'Otomatis: barang diterima & tagihan telah dijurnal' });
    }
  }

  function postInvoice(data, o = {}) {
    const at = o.at || nowISO();
    const po = Store.byId('pos', data.poId);
    const dpp = round(data.dpp), tax = round(data.tax), pph = round(data.pph);
    const total = dpp + tax;
    const payable = total - pph;
    const inv = {
      id: uid(), no: Store.nextNo('INV', at), vendorInvoiceNo: data.vendorInvoiceNo, taxInvoiceNo: data.taxInvoiceNo || '',
      date: data.date, dueDate: data.dueDate, poId: po.id, vendorId: po.vendorId,
      dpp, tax, pph, pphRate: Number(data.pphRate) || 0, total, payable, debitAccount: data.debitAccount,
      notes: data.notes || '', status: 'Posted', journalIds: [], createdAt: at,
    };
    const vendor = Store.byId('vendors', po.vendorId);
    const lines = [
      { account: data.debitAccount, debit: dpp, credit: 0 },
    ];
    if (tax) lines.push({ account: '1-1500', debit: tax, credit: 0 });
    lines.push({ account: '2-1100', debit: 0, credit: payable });
    if (pph) lines.push({ account: '2-1300', debit: 0, credit: pph });
    const j = {
      id: uid(), no: Store.nextNo('JV', at), date: data.date, type: 'Pembelian',
      ref: `${inv.no} / ${po.no}`, description: `Tagihan ${vendor ? vendor.name : ''} No. ${data.vendorInvoiceNo} atas ${po.no}`,
      lines, invoiceId: inv.id, createdAt: at,
    };
    inv.journalIds.push(j.id);
    db().invoices.unshift(inv); db().journals.unshift(j);
    po.invoiceId = inv.id;
    po.history.push(ev('INVOICED', { ...o, at, note: `${inv.no} — ${j.no}` }));
    autoClose(po, { ...o, at });
    commit(o); return inv;
  }
  function payInvoice(id, data, o = {}) {
    const at = o.at || nowISO();
    const inv = Store.byId('invoices', id);
    const po = Store.byId('pos', inv.poId);
    const vendor = Store.byId('vendors', inv.vendorId);
    const j = {
      id: uid(), no: Store.nextNo('JV', at), date: data.date, type: 'Pembayaran',
      ref: `${inv.no} / ${po ? po.no : ''}`, description: `Pembayaran ${vendor ? vendor.name : ''} No. ${inv.vendorInvoiceNo}${data.ref ? ' — ' + data.ref : ''}`,
      lines: [{ account: '2-1100', debit: inv.payable, credit: 0 }, { account: '1-1100', debit: 0, credit: inv.payable }],
      invoiceId: inv.id, createdAt: at,
    };
    db().journals.unshift(j);
    inv.journalIds.push(j.id); inv.status = 'Paid'; inv.paidDate = data.date;
    if (po) po.history.push(ev('PAID', { ...o, at, note: j.no }));
    commit(o); return inv;
  }

  function saveVendor(data) {
    if (data.id) { Object.assign(Store.byId('vendors', data.id), data); }
    else { data.id = uid(); data.code = data.code || Store.nextNo('VND', nowISO()).replace(/\/\d{4}\//, '-'); db().vendors.push(data); }
    Store.save(); return data;
  }
  function deleteVendor(id) {
    const d = db();
    if (d.pos.some(p => p.vendorId === id)) return false;
    d.vendors = d.vendors.filter(v => v.id !== id); Store.save(); return true;
  }

  return {
    createPR, updatePR, approvePR, rejectPR, closePR, reopenPR,
    createPO, updatePO, approvePO, rejectPO, sendPO, vendorAccept, vendorReject, shipPO, receivePO, closePO,
    postInvoice, payInvoice, saveVendor, deleteVendor,
  };
})();

/* ---------- Demo seed ---------- */
const Seed = {
  run() {
    const db = Store.db;
    const t = (daysAgo, h = 9) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, 0, 0, 0); return d.toISOString(); };
    const q = { noSave: true };
    const vendorData = [
      { name: 'PT Sinar Jaya Abadi', category: 'ATK & Perlengkapan', contact: 'Andi Wijaya', email: 'sales@sinarjaya.co.id', phone: '021-5551234', address: 'Jl. Gajah Mada 21, Jakarta Barat', npwp: '02.111.222.3-031.000', terms: 30, bank: 'BCA', account: '1234567890', rating: 'A' },
      { name: 'CV Teknik Mandiri', category: 'Sparepart & Teknik', contact: 'Sri Lestari', email: 'order@teknikmandiri.id', phone: '022-7203344', address: 'Jl. Soekarno-Hatta 88, Bandung', npwp: '03.222.333.4-421.000', terms: 14, bank: 'Mandiri', account: '1310009988776', rating: 'A' },
      { name: 'PT Data Prima Solusi', category: 'IT & Elektronik', contact: 'Kevin Hartono', email: 'b2b@dataprima.com', phone: '021-2988776', address: 'Jl. HR Rasuna Said Kav. 3, Jakarta Selatan', npwp: '01.333.444.5-061.000', terms: 30, bank: 'BNI', account: '0987654321', rating: 'B' },
      { name: 'PT Bersih Cemerlang', category: 'Jasa Kebersihan', contact: 'Dewi Anggraini', email: 'cs@bersihcemerlang.co.id', phone: '021-8877665', address: 'Jl. Kalimalang 12, Bekasi', npwp: '04.444.555.6-407.000', terms: 30, bank: 'BRI', account: '0345012345678', rating: 'B' },
      { name: 'PT Logistik Nusantara', category: 'Ekspedisi', contact: 'Hendra Saputra', email: 'ops@logistiknusantara.id', phone: '031-5432109', address: 'Jl. Tanjung Perak 7, Surabaya', npwp: '05.555.666.7-614.000', terms: 45, bank: 'BCA', account: '5550001112', rating: 'A' },
    ];
    const V = vendorData.map((v, i) => { const x = { ...v, id: uid(), code: `VND-${String(i + 1).padStart(4, '0')}`, active: true }; db.vendors.push(x); return x; });
    db.counters[`VND-${new Date().getFullYear()}`] = V.length;

    const ship = db.settings.shipTo;

    // 1) Full cycle — closed
    let pr = Actions.createPR({ requester: 'Rina Marlina', department: 'General Affairs', neededDate: t(20).slice(0, 10), purpose: 'Kebutuhan ATK kuartal IV', items: [
      { name: 'Kertas A4 80gsm', qty: 50, unit: 'rim', estPrice: 55000 },
      { name: 'Tinta Printer Epson 003', qty: 20, unit: 'pcs', estPrice: 85000 },
      { name: 'Map Plastik', qty: 100, unit: 'pcs', estPrice: 4000 },
    ] }, { ...q, at: t(40) });
    Actions.approvePR(pr.id, { ...q, at: t(39), note: 'OK, sesuai budget' });
    let po = Actions.createPO({ prId: pr.id, vendorId: V[0].id, items: pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.estPrice - 2000 })), taxRate: 11, discount: 50000, deliveryDate: t(28).slice(0, 10), paymentTerms: 30, shipTo: ship }, { ...q, at: t(38) });
    Actions.approvePO(po.id, { ...q, at: t(37) });
    Actions.sendPO(po.id, { ...q, at: t(37, 14) });
    Actions.vendorAccept(po.id, { ...q, at: t(36), by: 'Andi Wijaya (PT Sinar Jaya Abadi)', note: 'Siap kirim minggu depan' });
    Actions.shipPO(po.id, { courier: 'Armada Vendor', ref: 'SJ-88123', date: t(31).slice(0, 10) }, { ...q, at: t(31) });
    Actions.receivePO(po.id, { date: t(30).slice(0, 10), receiver: 'Agus (Gudang)', note: 'Lengkap, kondisi baik' }, { ...q, at: t(30) });
    let tot = poTotals(po);
    let inv = Actions.postInvoice({ poId: po.id, vendorInvoiceNo: 'SJA/INV/2026/0912', taxInvoiceNo: '010.000-26.12345678', date: t(29).slice(0, 10), dueDate: addDays(t(29), 30), dpp: tot.dpp, tax: tot.tax, pph: 0, debitAccount: '5-1200' }, { ...q, at: t(29) });
    Actions.payInvoice(inv.id, { date: t(5).slice(0, 10), ref: 'Transfer BCA' }, { ...q, at: t(5) });

    // 2) Shipped, invoice not yet
    pr = Actions.createPR({ requester: 'Fajar Nugroho', department: 'Maintenance', neededDate: t(-3).slice(0, 10), purpose: 'Penggantian bearing & v-belt mesin produksi line 2', priority: 'Tinggi', items: [
      { name: 'Bearing SKF 6205', qty: 12, unit: 'pcs', estPrice: 120000 },
      { name: 'V-Belt B-52', qty: 6, unit: 'pcs', estPrice: 95000 },
    ] }, { ...q, at: t(12) });
    Actions.approvePR(pr.id, { ...q, at: t(11) });
    po = Actions.createPO({ prId: pr.id, vendorId: V[1].id, items: pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.estPrice })), taxRate: 11, discount: 0, deliveryDate: t(-2).slice(0, 10), paymentTerms: 14, shipTo: ship }, { ...q, at: t(10) });
    Actions.approvePO(po.id, { ...q, at: t(9) });
    Actions.sendPO(po.id, { ...q, at: t(9, 13) });
    Actions.vendorAccept(po.id, { ...q, at: t(8), by: 'Sri Lestari (CV Teknik Mandiri)' });
    Actions.shipPO(po.id, { courier: 'JNE Trucking', ref: 'JTR-55128890', date: t(2).slice(0, 10) }, { ...q, at: t(2) });

    // 3) Sent to vendor, waiting
    pr = Actions.createPR({ requester: 'Yoga Pratama', department: 'IT', neededDate: t(-14).slice(0, 10), purpose: 'Laptop untuk karyawan baru divisi Finance', items: [
      { name: 'Laptop Lenovo ThinkPad E14 i5/16GB/512GB', qty: 3, unit: 'unit', estPrice: 13500000 },
      { name: 'Mouse Wireless Logitech M331', qty: 3, unit: 'pcs', estPrice: 250000 },
    ] }, { ...q, at: t(6) });
    Actions.approvePR(pr.id, { ...q, at: t(5) });
    po = Actions.createPO({ prId: pr.id, vendorId: V[2].id, items: pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.estPrice })), taxRate: 11, discount: 500000, deliveryDate: t(-10).slice(0, 10), paymentTerms: 30, shipTo: db.settings.address }, { ...q, at: t(4) });
    Actions.approvePO(po.id, { ...q, at: t(3) });
    Actions.sendPO(po.id, { ...q, at: t(3, 15) });

    // 4) PO waiting internal approval
    pr = Actions.createPR({ requester: 'Lia Kurniawati', department: 'General Affairs', neededDate: t(-20).slice(0, 10), purpose: 'Kontrak jasa kebersihan bulan depan', items: [
      { name: 'Jasa Cleaning Service (bulanan)', qty: 1, unit: 'paket', estPrice: 18000000 },
    ] }, { ...q, at: t(3) });
    Actions.approvePR(pr.id, { ...q, at: t(2) });
    Actions.createPO({ prId: pr.id, vendorId: V[3].id, items: pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.estPrice })), taxRate: 11, discount: 0, deliveryDate: t(-25).slice(0, 10), paymentTerms: 30, shipTo: db.settings.address, notes: 'Termasuk bahan pembersih.' }, { ...q, at: t(1) });

    // 5) PR approved, no PO yet
    pr = Actions.createPR({ requester: 'Dimas Aryo', department: 'Warehouse', neededDate: t(-12).slice(0, 10), purpose: 'Pallet tambahan untuk area penyimpanan baru', items: [
      { name: 'Pallet Plastik 120x100', qty: 40, unit: 'pcs', estPrice: 450000 },
    ] }, { ...q, at: t(2) });
    Actions.approvePR(pr.id, { ...q, at: t(1) });

    // 6) PR waiting approval
    Actions.createPR({ requester: 'Nadia Putri', department: 'Marketing', neededDate: t(-7).slice(0, 10), purpose: 'Material promosi pameran', items: [
      { name: 'X-Banner 60x160', qty: 6, unit: 'pcs', estPrice: 175000 },
      { name: 'Brosur A5 Full Color', qty: 2000, unit: 'lembar', estPrice: 900 },
    ] }, { ...q, at: t(0, 8) });
  },
};
