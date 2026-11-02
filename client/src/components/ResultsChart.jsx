import React from "react";

export default function ResultsChart({
  candidates = [],
  totalVotes = 0,
  winningCandidateIds = [],
}) {
  if (!candidates.length) {
    return (
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 text-center text-sm text-slate-400">
        No candidate vote data available to chart.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">
          On-Chain Vote Distribution
        </h4>
        <span className="text-xs font-mono text-slate-400">
          Total Votes Cast: {totalVotes}
        </span>
      </div>

      <div className="space-y-3">
        {candidates.map((c) => {
          const pct =
            totalVotes > 0
              ? ((c.voteCount / totalVotes) * 100).toFixed(2)
              : "0.00";
          const isLeader = winningCandidateIds.includes(c.candidateId);

          return (
            <div key={c.candidateId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">{c.name}</span>
                  <span className="text-slate-400">({c.partyName})</span>
                  {isLeader && totalVotes > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                      TOP TALLY
                    </span>
                  )}
                </div>
                <span className="font-mono text-slate-200">
                  {c.voteCount} votes ({pct}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isLeader ? "bg-emerald-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
