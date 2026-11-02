import React from "react";
import { UserCheck, Award } from "lucide-react";

export default function CandidateCard({
  candidate,
  totalVotes,
  canVote,
  isSelected,
  onSelect,
  isWinner,
}) {
  const share =
    totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : 0;

  return (
    <div
      className={`rounded-xl p-5 border transition flex flex-col justify-between ${
        isSelected
          ? "bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Candidate #{candidate.candidateId}
          </span>
          {isWinner && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Award className="w-3.5 h-3.5" />
              Leading / Winner
            </span>
          )}
        </div>

        <h4 className="text-base font-semibold text-slate-100">
          {candidate.name}
        </h4>
        <p className="text-xs font-medium text-indigo-400 mb-2">
          {candidate.partyName}
        </p>
        <p className="text-xs text-slate-400 mb-4">{candidate.description}</p>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">On-Chain Votes</span>
            <span className="font-mono font-semibold text-slate-200">
              {candidate.voteCount} ({share}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${share}%` }}
            />
          </div>
        </div>

        {canVote && (
          <button
            type="button"
            onClick={() => onSelect(candidate)}
            className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
              isSelected
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {isSelected ? "Selected for Ballot" : "Select Candidate"}
          </button>
        )}
      </div>
    </div>
  );
}
