import React from "react";

export default function CandidateTable({ candidates = [], totalVotes = 0 }) {
  if (!candidates.length) {
    return (
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 text-center text-sm text-slate-400">
        No candidates registered in smart contract for this election yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
            <th className="py-3 px-4">ID</th>
            <th className="py-3 px-4">Candidate Name</th>
            <th className="py-3 px-4">Party / Affiliation</th>
            <th className="py-3 px-4">Manifesto Summary</th>
            <th className="py-3 px-4 text-right">Votes</th>
            <th className="py-3 px-4 text-right">Vote Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {candidates.map((c) => {
            const pct =
              totalVotes > 0
                ? ((c.voteCount / totalVotes) * 100).toFixed(2)
                : "0.00";
            return (
              <tr key={c.candidateId} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono text-xs text-slate-400">
                  #{c.candidateId}
                </td>
                <td className="py-3 px-4 font-medium text-slate-100">
                  {c.name}
                </td>
                <td className="py-3 px-4 text-indigo-300">{c.partyName}</td>
                <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                  {c.description}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                  {c.voteCount}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-emerald-400">
                  {pct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
