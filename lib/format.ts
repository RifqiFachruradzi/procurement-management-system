export const nowISO = () => new Date().toISOString();
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const addDays = (d: string, n: number) => {
  const x = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  x.setDate(x.getDate() + Number(n || 0));
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const round = (n: unknown) => Math.round(Number(n) || 0);

const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
export const rp = (n: number) => 'Rp ' + idr.format(Math.round(n || 0));
export const num = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0);
const parse = (d: string) => new Date(d.length === 10 ? d + 'T00:00:00' : d);
export const fdate = (d?: string | null) =>
  d ? parse(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
export const fdt = (d?: string | null) =>
  d ? parse(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function words(n: number): string {
  n = Math.floor(n);
  const join = (a: string, rest: number) => (rest ? `${a} ${words(rest)}` : a);
  if (n < 12) return ONES[n];
  if (n < 20) return `${words(n - 10)} belas`;
  if (n < 100) return join(`${words(n / 10)} puluh`, n % 10);
  if (n < 200) return join('seratus', n - 100);
  if (n < 1000) return join(`${words(n / 100)} ratus`, n % 100);
  if (n < 2000) return join('seribu', n - 1000);
  if (n < 1e6) return join(`${words(n / 1000)} ribu`, n % 1000);
  if (n < 1e9) return join(`${words(n / 1e6)} juta`, n % 1e6);
  if (n < 1e12) return join(`${words(n / 1e9)} miliar`, n % 1e9);
  return join(`${words(n / 1e12)} triliun`, n % 1e12);
}
/** Amount in Indonesian words, e.g. 1250000 -> "Satu juta dua ratus lima puluh ribu rupiah". */
export const terbilang = (n: number) => {
  const w = Math.round(n) === 0 ? 'nol' : words(Math.round(n));
  return w.charAt(0).toUpperCase() + w.slice(1) + ' rupiah';
};

export const initials = (s: string) =>
  String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function downloadCSV(filename: string, rows: (string | number | undefined | null)[][]) {
  const text = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(filename, new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
}
export function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
