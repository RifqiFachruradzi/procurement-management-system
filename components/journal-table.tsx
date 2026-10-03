import { journalTotals } from '@/lib/calc';
import { accName } from '@/lib/constants';
import { rp } from '@/lib/format';
import type { JournalLine } from '@/lib/types';

export function JournalTable({ lines }: { lines: JournalLine[] }) {
  const t = journalTotals({ lines } as never);
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}><td className={l.credit ? 'pl-8' : ''}>{accName(l.account)}</td><td className="num">{l.debit ? rp(l.debit) : ''}</td><td className="num">{l.credit ? rp(l.credit) : ''}</td></tr>
          ))}
        </tbody>
        <tfoot><tr><td>Total {t.debit === t.credit ? <span className="font-normal text-ok">— seimbang</span> : <span className="text-bad">— tidak seimbang</span>}</td><td className="num">{rp(t.debit)}</td><td className="num">{rp(t.credit)}</td></tr></tfoot>
      </table>
    </div>
  );
}
