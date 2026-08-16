'use client';

import { computeBreakdowns } from '../lib/breakdowns';

function BarRow({ label, count, pnl, maxAbs }) {
  const pct = maxAbs ? Math.min(100, (Math.abs(pnl) / maxAbs) * 100) : 0;
  const isPos = pnl >= 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-20 text-xs text-gray-500 flex-shrink-0">
        {label} <span className="text-gray-300">{count}</span>
      </div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPos ? 'bg-green-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`w-16 text-right text-xs font-medium ${isPos ? 'text-green-600' : 'text-red-500'}`}>
        {isPos ? '+' : ''}
        {pnl.toFixed(2)}
      </div>
    </div>
  );
}

function ReportCard({ title, rows }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet</p>
      ) : (
        rows.map((r) => <BarRow key={r.label} {...r} maxAbs={maxAbs} />)
      )}
    </div>
  );
}

export default function BreakdownReports({ trades }) {
  const b = computeBreakdowns(trades);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ReportCard title="By direction" rows={b.byDirection} />
      <ReportCard title="By weekday" rows={b.byWeekday} />
      <ReportCard title="By session" rows={b.bySession} />
      <ReportCard title="By entry time" rows={b.byEntryTime} />
      <ReportCard title="By holding time" rows={b.byHoldingTime} />
      <ReportCard title="By outcome" rows={b.byOutcome} />
      <ReportCard title="By trades per day" rows={b.byTradesPerDay} />
    </div>
  );
}
