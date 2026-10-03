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
