import React from "react";

export default function TransactionTable({
  records = [],
  mode = "audit", // "audit" | "treasury"
}) {
  if (!records.length) {
    return (
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 text-center text-sm text-slate-400">
        No on-chain records found.
      </div>
    );
  }

  if (mode === "treasury") {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <th className="py-3 px-4">Tx ID</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Counterparty EOA</th>
              <th className="py-3 px-4">Purpose / Memo</th>
              <th className="py-3 px-4 text-right">Amount (ETH)</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {records.map((tx) => (
              <tr key={tx.txId} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono text-xs text-slate-400">
                  #{tx.txId}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                      tx.txType === "DEPOSIT"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {tx.txType}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-200">
                  {tx.counterparty}
                </td>
                <td className="py-3 px-4 text-slate-300">{tx.purpose}</td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-slate-100">
                  {tx.amountEth} ETH
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                  {new Date(tx.timestamp * 1000).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
            <th className="py-3 px-4">Audit ID</th>
            <th className="py-3 px-4">Election ID</th>
            <th className="py-3 px-4">Action Event</th>
            <th className="py-3 px-4">Initiator Wallet</th>
            <th className="py-3 px-4">Audit Details</th>
            <th className="py-3 px-4 text-right">Block Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {records.map((r) => (
            <tr key={r.auditId} className="hover:bg-slate-800/40">
              <td className="py-3 px-4 font-mono text-xs text-slate-400">
                #{r.auditId}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-slate-300">
                {r.electionId === 0 ? "Global / Treasury" : `#${r.electionId}`}
              </td>
              <td className="py-3 px-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {r.actionType}
                </span>
              </td>
              <td className="py-3 px-4 font-mono text-xs text-slate-300">
                {r.actor}
              </td>
              <td className="py-3 px-4 text-slate-300">{r.details}</td>
              <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                {new Date(r.timestamp * 1000).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
