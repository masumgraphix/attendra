import React, { useEffect, useState } from 'react';
import { Printer, X, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { fmtDate, taka, METHOD_LABEL } from './shared';

type ReceiptData = Awaited<ReturnType<typeof api.platformPayment>>;

/** Printable payment receipt. "Print / Save as PDF" uses the browser's print dialog. */
export const ReceiptView: React.FC<{ paymentId: string; onClose: () => void }> = ({ paymentId, onClose }) => {
  const [r, setR] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.platformPayment(paymentId).then(setR).catch((e) => setError(e.message));
  }, [paymentId]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4 print:bg-white print:p-0 print:static">
      <style>{`@media print { body * { visibility: hidden; } #attendra-receipt, #attendra-receipt * { visibility: visible; } #attendra-receipt { position: absolute; inset: 0; margin: 0 auto; box-shadow: none; } .no-print { display: none !important; } }`}</style>
      <div className="w-full max-w-lg space-y-3">
        <div className="flex justify-end gap-2 no-print">
          <button onClick={() => window.print()} disabled={!r} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold cursor-pointer">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
          <button onClick={onClose} className="p-2 rounded-xl bg-white text-slate-700 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div id="attendra-receipt" className="bg-white rounded-3xl p-8 shadow-xl text-slate-900">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!r && !error && <p className="text-sm text-slate-500">Loading…</p>}
          {r && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-fuchsia-600 text-white flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-lg leading-tight">Attendra</p>
                    <p className="text-[11px] text-slate-500">Attendance &amp; HR software</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment receipt</p>
                  <p className="font-mono font-bold">#{String(r.receiptNo).padStart(5, '0')}</p>
                  <p className="text-xs text-slate-500">{fmtDate(r.paidAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Received from</p>
                <p className="font-bold">{r.companyName}</p>
                {r.owner && <p className="text-sm text-slate-600">{r.owner.name} · {r.owner.email}</p>}
                {r.companyPhone && <p className="text-sm text-slate-600">{r.companyPhone}</p>}
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3">
                      <p className="font-semibold">Attendra {r.planName} plan — {r.months} month{r.months > 1 ? 's' : ''}</p>
                      <p className="text-xs text-slate-500">{fmtDate(r.periodFrom)} – {fmtDate(r.periodTo)}</p>
                    </td>
                    <td className="py-3 text-right font-semibold">{taka(r.amountBdt)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-3 font-black">Total paid</td>
                    <td className="pt-3 text-right font-black text-lg">{taka(r.amountBdt)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-2xl p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Method</p>
                  <p className="font-semibold">{METHOD_LABEL[r.method] || r.method}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transaction ID</p>
                  <p className="font-mono font-semibold">{r.trxId || '—'}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center">Thank you for choosing Attendra. This receipt was generated electronically and needs no signature.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
