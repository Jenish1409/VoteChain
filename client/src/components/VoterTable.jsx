import React from "react";

export default function VoterTable({ voters = [], currentAccount = "" }) {
  if (!voters.length) {
    return (
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 text-center text-sm text-slate-400">
        No eligible voter wallet addresses registered for this election yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
            <th className="py-3 px-4">#</th>
            <th className="py-3 px-4">Eligible Wallet Address</th>
            <th className="py-3 px-4">Whitelist Status</th>
            <th className="py-3 px-4">Ballot Status</th>
            <th className="py-3 px-4">Timestamp Recorded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {voters.map((v, idx) => {
            const isSelf =
              currentAccount &&
              v.voterAddress.toLowerCase() === currentAccount.toLowerCase();
            return (
              <tr key={v.voterAddress} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono text-xs text-slate-400">
                  {idx + 1}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-200">
                  {v.voterAddress}
                  {isSelf && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                      YOU
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Whitelisted
                  </span>
                </td>
                <td className="py-3 px-4">
                  {v.hasVoted ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Vote Cast
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                      Not Voted Yet
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-400">
                  {v.votedAt > 0
                    ? new Date(v.votedAt * 1000).toLocaleString()
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
