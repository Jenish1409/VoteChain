import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import TransactionTable from "../components/TransactionTable";

export default function AuditHistory() {
  const { auditLogs, recentReceipts } = useWeb3();
  const [actionFilter, setActionFilter] = useState("ALL");

  const actionTypes = [
    "ALL",
    ...Array.from(new Set(auditLogs.map((a) => a.actionType))),
  ];

  const filtered =
    actionFilter === "ALL"
      ? auditLogs
      : auditLogs.filter((a) => a.actionType === actionFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Immutable Blockchain Audit Trail (AuditLogger.sol)
          </h1>
          <p className="text-xs text-slate-400">
            Every record below was written via an authorized contract-to-contract
            call from <span className="font-mono">ElectionManager.sol</span> to{" "}
            <span className="font-mono">AuditLogger.sol</span>
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
        >
          {actionTypes.map((t) => (
            <option key={t} value={t}>
              Filter: {t}
            </option>
          ))}
        </select>
      </div>

      {recentReceipts.length > 0 && (
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Session Transaction Hashes (Mined on Ganache)
          </h3>
          <div className="space-y-1.5 text-xs font-mono">
            {recentReceipts.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-slate-950 border border-slate-800"
              >
                <span className="text-slate-200">{r.label}</span>
                <span className="text-emerald-400">
                  Block #{r.blockNumber} • Tx: {r.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransactionTable records={filtered} mode="audit" />
    </div>
  );
}
