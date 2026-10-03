/* Procura PMS — UI layer */
(() => {
  const db = Store.load();
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = n => 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
  const num = n => new Intl.NumberFormat('id-ID').format(n || 0);
  const fdate = d => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const fdt = d => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const initials = s => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const vendorOf = id => Store.byId('vendors', id) || { name: '(vendor dihapus)' };
  const badge = (label, tone) => `<span class="badge ${tone}">${esc(label)}</span>`;
  const statusBadge = s => badge(s, s === 'Open' ? 'open' : 'closed');
  const prStageBadge = pr => { const s = PR_STAGES[pr.stage]; return badge(s.label, s.tone); };
  const poStageBadge = po => { const s = PO_STAGES[po.stage]; return badge(s.label, s.tone); };
  const accName = code => `${code} ${ACCOUNTS[code] || ''}`;

  /* ---------- Theme ---------- */
  function getTheme() { try { return localStorage.getItem('procura.theme') || 'light'; } catch (e) { return 'light'; } }
  function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('procura.theme', t); } catch (e) { /* ignore */ } }
  setTheme(getTheme());

  /* ---------- Toast & modal ---------- */
  function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = icon(type === 'error' ? 'alert' : 'check', 'sm') + `<span>${esc(msg)}</span>`;
    const root = $('#toast-root');
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => el.remove(), 3200);
  }

  function modal({ title, body, confirm = 'Simpan', confirmClass = 'primary', cancel = 'Batal', wide = false, onConfirm, onOpen }) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-backdrop"><form class="modal ${wide ? 'wide' : ''}" novalidate>
      <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="btn ghost icon-only sm" data-close>${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${cancel ? `<button type="button" class="btn" data-close>${esc(cancel)}</button>` : ''}${confirm ? `<button type="submit" class="btn ${confirmClass}">${esc(confirm)}</button>` : ''}</div>
    </form></div>`;
    const form = $('form', root);
    const close = () => { root.innerHTML = ''; };
    $$('[data-close]', root).forEach(b => b.onclick = close);
    $('.modal-backdrop', root).addEventListener('mousedown', e => { if (e.target.classList.contains('modal-backdrop')) close(); });
    form.onsubmit = e => {
      e.preventDefault();
      if (!validate(form)) return;
      const res = onConfirm ? onConfirm(formData(form), form) : true;
      if (res !== false) close();
    };
    if (onOpen) onOpen(form);
    const first = $('input:not([readonly]), textarea, select', form);
    if (first) first.focus();
  }

  function confirmNote({ title, message, confirm, confirmClass = 'primary', noteLabel = 'Catatan', byLabel, byValue, noteRequired = false, onConfirm }) {
    modal({
      title, confirm, confirmClass,
      body: `${message ? `<p class="muted" style="margin-top:0">${message}</p>` : ''}
        <div class="form-grid">
          ${byLabel ? `<div class="field full"><label>${esc(byLabel)}</label><input name="by" required value="${esc(byValue || '')}"></div>` : ''}
          <div class="field full"><label>${esc(noteLabel)}${noteRequired ? '' : ' (opsional)'}</label><textarea name="note" ${noteRequired ? 'required' : ''}></textarea></div>
        </div>`,
      onConfirm,
    });
  }

  function validate(form) {
    let ok = true;
    $$('[required]', form).forEach(el => {
      const bad = !String(el.value || '').trim();
      el.style.borderColor = bad ? 'var(--danger)' : '';
      if (bad) ok = false;
    });
    if (!ok) toast('Lengkapi field yang wajib diisi', 'error');
    return ok;
  }
  function formData(form) {
    const o = {};
    $$('input[name], select[name], textarea[name]', form).forEach(el => { if (!el.closest('[data-items]')) o[el.name] = el.value.trim(); });
    return o;
  }

  function csv(filename, rows) {
    const text = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- Shell ---------- */
  const NAV = [
    { group: 'Utama' },
    { href: '#/', icon: 'dashboard', label: 'Dashboard', match: /^\/$/ },
    { href: '#/tracking', icon: 'route', label: 'Tracking PR', match: /^\/tracking/ },
    { group: 'Pengadaan' },
    { href: '#/pr', icon: 'pr', label: 'Purchase Request', match: /^\/pr/, count: () => db.prs.filter(p => p.stage === 'SUBMITTED' && p.status === 'Open').length },
    { href: '#/po', icon: 'po', label: 'Purchase Order', match: /^\/po/, count: () => db.pos.filter(p => p.stage === 'PENDING').length },
    { href: '#/vendors', icon: 'vendor', label: 'Database Vendor', match: /^\/vendors/ },
    { group: 'Keuangan' },
    { href: '#/invoices', icon: 'invoice', label: 'Tagihan Vendor', match: /^\/invoices/ },
    { href: '#/journals', icon: 'journal', label: 'Jurnal', match: /^\/journals/ },
    { group: 'Sistem' },
    { href: '#/settings', icon: 'settings', label: 'Pengaturan', match: /^\/settings/ },
  ];

  function shell(path, crumbs, html) {
    const nav = NAV.map(n => {
      if (n.group) return `<div class="nav-label">${n.group}</div>`;
      const c = n.count ? n.count() : 0;
      return `<a href="${n.href}" class="${n.match.test(path) ? 'active' : ''}">${icon(n.icon)}<span>${n.label}</span>${c ? `<span class="count">${c}</span>` : ''}</a>`;
    }).join('');
    const theme = getTheme();
    $('#app').innerHTML = `<div class="layout">
      <aside class="sidebar">
        <div class="brand"><img src="favicon.svg" alt=""><div><b>PROCURA</b><small>Procurement Management</small></div></div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-foot"><div class="avatar">${esc(initials(db.settings.userName))}</div><div><b style="color:var(--text)">${esc(db.settings.userName)}</b><br>${esc(db.settings.company)}</div></div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="btn ghost icon-only menu-btn" id="menu-btn" aria-label="Menu">${icon('menu')}</button>
          <div class="crumbs">${crumbs}</div>
          <div class="spacer"></div>
          <a class="btn sm no-print" href="#/pr/new">${icon('plus', 'sm')}PR Baru</a>
          <button class="btn ghost icon-only" id="theme-btn" title="Ganti tema">${icon(theme === 'dark' ? 'sun' : 'moon')}</button>
        </header>
        <main class="content">${html}</main>
      </div>
    </div>`;
    const layout = $('.layout');
    $('#menu-btn').onclick = () => layout.classList.toggle('nav-open');
    layout.addEventListener('click', e => { if (e.target === layout) layout.classList.remove('nav-open'); });
    $('#theme-btn').onclick = () => { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); router(); };
  }
  const crumb = (...parts) => parts.map((p, i) => i === parts.length - 1 ? `<b>${esc(p)}</b>` : `<span>${esc(p)}</span>${icon('chevron', 'sm')}`).join('');

  function pageHead(title, sub, actions = '') {
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
  }
  const emptyState = (msg, ic = 'inbox') => `<div class="empty">${icon(ic)}<div>${esc(msg)}</div></div>`;

  function progressStrip(pr) {
    const t = trackPR(pr);
    return `<div class="progress" title="${esc(t.position.label)}">${t.steps.map(s => `<span class="${s.state === 'done' ? 'on' : s.state === 'rejected' ? 'rej' : s.state === 'current' ? 'cur' : ''}"></span>`).join('')}</div>`;
  }

  /* ---------- Dashboard ---------- */
  function viewDashboard(path) {
    const prs = db.prs, pos = db.pos;
    const openPO = pos.filter(p => p.status === 'Open');
    const unpaid = db.invoices.filter(i => i.status !== 'Paid');
    const kpis = [
      { l: 'PR Open', v: prs.filter(p => p.status === 'Open').length, s: `${prs.filter(p => p.status === 'Closed').length} PR closed`, i: 'pr', h: '#/pr?status=Open' },
      { l: 'PO Open', v: openPO.length, s: `${pos.filter(p => p.status === 'Closed').length} PO closed`, i: 'po', h: '#/po?status=Open' },
      { l: 'Nilai PO Open', v: rp(openPO.reduce((s, p) => s + poTotals(p).total, 0)), s: 'Termasuk PPN', i: 'wallet', h: '#/po?status=Open' },
      { l: 'Hutang Belum Dibayar', v: rp(unpaid.reduce((s, i) => s + i.payable, 0)), s: `${unpaid.length} tagihan`, i: 'invoice', h: '#/invoices' },
    ];
    const todos = [
      { l: 'PR menunggu approval', n: prs.filter(p => p.status === 'Open' && p.stage === 'SUBMITTED').length, i: 'pr', h: '#/pr?stage=SUBMITTED' },
      { l: 'PR disetujui, belum dibuat PO', n: prs.filter(p => p.status === 'Open' && p.stage === 'APPROVED').length, i: 'plus', h: '#/pr?stage=APPROVED' },
      { l: 'PO menunggu approval atasan', n: pos.filter(p => p.stage === 'PENDING').length, i: 'po', h: '#/po?stage=PENDING' },
      { l: 'PO menunggu persetujuan vendor', n: pos.filter(p => p.stage === 'SENT').length, i: 'send', h: '#/po?stage=SENT' },
      { l: 'PO ditolak, perlu revisi', n: pos.filter(p => p.stage === 'REJECTED' || p.stage === 'VENDOR_REJECTED').length, i: 'revise', h: '#/po?stage=REJECTED' },
      { l: 'Barang dalam pengiriman', n: pos.filter(p => p.stage === 'SHIPPED').length, i: 'truck', h: '#/po?stage=SHIPPED' },
      { l: 'PO belum ditagihkan vendor', n: pos.filter(p => p.status === 'Open' && !p.invoiceId && ['ACCEPTED', 'SHIPPED', 'RECEIVED'].includes(p.stage)).length, i: 'invoice', h: '#/invoices/new' },
    ];
    const stageCounts = PO_FLOW.map(k => ({ k, n: pos.filter(p => p.stage === k).length }));
    const max = Math.max(1, ...stageCounts.map(s => s.n));
    const recent = prs.slice(0, 6);

    shell(path, crumb('Dashboard'), `
      ${pageHead('Dashboard', `Ringkasan pengadaan ${esc(db.settings.company)}`, `<a class="btn" href="#/po/new">${icon('po', 'sm')}Buat PO</a><a class="btn primary" href="#/pr/new">${icon('plus', 'sm')}Buat PR</a>`)}
      <div class="grid kpi">${kpis.map(k => `<a class="card kpi-card" href="${k.h}"><div class="label">${icon(k.i, 'sm')}${k.l}</div><div class="value">${k.v}</div><div class="sub">${k.s}</div></a>`).join('')}</div>
      <div class="grid two mt">
        <div class="card"><div class="card-head"><h3>Perlu Tindakan</h3></div>
          <ul class="todo-list">${todos.map(t => `<li><a href="${t.h}"><span class="ic">${icon(t.i, 'sm')}</span><span>${t.l}</span><span class="n">${t.n}</span></a></li>`).join('')}</ul>
        </div>
        <div class="card"><div class="card-head"><h3>Posisi PO</h3><a class="link" href="#/po">Lihat semua</a></div>
          <div class="card-body bars">${stageCounts.map(s => `<div class="bar-row"><span>${PO_STAGES[s.k].label}</span><div class="bar-track"><div class="bar-fill" style="width:${s.n / max * 100}%"></div></div><span class="n">${s.n}</span></div>`).join('')}</div>
        </div>
      </div>
      <div class="card mt"><div class="card-head"><h3>PR Terbaru & Posisinya</h3><a class="link" href="#/tracking">Tracking lengkap</a></div>
        <div class="table-wrap"><table><thead><tr><th>No PR</th><th>Pemohon</th><th>Progress</th><th>Posisi Saat Ini</th><th>Status</th></tr></thead><tbody>
        ${recent.map(pr => { const t = trackPR(pr); return `<tr class="clickable" data-href="#/tracking/${pr.id}"><td><span class="strong">${esc(pr.no)}</span><span class="sub">${fdate(pr.date)}</span></td><td>${esc(pr.requester)}<span class="sub">${esc(pr.department)}</span></td><td>${progressStrip(pr)}</td><td>${badge(t.position.label, t.position.tone)}</td><td>${statusBadge(pr.status)}</td></tr>`; }).join('') || `<tr><td colspan="5">${emptyState('Belum ada PR')}</td></tr>`}
        </tbody></table></div>
      </div>`);
  }

  /* ---------- Items editor (PR & PO) ---------- */
  function itemsEditor(items, priceKey, priceLabel) {
    const row = (it = {}) => `<tr>
      <td><input data-f="name" value="${esc(it.name || '')}" placeholder="Nama barang / jasa" required></td>
      <td style="width:90px"><input data-f="qty" type="number" min="0" step="any" value="${esc(it.qty ?? 1)}" class="right" required></td>
      <td style="width:100px"><input data-f="unit" value="${esc(it.unit || 'pcs')}"></td>
      <td style="width:150px"><input data-f="${priceKey}" type="number" min="0" step="any" value="${esc(it[priceKey] ?? 0)}" class="right"></td>
      <td class="num" style="width:140px" data-sub>-</td>
      <td style="width:44px"><button type="button" class="btn ghost icon-only sm danger" data-del title="Hapus">${icon('trash', 'sm')}</button></td>
    </tr>`;
    return {
      html: `<div class="table-wrap" data-items><table class="items-table"><thead><tr><th>Barang / Jasa</th><th class="num">Qty</th><th>Satuan</th><th class="num">${priceLabel}</th><th class="num">Jumlah</th><th></th></tr></thead>
        <tbody>${(items.length ? items : [{}]).map(row).join('')}</tbody></table></div>
        <div style="padding:10px 0"><button type="button" class="btn sm" data-add>${icon('plus', 'sm')}Tambah Baris</button></div>`,
      bind(root, onChange) {
        const tbody = $('[data-items] tbody', root);
        const recalc = () => {
          $$('tr', tbody).forEach(tr => {
            const q = Number($('[data-f=qty]', tr).value) || 0, p = Number($(`[data-f=${priceKey}]`, tr).value) || 0;
            $('[data-sub]', tr).textContent = rp(q * p);
          });
          onChange && onChange();
        };
        $('[data-add]', root).onclick = () => { tbody.insertAdjacentHTML('beforeend', row()); recalc(); };
        tbody.addEventListener('click', e => {
          const b = e.target.closest('[data-del]');
          if (b) { if ($$('tr', tbody).length > 1) b.closest('tr').remove(); recalc(); }
        });
        tbody.addEventListener('input', recalc);
        recalc();
      },
      read(root) {
        return $$('[data-items] tbody tr', root).map(tr => ({
          name: $('[data-f=name]', tr).value.trim(),
          qty: Number($('[data-f=qty]', tr).value) || 0,
          unit: $('[data-f=unit]', tr).value.trim() || 'pcs',
          [priceKey]: Number($(`[data-f=${priceKey}]`, tr).value) || 0,
        })).filter(i => i.name);
      },
    };
  }

  /* ---------- PR ---------- */
  function viewPRList(path, q) {
    const status = q.get('status') || 'All';
    const stage = q.get('stage') || '';
    const term = (q.get('q') || '').toLowerCase();
    let list = db.prs;
    if (status !== 'All') list = list.filter(p => p.status === status);
    if (stage) list = list.filter(p => p.stage === stage && p.status === 'Open');
    if (term) list = list.filter(p => [p.no, p.requester, p.department, p.purpose, ...p.items.map(i => i.name)].join(' ').toLowerCase().includes(term));

    shell(path, crumb('Pengadaan', 'Purchase Request'), `
      ${pageHead('List Purchase Request', `${db.prs.length} PR — ${db.prs.filter(p => p.status === 'Open').length} open, ${db.prs.filter(p => p.status === 'Closed').length} closed`,
        `<button class="btn" id="export">${icon('download', 'sm')}Export CSV</button><a class="btn primary" href="#/pr/new">${icon('plus', 'sm')}Buat PR</a>`)}
      <div class="card">
        ${listToolbar('pr', status, term, stage ? PR_STAGES[stage].label : '')}
        <div class="table-wrap"><table><thead><tr><th>No PR</th><th>Tanggal</th><th>Pemohon</th><th>Keperluan</th><th class="num">Estimasi</th><th>Tahap PR</th><th>Posisi</th><th>Status</th></tr></thead><tbody>
        ${list.map(pr => { const t = trackPR(pr); return `<tr class="clickable" data-href="#/pr/${pr.id}">
          <td><span class="strong">${esc(pr.no)}</span>${pr.priority === 'Tinggi' ? '<span class="sub" style="color:var(--danger)">Prioritas tinggi</span>' : ''}</td>
          <td>${fdate(pr.date)}<span class="sub">Butuh: ${fdate(pr.neededDate)}</span></td>
          <td>${esc(pr.requester)}<span class="sub">${esc(pr.department)}</span></td>
          <td>${esc(pr.purpose)}<span class="sub">${pr.items.length} item</span></td>
          <td class="num">${rp(prTotal(pr))}</td>
          <td>${prStageBadge(pr)}</td>
          <td>${progressStrip(pr)}<span class="sub">${esc(t.position.label)}</span></td>
          <td>${statusBadge(pr.status)}</td></tr>`; }).join('') || `<tr><td colspan="8">${emptyState('Tidak ada PR yang cocok')}</td></tr>`}
        </tbody></table></div>
      </div>`);
    bindListToolbar('pr', q);
    $('#export').onclick = () => csv('purchase-request.csv', [['No PR', 'Tanggal', 'Pemohon', 'Departemen', 'Keperluan', 'Tgl Dibutuhkan', 'Estimasi', 'Tahap', 'Posisi', 'Status'],
      ...list.map(p => [p.no, p.date, p.requester, p.department, p.purpose, p.neededDate, prTotal(p), PR_STAGES[p.stage].label, trackPR(p).position.label, p.status])]);
  }

  function listToolbar(kind, status, term, stageLabel) {
    return `<div class="toolbar">
      <div class="tabs" id="tabs">${['All', 'Open', 'Closed'].map(s => `<button data-s="${s}" class="${status === s ? 'active' : ''}">${s === 'All' ? 'Semua' : s}</button>`).join('')}</div>
      <div class="search">${icon('search', 'sm')}<input id="q" placeholder="Cari nomor, nama, vendor, barang..." value="${esc(term)}"></div>
      ${stageLabel ? `<span class="badge info">${esc(stageLabel)}</span><a class="link" href="#/${kind}">Hapus filter</a>` : ''}
    </div>`;
  }
  function bindListToolbar(kind, q) {
    const go = (k, v) => { const p = new URLSearchParams(q); if (v && v !== 'All') p.set(k, v); else p.delete(k); location.hash = `#/${kind}${p.toString() ? '?' + p : ''}`; };
    $$('#tabs button').forEach(b => b.onclick = () => go('status', b.dataset.s));
    let timer;
    $('#q').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { go('q', e.target.value); setTimeout(() => { const i = $('#q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 300); };
  }

  function viewPRForm(path, id) {
    const pr = id ? Store.byId('prs', id) : null;
    if (id && !pr) return notFound(path);
    if (pr && !['SUBMITTED', 'REJECTED'].includes(pr.stage)) { toast('PR yang sudah diproses tidak dapat diubah', 'error'); location.hash = `#/pr/${id}`; return; }
    const d = pr || { requester: db.settings.userName, department: '', date: todayISO(), neededDate: addDays(todayISO(), 7), purpose: '', priority: 'Normal', items: [] };
    const ed = itemsEditor(d.items, 'estPrice', 'Est. Harga Satuan');
    shell(path, crumb('Purchase Request', pr ? `Edit ${pr.no}` : 'PR Baru'), `
      ${pageHead(pr ? `Edit ${pr.no}` : 'Buat Purchase Request', 'Ajukan kebutuhan barang/jasa untuk disetujui atasan.', `<a class="btn" href="${pr ? '#/pr/' + pr.id : '#/pr'}">${icon('back', 'sm')}Kembali</a>`)}
      <form class="card" id="f" novalidate>
        <div class="card-head"><h3>Informasi Permintaan</h3></div>
        <div class="card-body form-grid">
          <div class="field"><label>Pemohon *</label><input name="requester" required value="${esc(d.requester)}"></div>
          <div class="field"><label>Departemen *</label><input name="department" required value="${esc(d.department)}" list="dept-list"><datalist id="dept-list">${[...new Set(db.prs.map(p => p.department))].map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
          <div class="field"><label>Tanggal PR</label><input type="date" name="date" value="${esc(d.date)}"></div>
          <div class="field"><label>Tanggal Dibutuhkan *</label><input type="date" name="neededDate" required value="${esc(d.neededDate)}"></div>
          <div class="field"><label>Prioritas</label><select name="priority">${['Rendah', 'Normal', 'Tinggi'].map(p => `<option ${d.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="field full"><label>Keperluan / Justifikasi *</label><textarea name="purpose" required>${esc(d.purpose)}</textarea></div>
        </div>
        <div class="card-head" style="border-top:1px solid var(--border)"><h3>Daftar Barang / Jasa</h3><span class="muted">Total estimasi: <b id="est-total">-</b></span></div>
        <div class="card-body">${ed.html}</div>
        <div class="form-foot"><a class="btn" href="${pr ? '#/pr/' + pr.id : '#/pr'}">Batal</a><button class="btn primary" type="submit">${icon('send', 'sm')}${pr ? 'Simpan & Ajukan' : 'Ajukan PR'}</button></div>
      </form>`);
    const f = $('#f');
    ed.bind(f, () => { $('#est-total').textContent = rp(ed.read(f).reduce((s, i) => s + i.qty * i.estPrice, 0)); });
    f.onsubmit = e => {
      e.preventDefault();
      if (!validate(f)) return;
      const items = ed.read(f);
      if (!items.length || items.some(i => i.qty <= 0)) return toast('Minimal 1 item dengan qty > 0', 'error');
      const data = { ...formData(f), items };
      const saved = pr ? Actions.updatePR(pr.id, data) : Actions.createPR(data);
      toast(pr ? 'PR diperbarui dan diajukan ulang' : `${saved.no} berhasil diajukan`);
      location.hash = `#/pr/${saved.id}`;
    };
  }

  function viewPRDetail(path, id) {
    const pr = Store.byId('prs', id);
    if (!pr) return notFound(path);
    const po = pr.poId ? Store.byId('pos', pr.poId) : null;
    const open = pr.status === 'Open';
    const acts = [];
    if (open && pr.stage === 'SUBMITTED') acts.push(`<button class="btn danger" data-act="reject">${icon('x', 'sm')}Tolak</button><button class="btn success" data-act="approve">${icon('check', 'sm')}Setujui PR</button>`);
    if (open && ['SUBMITTED', 'REJECTED'].includes(pr.stage)) acts.push(`<a class="btn" href="#/pr/${pr.id}/edit">${icon('edit', 'sm')}${pr.stage === 'REJECTED' ? 'Revisi' : 'Edit'}</a>`);
    if (open && pr.stage === 'APPROVED') acts.push(`<a class="btn primary" href="#/po/new?pr=${pr.id}">${icon('po', 'sm')}Buat PO</a>`);
    if (po) acts.push(`<a class="btn" href="#/po/${po.id}">${icon('eye', 'sm')}Lihat ${esc(po.no)}</a>`);
    if (open && (!po || po.status === 'Closed')) acts.push(`<button class="btn" data-act="close">${icon('lock', 'sm')}Tutup PR</button>`);
    if (!open && (!po || po.status !== 'Closed')) acts.push(`<button class="btn" data-act="reopen">${icon('unlock', 'sm')}Buka Kembali</button>`);

    shell(path, crumb('Purchase Request', pr.no), `
      ${pageHead(pr.no, `${prStageBadge(pr)} ${statusBadge(pr.status)}`, `<a class="btn" href="#/pr">${icon('back', 'sm')}List PR</a>${acts.join('')}`)}
      <div class="grid two">
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Detail Permintaan</h3></div>
            <div class="card-body dl">
              <div><span>Pemohon</span><b>${esc(pr.requester)}</b></div>
              <div><span>Departemen</span><b>${esc(pr.department)}</b></div>
              <div><span>Tanggal PR</span><b>${fdate(pr.date)}</b></div>
              <div><span>Dibutuhkan</span><b>${fdate(pr.neededDate)}</b></div>
              <div><span>Prioritas</span><b>${esc(pr.priority)}</b></div>
              <div><span>Estimasi Total</span><b>${rp(prTotal(pr))}</b></div>
              <div style="grid-column:1/-1"><span>Keperluan</span><b style="font-weight:400">${esc(pr.purpose) || '-'}</b></div>
            </div>
          </div>
          <div class="card"><div class="card-head"><h3>Item</h3></div>
            <div class="table-wrap"><table><thead><tr><th>#</th><th>Barang / Jasa</th><th class="num">Qty</th><th class="num">Est. Harga</th><th class="num">Jumlah</th></tr></thead><tbody>
            ${pr.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}</td><td class="num">${num(i.qty)} ${esc(i.unit)}</td><td class="num">${rp(i.estPrice)}</td><td class="num">${rp(i.qty * i.estPrice)}</td></tr>`).join('')}
            </tbody><tfoot><tr><td colspan="4" class="right">Total Estimasi</td><td class="num">${rp(prTotal(pr))}</td></tr></tfoot></table></div>
          </div>
          ${historyCard(pr.history.concat(po ? po.history.map(e => ({ ...e, po: po.no })) : []))}
        </div>
        ${trackingCard(pr)}
      </div>`);

    bindActs({
      approve: () => confirmNote({ title: `Setujui ${pr.no}`, confirm: 'Setujui', confirmClass: 'success', byLabel: 'Disetujui oleh', byValue: db.settings.approverName,
        onConfirm: d => { Actions.approvePR(pr.id, d); toast('PR disetujui'); router(); } }),
      reject: () => confirmNote({ title: `Tolak ${pr.no}`, confirm: 'Tolak', confirmClass: 'danger solid', byLabel: 'Ditolak oleh', byValue: db.settings.approverName, noteLabel: 'Alasan penolakan', noteRequired: true,
        onConfirm: d => { Actions.rejectPR(pr.id, d); toast('PR ditolak'); router(); } }),
      close: () => confirmNote({ title: `Tutup ${pr.no}`, message: 'PR akan berstatus Closed.', confirm: 'Tutup PR', noteLabel: 'Alasan', onConfirm: d => { Actions.closePR(pr.id, d); toast('PR ditutup'); router(); } }),
      reopen: () => { Actions.reopenPR(pr.id); toast('PR dibuka kembali'); router(); },
    });
  }

  function historyCard(events) {
    const list = events.slice().sort((a, b) => a.at.localeCompare(b.at)).reverse();
    return `<div class="card"><div class="card-head"><h3>Riwayat Aktivitas</h3></div>
      <div class="table-wrap"><table><tbody>${list.map(e => `<tr><td style="width:170px" class="muted">${fdt(e.at)}</td><td><b>${esc(EVENT_LABELS[e.key] || e.key)}</b>${e.po ? ` <span class="muted">(${esc(e.po)})</span>` : ''}<span class="sub">${esc(e.by)}${e.note ? ' — ' + esc(e.note) : ''}</span></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function trackingCard(pr) {
    const t = trackPR(pr);
    return `<div class="card" style="align-self:start"><div class="card-head"><h3>Posisi PR s/d Barang Datang</h3>${badge(`${t.doneCount}/${t.steps.length}`, 'neutral')}</div>
      <div class="card-body">
        <div class="alert ${t.position.tone === 'danger' ? 'danger' : t.position.tone === 'neutral' ? 'success' : 'info'}" style="margin-bottom:18px">${icon(t.position.tone === 'neutral' ? 'check' : 'clock', 'sm')}<span>${esc(t.position.label)}</span></div>
        <ol class="timeline">${t.steps.map(s => `<li class="${s.state}"><span class="dot">${s.state === 'done' ? icon('check', 'sm') : s.state === 'rejected' ? icon('x', 'sm') : ''}</span>
          <div><div class="t-title">${esc(s.label)}</div>
          ${s.event ? `<div class="t-meta">${fdt(s.event.at)} — ${esc(s.event.by)}${s.event.note ? `<br>${esc(s.event.note)}` : ''}</div>` : s.state === 'current' ? '<div class="t-meta">Sedang diproses</div>' : ''}
          ${s.key === 'PO_CREATED' && t.po ? `<div class="t-meta"><a class="link" href="#/po/${t.po.id}">${esc(t.po.no)}</a> — ${esc(vendorOf(t.po.vendorId).name)}</div>` : ''}
          </div></li>`).join('')}</ol>
      </div></div>`;
  }

  function bindActs(map) { $$('[data-act]').forEach(b => { const fn = map[b.dataset.act]; if (fn) b.onclick = fn; }); }

  /* ---------- PO ---------- */
  function viewPOList(path, q) {
    const status = q.get('status') || 'All';
    const stage = q.get('stage') || '';
    const term = (q.get('q') || '').toLowerCase();
    let list = db.pos;
    if (status !== 'All') list = list.filter(p => p.status === status);
    if (stage === 'REJECTED') list = list.filter(p => p.stage === 'REJECTED' || p.stage === 'VENDOR_REJECTED');
    else if (stage) list = list.filter(p => p.stage === stage);
    if (term) list = list.filter(p => { const pr = Store.byId('prs', p.prId); return [p.no, pr && pr.no, vendorOf(p.vendorId).name, ...p.items.map(i => i.name)].join(' ').toLowerCase().includes(term); });

    shell(path, crumb('Pengadaan', 'Purchase Order'), `
      ${pageHead('List Purchase Order', `${db.pos.length} PO — ${db.pos.filter(p => p.status === 'Open').length} open, ${db.pos.filter(p => p.status === 'Closed').length} closed`,
        `<button class="btn" id="export">${icon('download', 'sm')}Export CSV</button><a class="btn primary" href="#/po/new">${icon('plus', 'sm')}Buat PO</a>`)}
      <div class="card">
        ${listToolbar('po', status, term, stage ? (stage === 'REJECTED' ? 'Ditolak' : PO_STAGES[stage].label) : '')}
        <div class="table-wrap"><table><thead><tr><th>No PO</th><th>Tanggal</th><th>Ref PR</th><th>Vendor</th><th class="num">Total</th><th>Tahap / Posisi</th><th>Tagihan</th><th>Status</th></tr></thead><tbody>
        ${list.map(po => { const pr = Store.byId('prs', po.prId); const inv = po.invoiceId ? Store.byId('invoices', po.invoiceId) : null; return `<tr class="clickable" data-href="#/po/${po.id}">
          <td class="strong">${esc(po.no)}</td>
          <td>${fdate(po.date)}<span class="sub">Kirim: ${fdate(po.deliveryDate)}</span></td>
          <td>${pr ? esc(pr.no) : '-'}</td>
          <td>${esc(vendorOf(po.vendorId).name)}</td>
          <td class="num">${rp(poTotals(po).total)}</td>
          <td>${poStageBadge(po)}</td>
          <td>${inv ? badge(inv.status === 'Paid' ? 'Lunas' : 'Dijurnal', inv.status === 'Paid' ? 'success' : 'info') : '<span class="muted">-</span>'}</td>
          <td>${statusBadge(po.status)}</td></tr>`; }).join('') || `<tr><td colspan="8">${emptyState('Tidak ada PO yang cocok')}</td></tr>`}
        </tbody></table></div>
      </div>`);
    bindListToolbar('po', q);
    $('#export').onclick = () => csv('purchase-order.csv', [['No PO', 'Tanggal', 'No PR', 'Vendor', 'DPP', 'PPN', 'Total', 'Tahap', 'Status'],
      ...list.map(p => { const t = poTotals(p); const pr = Store.byId('prs', p.prId); return [p.no, p.date, pr ? pr.no : '', vendorOf(p.vendorId).name, t.dpp, t.tax, t.total, PO_STAGES[p.stage].label, p.status]; })]);
  }

  function viewPOForm(path, id, q) {
    const po = id ? Store.byId('pos', id) : null;
    if (id && !po) return notFound(path);
    if (po && !['PENDING', 'REJECTED', 'VENDOR_REJECTED', 'APPROVED'].includes(po.stage)) { toast('PO yang sudah dikirim/disepakati tidak dapat diubah', 'error'); location.hash = `#/po/${id}`; return; }
    const eligible = db.prs.filter(p => p.status === 'Open' && p.stage === 'APPROVED');
    const prId = po ? po.prId : (q.get('pr') || '');
    const pr = prId ? Store.byId('prs', prId) : null;
    const vendors = db.vendors.filter(v => v.active !== false || (po && v.id === po.vendorId));
    const d = po || {
      prId, vendorId: '', date: todayISO(), deliveryDate: pr ? pr.neededDate : addDays(todayISO(), 14), paymentTerms: 30, taxRate: 11, discount: 0,
      shipTo: db.settings.shipTo, notes: '', items: pr ? pr.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.estPrice })) : [],
    };
    const ed = itemsEditor(d.items, 'price', 'Harga Satuan');
    const back = po ? `#/po/${po.id}` : '#/po';

    if (!po && !eligible.length) {
      shell(path, crumb('Purchase Order', 'PO Baru'), `${pageHead('Buat Purchase Order', '', `<a class="btn" href="#/po">${icon('back', 'sm')}Kembali</a>`)}
        <div class="card">${emptyState('Belum ada PR berstatus Disetujui. PO dibuat dari PR yang sudah disetujui atasan.', 'pr')}<div class="right" style="padding:0 18px 18px"><a class="btn primary" href="#/pr">Lihat List PR</a></div></div>`);
      return;
    }

    shell(path, crumb('Purchase Order', po ? `Edit ${po.no}` : 'PO Baru'), `
      ${pageHead(po ? `${po.stage === 'PENDING' ? 'Edit' : 'Revisi'} ${po.no}` : 'Buat Purchase Order', po && po.stage !== 'PENDING' ? 'Menyimpan revisi akan mengajukan ulang PO ke atasan untuk approval.' : 'PO akan diajukan ke atasan untuk approval sebelum dikirim ke vendor.', `<a class="btn" href="${back}">${icon('back', 'sm')}Kembali</a>`)}
      ${po && po.approvals.internal && po.approvals.internal.rejected ? `<div class="alert danger" style="margin-bottom:18px">${icon('alert', 'sm')}<span>Ditolak atasan: ${esc(po.approvals.internal.note || '-')}</span></div>` : ''}
      ${po && po.approvals.vendor && po.approvals.vendor.rejected ? `<div class="alert danger" style="margin-bottom:18px">${icon('alert', 'sm')}<span>Ditolak vendor: ${esc(po.approvals.vendor.note || '-')}</span></div>` : ''}
      <form class="card" id="f" novalidate>
        <div class="card-head"><h3>Informasi PO</h3></div>
        <div class="card-body form-grid">
          <div class="field"><label>Referensi PR *</label>
            ${po ? `<input readonly value="${esc(pr ? pr.no : '-')}"><input type="hidden" name="prId" value="${esc(po.prId)}">` :
              `<select name="prId" id="pr-sel" required><option value="">Pilih PR disetujui...</option>${eligible.map(p => `<option value="${p.id}" ${p.id === prId ? 'selected' : ''}>${esc(p.no)} — ${esc(p.purpose.slice(0, 50))}</option>`).join('')}</select>`}
          </div>
          <div class="field"><label>Vendor *</label><select name="vendorId" id="vendor-sel" required><option value="">Pilih vendor...</option>${vendors.map(v => `<option value="${v.id}" ${v.id === d.vendorId ? 'selected' : ''}>${esc(v.name)} — ${esc(v.category || '')}</option>`).join('')}</select>
            <span class="hint"><a class="link" href="#/vendors/new">Tambah vendor baru</a></span></div>
          <div class="field"><label>Tanggal PO</label><input type="date" name="date" value="${esc(d.date)}"></div>
          <div class="field"><label>Tanggal Pengiriman *</label><input type="date" name="deliveryDate" required value="${esc(d.deliveryDate)}"></div>
          <div class="field"><label>Termin Pembayaran (hari)</label><input type="number" min="0" name="paymentTerms" id="terms" value="${esc(d.paymentTerms)}"></div>
          <div class="field full"><label>Alamat Pengiriman *</label><input name="shipTo" required value="${esc(d.shipTo)}"></div>
          <div class="field full"><label>Catatan / Syarat</label><textarea name="notes">${esc(d.notes)}</textarea></div>
        </div>
        <div class="card-head" style="border-top:1px solid var(--border)"><h3>Item PO</h3>${pr ? `<span class="muted">Estimasi PR: ${rp(prTotal(pr))}</span>` : ''}</div>
        <div class="card-body">${ed.html}
          <div class="totals">
            <div class="row"><span>Subtotal</span><b id="t-sub">-</b></div>
            <div class="row"><span>Diskon (Rp)</span><input type="number" min="0" name="discount" id="disc" value="${esc(d.discount)}"></div>
            <div class="row"><span>DPP</span><b id="t-dpp">-</b></div>
            <div class="row"><span>PPN (%)</span><input type="number" min="0" step="any" name="taxRate" id="taxr" value="${esc(d.taxRate)}"></div>
            <div class="row"><span>Nilai PPN</span><b id="t-tax">-</b></div>
            <div class="row grand"><span>Total</span><span id="t-total">-</span></div>
          </div>
        </div>
        <div class="form-foot"><a class="btn" href="${back}">Batal</a><button class="btn primary" type="submit">${icon('send', 'sm')}Simpan & Ajukan Approval</button></div>
      </form>`);
    const f = $('#f');
    const recalc = () => {
      const t = poTotals({ items: ed.read(f), discount: $('#disc').value, taxRate: $('#taxr').value });
      $('#t-sub').textContent = rp(t.subtotal); $('#t-dpp').textContent = rp(t.dpp); $('#t-tax').textContent = rp(t.tax); $('#t-total').textContent = rp(t.total);
    };
    ed.bind(f, recalc);
    $('#disc').oninput = recalc; $('#taxr').oninput = recalc;
    const prSel = $('#pr-sel');
    if (prSel) prSel.onchange = () => { location.hash = `#/po/new?pr=${prSel.value}`; };
    $('#vendor-sel').onchange = e => { const v = Store.byId('vendors', e.target.value); if (v && v.terms != null) $('#terms').value = v.terms; };
    f.onsubmit = e => {
      e.preventDefault();
      if (!validate(f)) return;
      const items = ed.read(f);
      if (!items.length || items.some(i => i.qty <= 0)) return toast('Minimal 1 item dengan qty > 0', 'error');
      const data = { ...formData(f), items };
      data.discount = Number(data.discount) || 0; data.taxRate = Number(data.taxRate) || 0; data.paymentTerms = Number(data.paymentTerms) || 0;
      const saved = po ? Actions.updatePO(po.id, data) : Actions.createPO(data);
      toast(po ? 'PO disimpan & diajukan ulang' : `${saved.no} dibuat, menunggu approval atasan`);
      location.hash = `#/po/${saved.id}`;
    };
  }

  function poDocument(po) {
    const v = vendorOf(po.vendorId);
    const pr = Store.byId('prs', po.prId);
    const t = poTotals(po);
    const s = db.settings;
    const sign = (title, a, fallback) => `<div><div>${title}</div>
      ${a ? `<div class="stamp ${a.rejected ? 'rej' : ''}">${a.rejected ? 'Ditolak' : 'Disetujui'}<br>${fdate(a.at)}</div>` : '<div class="stamp"></div>'}
      <div class="box">${esc(a ? a.by : fallback)}</div></div>`;
    const created = po.history.find(e => e.key === 'PO_CREATED');
    return `<div class="doc" id="po-doc">
      <div class="doc-head">
        <div class="company"><b>${esc(s.company)}</b><div>${esc(s.address)}</div><div>NPWP ${esc(s.npwp)}</div></div>
        <div class="doc-meta"><h2>PURCHASE ORDER</h2><div><b>${esc(po.no)}</b></div><div>Tanggal: ${fdate(po.date)}</div><div>Ref PR: ${esc(pr ? pr.no : '-')}</div></div>
      </div>
      <div class="doc-parties">
        <div><span>Kepada (Vendor)</span><b>${esc(v.name)}</b><br>${esc(v.address || '')}<br>Up. ${esc(v.contact || '-')} — ${esc(v.phone || '')}<br>${esc(v.email || '')}<br>NPWP ${esc(v.npwp || '-')}</div>
        <div><span>Kirim ke</span>${esc(po.shipTo)}<br><br><span>Pengiriman / Pembayaran</span>Tanggal kirim: ${fdate(po.deliveryDate)}<br>Termin: ${po.paymentTerms} hari setelah tagihan diterima</div>
      </div>
      <table><thead><tr><th>#</th><th>Deskripsi</th><th class="num">Qty</th><th>Satuan</th><th class="num">Harga</th><th class="num">Jumlah</th></tr></thead><tbody>
      ${po.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}</td><td class="num">${num(i.qty)}</td><td>${esc(i.unit)}</td><td class="num">${rp(i.price)}</td><td class="num">${rp(i.qty * i.price)}</td></tr>`).join('')}
      </tbody></table>
      <div class="totals" style="margin-top:12px">
        <div class="row"><span>Subtotal</span><span>${rp(t.subtotal)}</span></div>
        ${t.discount ? `<div class="row"><span>Diskon</span><span>- ${rp(t.discount)}</span></div>` : ''}
        <div class="row"><span>DPP</span><span>${rp(t.dpp)}</span></div>
        <div class="row"><span>PPN ${po.taxRate}%</span><span>${rp(t.tax)}</span></div>
        <div class="row grand"><span>Total</span><span>${rp(t.total)}</span></div>
      </div>
      ${po.notes ? `<div class="doc-notes"><b>Catatan:</b> ${esc(po.notes)}</div>` : ''}
      <div class="signs">
        <div><div>Dibuat oleh</div><div class="stamp" style="color:#444">Diajukan<br>${fdate(created && created.at)}</div><div class="box">${esc(created ? created.by : s.userName)}</div></div>
        ${sign('Disetujui (Atasan)', po.approvals.internal, s.approverName)}
        ${sign('Disetujui (Vendor)', po.approvals.vendor, `${v.contact || ''} — ${v.name}`)}
      </div>
    </div>`;
  }

  function vendorPortalUrl(po) { return `${location.origin}${location.pathname}#/vendor-portal/${po.id}`; }

  function viewPODetail(path, id) {
    const po = Store.byId('pos', id);
    if (!po) return notFound(path);
    const pr = Store.byId('prs', po.prId);
    const v = vendorOf(po.vendorId);
    const inv = po.invoiceId ? Store.byId('invoices', po.invoiceId) : null;
    const st = po.stage;
    const a = [];
    if (st === 'PENDING') a.push(`<button class="btn danger" data-act="reject">${icon('x', 'sm')}Tolak</button><button class="btn success" data-act="approve">${icon('check', 'sm')}Setujui (Atasan)</button>`);
    if (['PENDING', 'REJECTED', 'VENDOR_REJECTED', 'APPROVED'].includes(st)) a.push(`<a class="btn" href="#/po/${po.id}/edit">${icon(st === 'PENDING' ? 'edit' : 'revise', 'sm')}${st === 'PENDING' ? 'Edit' : 'Revisi'}</a>`);
    if (st === 'APPROVED') a.push(`<button class="btn primary" data-act="send">${icon('send', 'sm')}Kirim ke Vendor</button>`);
    if (st === 'SENT') a.push(`<button class="btn" data-act="link">${icon('link', 'sm')}Link Vendor</button><button class="btn danger" data-act="vreject">${icon('x', 'sm')}Vendor Menolak</button><button class="btn success" data-act="vaccept">${icon('check', 'sm')}Vendor Menyetujui</button>`);
    if (st === 'ACCEPTED') a.push(`<button class="btn primary" data-act="ship">${icon('truck', 'sm')}Barang Dikirim</button>`);
    if (st === 'SHIPPED') a.push(`<button class="btn primary" data-act="receive">${icon('package', 'sm')}Terima Barang</button>`);
    if (['ACCEPTED', 'SHIPPED', 'RECEIVED'].includes(st) && !inv && po.status === 'Open') a.push(`<a class="btn" href="#/invoices/new?po=${po.id}">${icon('invoice', 'sm')}Input Tagihan</a>`);
    if (inv) a.push(`<a class="btn" href="#/invoices/${inv.id}">${icon('invoice', 'sm')}${esc(inv.no)}</a>`);
    if (po.status === 'Open' && !['PENDING', 'APPROVED', 'SENT'].includes(st)) a.push(`<button class="btn" data-act="close">${icon('lock', 'sm')}Tutup PO</button>`);
    a.push(`<button class="btn" data-act="print">${icon('printer', 'sm')}Cetak</button>`);

    const flowIdx = PO_FLOW.indexOf(st);
    shell(path, crumb('Purchase Order', po.no), `
      ${pageHead(`Form ${po.no}`, `${poStageBadge(po)} ${statusBadge(po.status)} <span class="muted">— ${esc(v.name)}${pr ? ` — <a class="link" href="#/pr/${pr.id}">${esc(pr.no)}</a>` : ''}</span>`, `<a class="btn no-print" href="#/po">${icon('back', 'sm')}List PO</a>`)}
      <div class="card no-print" style="margin-bottom:18px"><div class="card-body" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <div class="muted" style="font-size:13px;margin-bottom:6px">Alur Approval PO</div>
          <div class="progress" style="max-width:520px">${PO_FLOW.map((k, i) => `<span class="${['REJECTED', 'VENDOR_REJECTED'].includes(st) ? (i < (st === 'REJECTED' ? 1 : 3) ? 'on' : i === (st === 'REJECTED' ? 1 : 3) ? 'rej' : '') : i < flowIdx || st === 'CLOSED' ? 'on' : i === flowIdx ? 'cur' : ''}" title="${PO_STAGES[k].label}"></span>`).join('')}</div>
          <div style="margin-top:6px;font-size:13px">${nextHint(po)}</div>
        </div>
        <div class="actions">${a.join('')}</div>
      </div></div>
      ${po.approvals.internal && po.approvals.internal.rejected && st === 'REJECTED' ? `<div class="alert danger no-print" style="margin-bottom:18px">${icon('alert', 'sm')}<span>Ditolak atasan (${esc(po.approvals.internal.by)}): ${esc(po.approvals.internal.note || '-')}</span></div>` : ''}
      ${po.approvals.vendor && po.approvals.vendor.rejected && st === 'VENDOR_REJECTED' ? `<div class="alert danger no-print" style="margin-bottom:18px">${icon('alert', 'sm')}<span>Ditolak vendor (${esc(po.approvals.vendor.by)}): ${esc(po.approvals.vendor.note || '-')}</span></div>` : ''}
      <div class="grid two">
        <div>${poDocument(po)}</div>
        <div class="stack no-print">
          ${po.shipment || po.receipt ? `<div class="card"><div class="card-head"><h3>Pengiriman & Penerimaan</h3></div><div class="card-body dl">
            ${po.shipment ? `<div><span>Ekspedisi</span><b>${esc(po.shipment.courier || '-')}</b></div><div><span>No. Resi / SJ</span><b>${esc(po.shipment.ref || '-')}</b></div><div><span>Tgl Kirim</span><b>${fdate(po.shipment.date)}</b></div>` : ''}
            ${po.receipt ? `<div><span>Tgl Terima</span><b>${fdate(po.receipt.date)}</b></div><div><span>Penerima</span><b>${esc(po.receipt.receiver)}</b></div><div><span>Kondisi</span><b>${esc(po.receipt.note || '-')}</b></div>` : ''}
          </div></div>` : ''}
          ${pr ? trackingCard(pr) : ''}
          ${historyCard(po.history)}
        </div>
      </div>`);

    const by = db.settings.approverName;
    bindActs({
      approve: () => confirmNote({ title: `Approval ${po.no}`, message: `Total ${rp(poTotals(po).total)} kepada ${esc(v.name)}.`, confirm: 'Setujui PO', confirmClass: 'success', byLabel: 'Disetujui oleh', byValue: by,
        onConfirm: d => { Actions.approvePO(po.id, d); toast('PO disetujui atasan. Siap dikirim ke vendor.'); router(); } }),
      reject: () => confirmNote({ title: `Tolak ${po.no}`, confirm: 'Tolak PO', confirmClass: 'danger solid', byLabel: 'Ditolak oleh', byValue: by, noteLabel: 'Alasan penolakan', noteRequired: true,
        onConfirm: d => { Actions.rejectPO(po.id, d); toast('PO ditolak'); router(); } }),
      send: () => sendToVendorModal(po, v),
      link: () => sendToVendorModal(po, v, true),
      vaccept: () => confirmNote({ title: 'Catat Persetujuan Vendor', message: 'Gunakan ini bila vendor menyetujui via email/telepon. Vendor juga bisa menyetujui langsung melalui link portal.', confirm: 'Vendor Menyetujui', confirmClass: 'success', byLabel: 'Nama penyetuju (vendor)', byValue: `${v.contact || ''} (${v.name})`,
        onConfirm: d => { Actions.vendorAccept(po.id, d); toast('PO disepakati vendor'); router(); } }),
      vreject: () => confirmNote({ title: 'Catat Penolakan Vendor', confirm: 'Vendor Menolak', confirmClass: 'danger solid', byLabel: 'Nama (vendor)', byValue: `${v.contact || ''} (${v.name})`, noteLabel: 'Alasan / permintaan revisi', noteRequired: true,
        onConfirm: d => { Actions.vendorReject(po.id, d); toast('PO ditolak vendor, silakan revisi'); router(); } }),
      ship: () => modal({ title: 'Barang Dikirim Vendor', confirm: 'Simpan',
        body: `<div class="form-grid"><div class="field"><label>Tanggal Kirim *</label><input type="date" name="date" required value="${todayISO()}"></div><div class="field"><label>Ekspedisi</label><input name="courier" placeholder="Armada vendor / JNE / dll"></div><div class="field full"><label>No. Resi / Surat Jalan</label><input name="ref"></div></div>`,
        onConfirm: d => { Actions.shipPO(po.id, d); toast('Status: dalam pengiriman'); router(); } }),
      receive: () => modal({ title: 'Penerimaan Barang (Goods Receipt)', confirm: 'Terima Barang', confirmClass: 'success',
        body: `<div class="form-grid"><div class="field"><label>Tanggal Terima *</label><input type="date" name="date" required value="${todayISO()}"></div><div class="field"><label>Diterima oleh *</label><input name="receiver" required value="${esc(db.settings.userName)}"></div><div class="field full"><label>Kondisi / Catatan</label><textarea name="note">Lengkap, kondisi baik</textarea></div></div>`,
        onConfirm: d => { Actions.receivePO(po.id, d); toast(Store.byId('pos', po.id).status === 'Closed' ? 'Barang diterima. PO & PR otomatis Closed.' : 'Barang diterima'); router(); } }),
      close: () => confirmNote({ title: `Tutup ${po.no}`, message: 'PO dan PR terkait akan berstatus Closed.', confirm: 'Tutup PO', noteLabel: 'Alasan', onConfirm: d => { Actions.closePO(po.id, d); toast('PO ditutup'); router(); } }),
      print: () => window.print(),
    });
  }

  function nextHint(po) {
    const m = {
      PENDING: 'Langkah berikutnya: approval atasan.',
      REJECTED: 'Ditolak atasan — revisi PO lalu ajukan ulang.',
      APPROVED: 'Disetujui atasan — kirim PO ke vendor untuk persetujuan.',
      SENT: 'Menunggu vendor menyetujui PO melalui link portal vendor.',
      VENDOR_REJECTED: 'Ditolak vendor — revisi PO lalu ajukan ulang.',
      ACCEPTED: 'Disepakati vendor — menunggu pengiriman barang. Tagihan sudah dapat diinput.',
      SHIPPED: 'Barang dalam perjalanan — lakukan penerimaan barang saat tiba.',
      RECEIVED: po.invoiceId ? 'Barang diterima & tagihan dijurnal.' : 'Barang diterima — input tagihan vendor untuk menutup PO.',
      CLOSED: 'PO selesai (Closed).',
    };
    return `<span class="muted">${m[po.stage]}</span>`;
  }

  function sendToVendorModal(po, v, linkOnly = false) {
    const url = vendorPortalUrl(po);
    const t = poTotals(po);
    const subject = `Purchase Order ${po.no} — ${db.settings.company}`;
    const bodyText = `Yth. ${v.contact || v.name},\n\nBersama ini kami sampaikan Purchase Order ${po.no} senilai ${rp(t.total)} (termasuk PPN).\nMohon ditinjau dan berikan persetujuan melalui tautan berikut:\n${url}\n\nTanggal pengiriman: ${fdate(po.deliveryDate)}\nTermin pembayaran: ${po.paymentTerms} hari\n\nTerima kasih,\n${db.settings.userName}\n${db.settings.company}`;
    const mailto = `mailto:${encodeURIComponent(v.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    modal({
      title: linkOnly ? 'Link Persetujuan Vendor' : `Kirim ${po.no} ke Vendor`, wide: true,
      confirm: linkOnly ? '' : 'Tandai Terkirim', cancel: linkOnly ? 'Tutup' : 'Batal',
      body: `<div class="stack">
        <div class="dl"><div><span>Vendor</span><b>${esc(v.name)}</b></div><div><span>Email</span><b>${esc(v.email || '-')}</b></div><div><span>Total PO</span><b>${rp(t.total)}</b></div></div>
        <div class="field"><label>Link portal persetujuan vendor</label><div class="copy-box"><input readonly id="portal-url" value="${esc(url)}"><button type="button" class="btn" id="copy">${icon('copy', 'sm')}Salin</button><a class="btn" target="_blank" rel="noopener" href="${esc(url)}">${icon('external', 'sm')}Buka</a></div>
          <span class="hint">Vendor membuka link ini untuk meninjau Form PO dan menekan Setujui / Tolak.</span></div>
        <div class="row-gap"><a class="btn" href="${esc(mailto)}">${icon('mail', 'sm')}Buka Email ke Vendor</a><button type="button" class="btn" id="print-po">${icon('printer', 'sm')}Cetak / PDF</button></div>
        ${linkOnly ? '' : '<div class="alert info">' + icon('alert', 'sm') + '<span>Setelah PO dikirim (email/link), klik <b>Tandai Terkirim</b>. Status PO menjadi Menunggu Persetujuan Vendor.</span></div>'}
      </div>`,
      onOpen: form => {
        $('#copy', form).onclick = () => { const i = $('#portal-url', form); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(() => toast('Link disalin')).catch(() => { document.execCommand('copy'); toast('Link disalin'); }); };
        $('#print-po', form).onclick = () => window.print();
      },
      onConfirm: () => { if (!linkOnly) { Actions.sendPO(po.id, { note: v.email ? `Dikirim ke ${v.email}` : '' }); toast('PO terkirim ke vendor'); router(); } },
    });
  }

  /* ---------- Vendor portal (public-facing page for vendor approval) ---------- */
  function viewVendorPortal(path, id) {
    const po = Store.byId('pos', id);
    const v = po ? vendorOf(po.vendorId) : null;
    const wrap = inner => { $('#app').innerHTML = `<div class="portal"><div class="portal-head no-print"><img src="favicon.svg" alt="" width="34" height="34"><div><b style="font-size:19px">Portal Vendor</b><div class="muted">${esc(db.settings.company)}</div></div></div>${inner}</div>`; };
    if (!po) return wrap(`<div class="card">${emptyState('PO tidak ditemukan atau link tidak valid.', 'alert')}</div>`);
    let state = '';
    if (po.stage === 'SENT') state = `<div class="card no-print" style="margin-bottom:18px"><div class="card-head"><h3>Persetujuan PO</h3>${badge('Menunggu persetujuan Anda', 'warning')}</div>
      <form class="card-body" id="vf" novalidate><div class="form-grid">
        <div class="field"><label>Nama penyetuju *</label><input name="by" required value="${esc(v.contact || '')}"></div>
        <div class="field"><label>Jabatan</label><input name="title" placeholder="Sales Manager"></div>
        <div class="field full"><label>Catatan untuk pembeli</label><textarea name="note" placeholder="Konfirmasi ketersediaan, estimasi kirim, dll."></textarea></div>
      </div>
      <div class="row-gap mt" style="justify-content:flex-end"><button type="button" class="btn danger" id="v-rej">${icon('x', 'sm')}Tolak PO</button><button type="submit" class="btn success">${icon('check', 'sm')}Setujui PO</button></div></form></div>`;
    else if (po.approvals.vendor && !po.approvals.vendor.rejected) state = `<div class="alert success no-print" style="margin-bottom:18px">${icon('check', 'sm')}<span>PO telah Anda setujui pada ${fdt(po.approvals.vendor.at)} oleh ${esc(po.approvals.vendor.by)}. Terima kasih.</span></div>`;
    else if (po.stage === 'VENDOR_REJECTED') state = `<div class="alert danger no-print" style="margin-bottom:18px">${icon('x', 'sm')}<span>PO ditolak: ${esc(po.approvals.vendor.note)}. Pembeli akan mengirim revisi.</span></div>`;
    else state = `<div class="alert info no-print" style="margin-bottom:18px">${icon('clock', 'sm')}<span>PO ini belum siap untuk persetujuan vendor (status: ${esc(PO_STAGES[po.stage].label)}).</span></div>`;
    wrap(`${state}${poDocument(po)}<div class="right mt no-print"><button class="btn" onclick="window.print()">${icon('printer', 'sm')}Cetak / Simpan PDF</button></div>`);
    const vf = $('#vf');
    if (vf) {
      const by = () => { const d = formData(vf); return { by: `${d.by}${d.title ? ', ' + d.title : ''} (${v.name})`, note: d.note }; };
      vf.onsubmit = e => { e.preventDefault(); if (!validate(vf)) return; Actions.vendorAccept(po.id, by()); toast('PO disetujui. Terima kasih.'); router(); };
      $('#v-rej').onclick = () => {
        if (!validate(vf)) return;
        if (!$('[name=note]', vf).value.trim()) { $('[name=note]', vf).style.borderColor = 'var(--danger)'; return toast('Isi catatan alasan penolakan', 'error'); }
        Actions.vendorReject(po.id, by()); toast('PO ditolak'); router();
      };
    }
  }

  /* ---------- Tracking ---------- */
  function viewTracking(path, q, id) {
    if (id) {
      const pr = Store.byId('prs', id);
      if (!pr) return notFound(path);
      const po = pr.poId ? Store.byId('pos', pr.poId) : null;
      shell(path, crumb('Tracking PR', pr.no), `
        ${pageHead(`Tracking ${pr.no}`, `${esc(pr.purpose)}`, `<a class="btn" href="#/tracking">${icon('back', 'sm')}Semua PR</a><a class="btn" href="#/pr/${pr.id}">${icon('pr', 'sm')}Detail PR</a>${po ? `<a class="btn" href="#/po/${po.id}">${icon('po', 'sm')}Form PO</a>` : ''}`)}
        <div class="grid two">
          ${trackingCard(pr)}
          <div class="stack">
            <div class="card"><div class="card-head"><h3>Ringkasan</h3></div><div class="card-body dl">
              <div><span>Pemohon</span><b>${esc(pr.requester)}</b></div><div><span>Departemen</span><b>${esc(pr.department)}</b></div>
              <div><span>Dibutuhkan</span><b>${fdate(pr.neededDate)}</b></div><div><span>Status PR</span><b>${statusBadge(pr.status)}</b></div>
              ${po ? `<div><span>No PO</span><b>${esc(po.no)}</b></div><div><span>Vendor</span><b>${esc(vendorOf(po.vendorId).name)}</b></div><div><span>Tahap PO</span><b>${poStageBadge(po)}</b></div><div><span>Nilai PO</span><b>${rp(poTotals(po).total)}</b></div><div><span>Estimasi Tiba</span><b>${fdate(po.deliveryDate)}</b></div>` : ''}
              ${po && po.shipment ? `<div><span>Resi / SJ</span><b>${esc(po.shipment.courier || '')} ${esc(po.shipment.ref || '')}</b></div>` : ''}
            </div></div>
            ${historyCard(pr.history.concat(po ? po.history.map(e => ({ ...e, po: po.no })) : []))}
          </div>
        </div>`);
      return;
    }
    const term = (q.get('q') || '').toLowerCase();
    const status = q.get('status') || 'Open';
    let list = db.prs;
    if (status !== 'All') list = list.filter(p => p.status === status);
    if (term) list = list.filter(p => { const po = p.poId ? Store.byId('pos', p.poId) : null; return [p.no, p.requester, p.department, p.purpose, po && po.no, po && vendorOf(po.vendorId).name].join(' ').toLowerCase().includes(term); });
    shell(path, crumb('Tracking PR'), `
      ${pageHead('Tracking PR s/d Barang Datang', 'Lihat posisi setiap PR: approval, PO, persetujuan vendor, pengiriman, penerimaan, hingga tagihan.')}
      <div class="card">
        ${listToolbar('tracking', status, term, '')}
        <div class="table-wrap"><table><thead><tr><th>No PR</th><th>No PO / Vendor</th><th>Progress</th><th>Posisi Saat Ini</th><th>Update Terakhir</th><th></th></tr></thead><tbody>
        ${list.map(pr => { const t = trackPR(pr); const last = t.steps.filter(s => s.event).map(s => s.event).sort((a, b) => a.at.localeCompare(b.at)).pop(); return `<tr class="clickable" data-href="#/tracking/${pr.id}">
          <td><span class="strong">${esc(pr.no)}</span><span class="sub">${esc(pr.requester)} — ${esc(pr.department)}</span></td>
          <td>${t.po ? `${esc(t.po.no)}<span class="sub">${esc(vendorOf(t.po.vendorId).name)}</span>` : '<span class="muted">Belum ada PO</span>'}</td>
          <td>${progressStrip(pr)}<span class="sub">${t.doneCount} dari ${t.steps.length} tahap</span></td>
          <td>${badge(t.position.label, t.position.tone)}</td>
          <td>${last ? fdt(last.at) : '-'}</td>
          <td>${icon('chevron', 'sm')}</td></tr>`; }).join('') || `<tr><td colspan="6">${emptyState('Tidak ada PR')}</td></tr>`}
        </tbody></table></div>
      </div>`);
    // default tab for tracking is Open, so "Semua" must be explicit
    $$('#tabs button').forEach(b => b.onclick = () => { const p = new URLSearchParams(q); p.set('status', b.dataset.s); location.hash = `#/tracking?${p}`; });
    let timer;
    $('#q').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { const p = new URLSearchParams(q); if (e.target.value) p.set('q', e.target.value); else p.delete('q'); location.hash = `#/tracking?${p}`; setTimeout(() => { const i = $('#q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 300); };
  }

  /* ---------- Vendors ---------- */
  function viewVendors(path, q) {
    const term = (q.get('q') || '').toLowerCase();
    let list = db.vendors;
    if (term) list = list.filter(v => [v.code, v.name, v.category, v.contact, v.email, v.npwp].join(' ').toLowerCase().includes(term));
    shell(path, crumb('Pengadaan', 'Database Vendor'), `
      ${pageHead('Database Vendor', `${db.vendors.length} vendor terdaftar`, `<button class="btn" id="export">${icon('download', 'sm')}Export CSV</button><a class="btn primary" href="#/vendors/new">${icon('plus', 'sm')}Tambah Vendor</a>`)}
      <div class="card">
        <div class="toolbar"><div class="search">${icon('search', 'sm')}<input id="q" placeholder="Cari kode, nama, kategori, kontak..." value="${esc(term)}"></div></div>
        <div class="table-wrap"><table><thead><tr><th>Kode</th><th>Vendor</th><th>Kategori</th><th>Kontak</th><th>Termin</th><th class="num">PO (Open/Total)</th><th class="num">Nilai PO</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map(v => { const pos = db.pos.filter(p => p.vendorId === v.id); return `<tr>
          <td class="mono">${esc(v.code)}</td>
          <td><span class="strong">${esc(v.name)}</span><span class="sub">NPWP ${esc(v.npwp || '-')}</span></td>
          <td>${esc(v.category || '-')}</td>
          <td>${esc(v.contact || '-')}<span class="sub">${esc(v.email || '')} ${esc(v.phone || '')}</span></td>
          <td>${v.terms != null ? esc(v.terms) + ' hari' : '-'}</td>
          <td class="num">${pos.filter(p => p.status === 'Open').length} / ${pos.length}</td>
          <td class="num">${rp(pos.reduce((s, p) => s + poTotals(p).total, 0))}</td>
          <td>${v.active === false ? badge('Nonaktif', 'neutral') : badge('Aktif', 'success')}</td>
          <td class="num"><a class="btn sm ghost icon-only" href="#/vendors/${v.id}/edit" title="Edit">${icon('edit', 'sm')}</a><button class="btn sm ghost icon-only danger" data-del="${v.id}" title="Hapus">${icon('trash', 'sm')}</button></td></tr>`; }).join('') || `<tr><td colspan="9">${emptyState('Belum ada vendor')}</td></tr>`}
        </tbody></table></div>
      </div>`);
    let timer;
    $('#q').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { location.hash = `#/vendors${e.target.value ? '?q=' + encodeURIComponent(e.target.value) : ''}`; setTimeout(() => { const i = $('#q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 300); };
    $$('[data-del]').forEach(b => b.onclick = () => {
      const v = Store.byId('vendors', b.dataset.del);
      modal({ title: 'Hapus Vendor', confirm: 'Hapus', confirmClass: 'danger solid', body: `<p style="margin:0">Hapus <b>${esc(v.name)}</b> dari database?</p>`,
        onConfirm: () => { if (!Actions.deleteVendor(v.id)) { toast('Vendor memiliki PO. Nonaktifkan saja melalui Edit.', 'error'); return; } toast('Vendor dihapus'); router(); } });
    });
    $('#export').onclick = () => csv('vendor.csv', [['Kode', 'Nama', 'Kategori', 'Kontak', 'Email', 'Telepon', 'Alamat', 'NPWP', 'Termin', 'Bank', 'No Rekening', 'Status'],
      ...list.map(v => [v.code, v.name, v.category, v.contact, v.email, v.phone, v.address, v.npwp, v.terms, v.bank, v.account, v.active === false ? 'Nonaktif' : 'Aktif'])]);
  }

  function viewVendorForm(path, id) {
    const v = id ? Store.byId('vendors', id) : null;
    if (id && !v) return notFound(path);
    const d = v || { terms: 30, active: true };
    const f = (name, label, attrs = '', full = false) => `<div class="field ${full ? 'full' : ''}"><label>${label}</label><input name="${name}" value="${esc(d[name] ?? '')}" ${attrs}></div>`;
    shell(path, crumb('Database Vendor', v ? v.name : 'Vendor Baru'), `
      ${pageHead(v ? `Edit ${v.name}` : 'Tambah Vendor', '', `<a class="btn" href="#/vendors">${icon('back', 'sm')}Kembali</a>`)}
      <form class="card" id="f" novalidate>
        <div class="card-head"><h3>Profil Vendor</h3>${v ? `<span class="mono muted">${esc(v.code)}</span>` : ''}</div>
        <div class="card-body form-grid">
          ${f('name', 'Nama Perusahaan *', 'required')}
          ${f('category', 'Kategori', 'list="cat-list"')}<datalist id="cat-list">${[...new Set(db.vendors.map(x => x.category).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
          ${f('npwp', 'NPWP')}
          ${f('contact', 'Nama Kontak *', 'required')}
          ${f('email', 'Email *', 'type="email" required')}
          ${f('phone', 'Telepon')}
          ${f('address', 'Alamat', '', true)}
        </div>
        <div class="card-head" style="border-top:1px solid var(--border)"><h3>Pembayaran</h3></div>
        <div class="card-body form-grid">
          ${f('terms', 'Termin Default (hari)', 'type="number" min="0"')}
          ${f('bank', 'Bank')}
          ${f('account', 'No. Rekening')}
          <div class="field"><label>Rating</label><select name="rating">${['A', 'B', 'C'].map(r => `<option ${d.rating === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select name="active"><option value="1">Aktif</option><option value="0" ${d.active === false ? 'selected' : ''}>Nonaktif</option></select></div>
        </div>
        <div class="form-foot"><a class="btn" href="#/vendors">Batal</a><button class="btn primary" type="submit">${icon('check', 'sm')}Simpan Vendor</button></div>
      </form>`);
    $('#f').onsubmit = e => {
      e.preventDefault();
      if (!validate(e.target)) return;
      const data = formData(e.target);
      if (!/^\S+@\S+\.\S+$/.test(data.email)) return toast('Format email tidak valid', 'error');
      data.terms = Number(data.terms) || 0; data.active = data.active !== '0';
      if (v) data.id = v.id;
      Actions.saveVendor(data);
      toast('Vendor disimpan');
      location.hash = '#/vendors';
    };
  }

  /* ---------- Invoices ---------- */
  function viewInvoices(path, q) {
    const status = q.get('status') || 'All';
    let list = db.invoices;
    if (status === 'Open') list = list.filter(i => i.status !== 'Paid');
    if (status === 'Closed') list = list.filter(i => i.status === 'Paid');
    const term = (q.get('q') || '').toLowerCase();
    if (term) list = list.filter(i => { const po = Store.byId('pos', i.poId); return [i.no, i.vendorInvoiceNo, po && po.no, vendorOf(i.vendorId).name].join(' ').toLowerCase().includes(term); });
    const pending = db.pos.filter(p => p.status === 'Open' && !p.invoiceId && ['ACCEPTED', 'SHIPPED', 'RECEIVED'].includes(p.stage));
    shell(path, crumb('Keuangan', 'Tagihan Vendor'), `
      ${pageHead('Tagihan Vendor', 'Input tagihan berdasarkan PO yang sudah disepakati vendor, otomatis membentuk jurnal.', `<button class="btn" id="export">${icon('download', 'sm')}Export CSV</button><a class="btn primary" href="#/invoices/new">${icon('plus', 'sm')}Input Tagihan</a>`)}
      ${pending.length ? `<div class="alert info" style="margin-bottom:18px">${icon('alert', 'sm')}<span>${pending.length} PO sudah disepakati vendor namun belum ditagihkan: ${pending.map(p => `<a class="link" href="#/invoices/new?po=${p.id}">${esc(p.no)}</a>`).join(', ')}</span></div>` : ''}
      <div class="card">
        <div class="toolbar">
          <div class="tabs" id="tabs">${[['All', 'Semua'], ['Open', 'Belum Dibayar'], ['Closed', 'Lunas']].map(([k, l]) => `<button data-s="${k}" class="${status === k ? 'active' : ''}">${l}</button>`).join('')}</div>
          <div class="search">${icon('search', 'sm')}<input id="q" placeholder="Cari no tagihan, PO, vendor..." value="${esc(term)}"></div>
        </div>
        <div class="table-wrap"><table><thead><tr><th>No Internal</th><th>No Invoice Vendor</th><th>Tanggal</th><th>Jatuh Tempo</th><th>No PO</th><th>Vendor</th><th class="num">Total</th><th class="num">Hutang</th><th>Status</th></tr></thead><tbody>
        ${list.map(i => { const po = Store.byId('pos', i.poId); const overdue = i.status !== 'Paid' && i.dueDate < todayISO(); return `<tr class="clickable" data-href="#/invoices/${i.id}">
          <td class="strong">${esc(i.no)}</td><td>${esc(i.vendorInvoiceNo)}</td><td>${fdate(i.date)}</td>
          <td>${fdate(i.dueDate)}${overdue ? '<span class="sub" style="color:var(--danger)">Lewat jatuh tempo</span>' : ''}</td>
          <td>${po ? esc(po.no) : '-'}</td><td>${esc(vendorOf(i.vendorId).name)}</td>
          <td class="num">${rp(i.total)}</td><td class="num">${rp(i.payable)}</td>
          <td>${i.status === 'Paid' ? badge('Lunas', 'success') : badge('Dijurnal', 'info')}</td></tr>`; }).join('') || `<tr><td colspan="9">${emptyState('Belum ada tagihan')}</td></tr>`}
        </tbody></table></div>
      </div>`);
    bindListToolbar('invoices', q);
    $('#export').onclick = () => csv('tagihan-vendor.csv', [['No Internal', 'No Invoice Vendor', 'No Faktur Pajak', 'Tanggal', 'Jatuh Tempo', 'No PO', 'Vendor', 'DPP', 'PPN', 'PPh', 'Total', 'Hutang', 'Status'],
      ...list.map(i => { const po = Store.byId('pos', i.poId); return [i.no, i.vendorInvoiceNo, i.taxInvoiceNo, i.date, i.dueDate, po ? po.no : '', vendorOf(i.vendorId).name, i.dpp, i.tax, i.pph, i.total, i.payable, i.status === 'Paid' ? 'Lunas' : 'Dijurnal']; })]);
  }

  function viewInvoiceForm(path, q) {
    const eligible = db.pos.filter(p => p.status === 'Open' && !p.invoiceId && ['ACCEPTED', 'SHIPPED', 'RECEIVED'].includes(p.stage));
    const poId = q.get('po') || '';
    const po = poId ? Store.byId('pos', poId) : null;
    const valid = po && eligible.includes(po);
    const t = po ? poTotals(po) : null;
    const v = po ? vendorOf(po.vendorId) : null;

    shell(path, crumb('Tagihan Vendor', 'Input Tagihan'), `
      ${pageHead('Input Tagihan Vendor', 'Panggil nomor PO yang sudah disepakati vendor, lalu sistem membentuk jurnal hutang.', `<a class="btn" href="#/invoices">${icon('back', 'sm')}Kembali</a>`)}
      <div class="card"><div class="card-body">
        <div class="field" style="max-width:520px"><label>Nomor PO *</label>
          <select id="po-sel"><option value="">Pilih / cari nomor PO...</option>${eligible.map(p => `<option value="${p.id}" ${p.id === poId ? 'selected' : ''}>${esc(p.no)} — ${esc(vendorOf(p.vendorId).name)} — ${rp(poTotals(p).total)}</option>`).join('')}</select>
          <span class="hint">Hanya PO berstatus Disepakati Vendor / Dalam Pengiriman / Barang Diterima yang belum ditagihkan.</span>
        </div>
        ${po && !valid ? `<div class="alert warning mt">${icon('alert', 'sm')}<span>${esc(po.no)} tidak dapat ditagihkan (status: ${esc(PO_STAGES[po.stage].label)}${po.invoiceId ? ', sudah ditagihkan' : ''}).</span></div>` : ''}
        ${!eligible.length ? `<div class="alert info mt">${icon('alert', 'sm')}<span>Belum ada PO yang siap ditagihkan.</span></div>` : ''}
      </div></div>
      ${valid ? `
      <div class="card mt"><div class="card-head"><h3>Data PO ${esc(po.no)}</h3>${poStageBadge(po)}</div>
        <div class="card-body dl">
          <div><span>Vendor</span><b>${esc(v.name)}</b></div><div><span>Tanggal PO</span><b>${fdate(po.date)}</b></div>
          <div><span>DPP PO</span><b>${rp(t.dpp)}</b></div><div><span>PPN PO</span><b>${rp(t.tax)}</b></div><div><span>Total PO</span><b>${rp(t.total)}</b></div>
          <div><span>Penerimaan Barang</span><b>${po.received ? `Diterima ${fdate(po.receipt.date)}` : 'Belum diterima'}</b></div>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Jumlah</th></tr></thead><tbody>${po.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${num(i.qty)} ${esc(i.unit)}</td><td class="num">${rp(i.price)}</td><td class="num">${rp(i.qty * i.price)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <form class="card mt" id="f" novalidate>
        <div class="card-head"><h3>Data Tagihan</h3></div>
        <div class="card-body form-grid">
          <div class="field"><label>No. Invoice Vendor *</label><input name="vendorInvoiceNo" required></div>
          <div class="field"><label>No. Faktur Pajak</label><input name="taxInvoiceNo" placeholder="010.000-26.xxxxxxxx"></div>
          <div class="field"><label>Tanggal Invoice *</label><input type="date" name="date" id="inv-date" required value="${todayISO()}"></div>
          <div class="field"><label>Jatuh Tempo *</label><input type="date" name="dueDate" id="due" required value="${addDays(todayISO(), po.paymentTerms)}"><span class="hint">Termin ${po.paymentTerms} hari</span></div>
          <div class="field"><label>DPP (Rp) *</label><input type="number" min="0" name="dpp" id="dpp" required value="${t.dpp}"></div>
          <div class="field"><label>PPN (Rp)</label><input type="number" min="0" name="tax" id="tax" value="${t.tax}"></div>
          <div class="field"><label>PPh 23 dipotong (%)</label><input type="number" min="0" step="any" name="pphRate" id="pphr" value="0"><span class="hint">Untuk tagihan jasa, umumnya 2%</span></div>
          <div class="field"><label>Akun Debit *</label><select name="debitAccount" id="dacc">${DEBIT_ACCOUNTS.map(c => `<option value="${c}">${esc(accName(c))}</option>`).join('')}</select></div>
          <div class="field full"><label>Keterangan</label><input name="notes"></div>
        </div>
        <div class="card-body" style="border-top:1px solid var(--border)">
          <div id="variance"></div>
          <h3 style="font-size:15px;margin:0 0 10px">Preview Jurnal</h3>
          <div class="table-wrap"><table id="jv"></table></div>
        </div>
        <div class="form-foot"><a class="btn" href="#/invoices">Batal</a><button class="btn primary" type="submit">${icon('journal', 'sm')}Posting Tagihan & Jurnal</button></div>
      </form>` : ''}`);

    $('#po-sel').onchange = e => { location.hash = `#/invoices/new${e.target.value ? '?po=' + e.target.value : ''}`; };
    if (!valid) return;
    const f = $('#f');
    const read = () => {
      const dpp = Number($('#dpp').value) || 0, tax = Number($('#tax').value) || 0, pphRate = Number($('#pphr').value) || 0;
      const pph = Math.round(dpp * pphRate / 100);
      return { dpp, tax, pph, pphRate, total: dpp + tax, payable: dpp + tax - pph, debitAccount: $('#dacc').value };
    };
    const render = () => {
      const r = read();
      const lines = [[r.debitAccount, r.dpp, 0]];
      if (r.tax) lines.push(['1-1500', r.tax, 0]);
      lines.push(['2-1100', 0, r.payable]);
      if (r.pph) lines.push(['2-1300', 0, r.pph]);
      $('#jv').innerHTML = `<thead><tr><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>${lines.map(([a, d, c]) => `<tr><td>${esc(accName(a))}</td><td class="num">${d ? rp(d) : ''}</td><td class="num">${c ? rp(c) : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${rp(r.dpp + r.tax)}</td><td class="num">${rp(r.payable + r.pph)}</td></tr></tfoot>`;
      const diff = r.total - t.total;
      $('#variance').innerHTML = diff ? `<div class="alert warning" style="margin-bottom:14px">${icon('alert', 'sm')}<span>Nilai tagihan berbeda ${rp(Math.abs(diff))} ${diff > 0 ? 'lebih besar' : 'lebih kecil'} dari nilai PO. Pastikan sudah dikonfirmasi dengan vendor.</span></div>`
        : `<div class="alert success" style="margin-bottom:14px">${icon('check', 'sm')}<span>Nilai tagihan sesuai dengan PO${po.received ? ' dan barang sudah diterima (3-way match).' : '. Barang belum diterima; PO akan Closed otomatis setelah penerimaan barang.'}</span></div>`;
    };
    $$('#dpp, #tax, #pphr, #dacc', f).forEach(el => el.addEventListener('input', render));
    $('#inv-date').onchange = e => { $('#due').value = addDays(e.target.value, po.paymentTerms); };
    render();
    f.onsubmit = e => {
      e.preventDefault();
      if (!validate(f)) return;
      const d = formData(f);
      if (db.invoices.some(i => i.vendorId === po.vendorId && i.vendorInvoiceNo.toLowerCase() === d.vendorInvoiceNo.toLowerCase())) return toast('No. invoice vendor ini sudah pernah diinput', 'error');
      const r = read();
      const inv = Actions.postInvoice({ ...d, ...r, poId: po.id });
      toast(`${inv.no} diposting & jurnal terbentuk`);
      location.hash = `#/invoices/${inv.id}`;
    };
  }

  function journalTable(j) {
    const tt = journalTotals(j);
    return `<table><thead><tr><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>
      ${j.lines.map(l => `<tr><td>${esc(accName(l.account))}</td><td class="num">${l.debit ? rp(l.debit) : ''}</td><td class="num">${l.credit ? rp(l.credit) : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td class="num">${rp(tt.debit)}</td><td class="num">${rp(tt.credit)}</td></tr></tfoot></table>`;
  }

  function viewInvoiceDetail(path, id) {
    const inv = Store.byId('invoices', id);
    if (!inv) return notFound(path);
    const po = Store.byId('pos', inv.poId);
    const v = vendorOf(inv.vendorId);
    const journals = inv.journalIds.map(j => Store.byId('journals', j)).filter(Boolean);
    shell(path, crumb('Tagihan Vendor', inv.no), `
      ${pageHead(inv.no, `${inv.status === 'Paid' ? badge('Lunas', 'success') : badge('Dijurnal — belum dibayar', 'info')} <span class="muted">— ${esc(v.name)}</span>`,
        `<a class="btn" href="#/invoices">${icon('back', 'sm')}List Tagihan</a>${po ? `<a class="btn" href="#/po/${po.id}">${icon('po', 'sm')}${esc(po.no)}</a>` : ''}${inv.status !== 'Paid' ? `<button class="btn primary" data-act="pay">${icon('wallet', 'sm')}Catat Pembayaran</button>` : ''}`)}
      <div class="grid half">
        <div class="card"><div class="card-head"><h3>Detail Tagihan</h3></div><div class="card-body dl">
          <div><span>No. Invoice Vendor</span><b>${esc(inv.vendorInvoiceNo)}</b></div><div><span>No. Faktur Pajak</span><b>${esc(inv.taxInvoiceNo || '-')}</b></div>
          <div><span>Tanggal</span><b>${fdate(inv.date)}</b></div><div><span>Jatuh Tempo</span><b>${fdate(inv.dueDate)}</b></div>
          <div><span>No PO</span><b>${po ? esc(po.no) : '-'}</b></div><div><span>Vendor</span><b>${esc(v.name)}</b></div>
          <div><span>DPP</span><b>${rp(inv.dpp)}</b></div><div><span>PPN</span><b>${rp(inv.tax)}</b></div>
          <div><span>PPh 23 (${inv.pphRate}%)</span><b>${rp(inv.pph)}</b></div><div><span>Total Tagihan</span><b>${rp(inv.total)}</b></div>
          <div><span>Hutang ke Vendor</span><b>${rp(inv.payable)}</b></div>${inv.paidDate ? `<div><span>Tanggal Bayar</span><b>${fdate(inv.paidDate)}</b></div>` : ''}
          ${inv.notes ? `<div style="grid-column:1/-1"><span>Keterangan</span><b style="font-weight:400">${esc(inv.notes)}</b></div>` : ''}
          <div style="grid-column:1/-1"><span>Rekening Vendor</span><b>${esc(v.bank || '-')} ${esc(v.account || '')}</b></div>
        </div></div>
        <div class="stack">${journals.map(j => `<div class="card"><div class="card-head"><h3>${esc(j.no)} — ${esc(j.type)}</h3><span class="muted">${fdate(j.date)}</span></div><div class="card-body" style="padding-bottom:0"><p class="muted" style="margin:0 0 10px">${esc(j.description)}</p></div><div class="table-wrap">${journalTable(j)}</div></div>`).join('')}</div>
      </div>`);
    bindActs({
      pay: () => modal({ title: `Pembayaran ${inv.no}`, confirm: 'Posting Pembayaran',
        body: `<div class="form-grid"><div class="field"><label>Tanggal Bayar *</label><input type="date" name="date" required value="${todayISO()}"></div><div class="field"><label>Jumlah</label><input readonly value="${rp(inv.payable)}"></div><div class="field full"><label>Referensi (no. transfer / bukti)</label><input name="ref"></div></div>
          <p class="muted" style="margin-bottom:0">Jurnal: Debit ${esc(accName('2-1100'))} / Kredit ${esc(accName('1-1100'))}</p>`,
        onConfirm: d => { Actions.payInvoice(inv.id, d); toast('Pembayaran diposting'); router(); } }),
    });
  }

  /* ---------- Journals ---------- */
  function viewJournals(path, q) {
    const type = q.get('type') || 'All';
    let list = db.journals;
    if (type !== 'All') list = list.filter(j => j.type === type);
    const tot = list.reduce((s, j) => s + journalTotals(j).debit, 0);
    shell(path, crumb('Keuangan', 'Jurnal'), `
      ${pageHead('Jurnal Umum', `${list.length} jurnal — total ${rp(tot)}`, `<button class="btn" id="export">${icon('download', 'sm')}Export CSV</button>`)}
      <div class="card">
        <div class="toolbar"><div class="tabs" id="tabs">${[['All', 'Semua'], ['Pembelian', 'Pembelian'], ['Pembayaran', 'Pembayaran']].map(([k, l]) => `<button data-s="${k}" class="${type === k ? 'active' : ''}">${l}</button>`).join('')}</div></div>
        <div class="table-wrap"><table><thead><tr><th>No Jurnal</th><th>Tanggal</th><th>Keterangan</th><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>
        ${list.map(j => j.lines.map((l, i) => `<tr ${j.invoiceId ? `class="clickable" data-href="#/invoices/${j.invoiceId}"` : ''}>
          ${i === 0 ? `<td rowspan="${j.lines.length}" class="strong" style="vertical-align:top">${esc(j.no)}<span class="sub">${esc(j.type)}</span></td><td rowspan="${j.lines.length}" style="vertical-align:top">${fdate(j.date)}</td><td rowspan="${j.lines.length}" style="vertical-align:top;max-width:280px">${esc(j.description)}<span class="sub">Ref: ${esc(j.ref)}</span></td>` : ''}
          <td style="${l.credit ? 'padding-left:34px' : ''}">${esc(accName(l.account))}</td><td class="num">${l.debit ? rp(l.debit) : ''}</td><td class="num">${l.credit ? rp(l.credit) : ''}</td></tr>`).join('')).join('') || `<tr><td colspan="6">${emptyState('Belum ada jurnal')}</td></tr>`}
        </tbody></table></div>
      </div>`);
    $$('#tabs button').forEach(b => b.onclick = () => { location.hash = `#/journals${b.dataset.s !== 'All' ? '?type=' + b.dataset.s : ''}`; });
    $('#export').onclick = () => csv('jurnal.csv', [['No Jurnal', 'Tanggal', 'Tipe', 'Keterangan', 'Referensi', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'],
      ...list.flatMap(j => j.lines.map(l => [j.no, j.date, j.type, j.description, j.ref, l.account, ACCOUNTS[l.account], l.debit, l.credit]))]);
  }

  /* ---------- Settings ---------- */
  function viewSettings(path) {
    const s = db.settings;
    const f = (name, label, full) => `<div class="field ${full ? 'full' : ''}"><label>${label}</label><input name="${name}" value="${esc(s[name] || '')}"></div>`;
    shell(path, crumb('Sistem', 'Pengaturan'), `
      ${pageHead('Pengaturan', 'Profil perusahaan, pengguna, dan data aplikasi.')}
      <form class="card" id="f" novalidate>
        <div class="card-head"><h3>Profil Perusahaan & Pengguna</h3></div>
        <div class="card-body form-grid">
          ${f('company', 'Nama Perusahaan')}${f('npwp', 'NPWP')}${f('address', 'Alamat', true)}${f('shipTo', 'Alamat Pengiriman Default', true)}
          ${f('userName', 'Nama Pengguna (Staff Procurement)')}${f('approverName', 'Nama Atasan / Approver')}
        </div>
        <div class="form-foot"><button class="btn primary" type="submit">${icon('check', 'sm')}Simpan</button></div>
      </form>
      <div class="card"><div class="card-head"><h3>Bagan Akun (Jurnal)</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama Akun</th></tr></thead><tbody>${Object.entries(ACCOUNTS).map(([k, v]) => `<tr><td class="mono">${k}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card"><div class="card-head"><h3>Data Aplikasi</h3></div>
        <div class="card-body stack">
          <p class="muted" style="margin:0">Data tersimpan di browser ini (localStorage). Gunakan backup untuk memindahkan data ke perangkat lain.</p>
          <div class="row-gap">
            <button class="btn" id="backup">${icon('download', 'sm')}Backup JSON</button>
            <label class="btn">${icon('upload', 'sm')}Restore JSON<input type="file" id="restore" accept="application/json" hidden></label>
            <button class="btn" id="demo">${icon('revise', 'sm')}Reset ke Data Demo</button>
            <button class="btn danger" id="wipe">${icon('trash', 'sm')}Hapus Semua Data</button>
          </div>
        </div>
      </div>`);
    $('#f').onsubmit = e => { e.preventDefault(); Object.assign(db.settings, formData(e.target)); Store.save(); toast('Pengaturan disimpan'); router(); };
    $('#backup').onclick = () => {
      const blob = new Blob([JSON.stringify(Store.db, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `procura-backup-${todayISO()}.json`; a.click();
    };
    $('#restore').onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then(t => { const d = JSON.parse(t); if (!d.vendors || !d.prs) throw new Error(); Store.replace(d); location.reload(); }).catch(() => toast('File backup tidak valid', 'error'));
    };
    $('#demo').onclick = () => modal({ title: 'Reset ke Data Demo', confirm: 'Reset', confirmClass: 'danger solid', body: '<p style="margin:0">Semua data saat ini akan diganti dengan data demo.</p>', onConfirm: () => { Store.reset(true); location.hash = '#/'; location.reload(); } });
    $('#wipe').onclick = () => modal({ title: 'Hapus Semua Data', confirm: 'Hapus Semua', confirmClass: 'danger solid', body: '<p style="margin:0">Semua PR, PO, vendor, tagihan, dan jurnal akan dihapus permanen dari browser ini.</p>', onConfirm: () => { Store.reset(false); location.hash = '#/'; location.reload(); } });
  }

  function notFound(path) {
    shell(path, crumb('Tidak ditemukan'), `<div class="card">${emptyState('Halaman atau data tidak ditemukan.', 'alert')}<div class="right" style="padding:0 18px 18px"><a class="btn primary" href="#/">Ke Dashboard</a></div></div>`);
  }

  /* ---------- Router ---------- */
  const routes = [
    [/^\/$/, (p, q) => viewDashboard(p, q)],
    [/^\/pr$/, (p, q) => viewPRList(p, q)],
    [/^\/pr\/new$/, p => viewPRForm(p)],
    [/^\/pr\/([\w-]+)\/edit$/, (p, q, m) => viewPRForm(p, m[1])],
    [/^\/pr\/([\w-]+)$/, (p, q, m) => viewPRDetail(p, m[1])],
    [/^\/po$/, (p, q) => viewPOList(p, q)],
    [/^\/po\/new$/, (p, q) => viewPOForm(p, null, q)],
    [/^\/po\/([\w-]+)\/edit$/, (p, q, m) => viewPOForm(p, m[1], q)],
    [/^\/po\/([\w-]+)$/, (p, q, m) => viewPODetail(p, m[1])],
    [/^\/vendor-portal\/([\w-]+)$/, (p, q, m) => viewVendorPortal(p, m[1])],
    [/^\/tracking$/, (p, q) => viewTracking(p, q)],
    [/^\/tracking\/([\w-]+)$/, (p, q, m) => viewTracking(p, q, m[1])],
    [/^\/vendors$/, (p, q) => viewVendors(p, q)],
    [/^\/vendors\/new$/, p => viewVendorForm(p)],
    [/^\/vendors\/([\w-]+)\/edit$/, (p, q, m) => viewVendorForm(p, m[1])],
    [/^\/invoices$/, (p, q) => viewInvoices(p, q)],
    [/^\/invoices\/new$/, (p, q) => viewInvoiceForm(p, q)],
    [/^\/invoices\/([\w-]+)$/, (p, q, m) => viewInvoiceDetail(p, m[1])],
    [/^\/journals$/, (p, q) => viewJournals(p, q)],
    [/^\/settings$/, p => viewSettings(p)],
  ];

  function router() {
    $('#modal-root').innerHTML = '';
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const q = new URLSearchParams(qs || '');
    for (const [re, fn] of routes) {
      const m = path.match(re);
      if (m) { fn(path, q, m); window.scrollTo(0, 0); return; }
    }
    notFound(path);
  }

  document.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button, input, select')) location.hash = tr.dataset.href;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal-root').innerHTML = ''; });
  window.addEventListener('hashchange', router);
  window.addEventListener('storage', e => { if (e.key === 'procura.pms.v1') { Store.load(); location.reload(); } });
  router();
})();
