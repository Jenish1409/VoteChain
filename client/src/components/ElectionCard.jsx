import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, CheckSquare, ArrowRight } from "lucide-react";

const phaseStyles = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  UPCOMING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  PAUSED: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  ENDED: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  CLOSED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function ElectionCard({ election }) {
  const badgeStyle = phaseStyles[election.phase] || phaseStyles.ENDED;

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono text-slate-400">
            Election #{election.electionId}
          </span>
          <span
            className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
          >
            {election.phase}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-slate-100 mb-1.5">
          {election.title}
        </h3>
        <p className="text-sm text-slate-400 line-clamp-2 mb-4">
          {election.description}
        </p>

        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs mb-4">
          <div>
            <span className="text-slate-500 block">Candidates</span>
            <span className="font-mono font-semibold text-slate-200">
              {election.candidateCount}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Voters</span>
            <span className="font-mono font-semibold text-slate-200">
              {election.registeredVoters}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Turnout</span>
            <span className="font-mono font-semibold text-indigo-400">
              {election.turnoutPercent}% ({election.totalVotes})
            </span>
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-400 mb-5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Starts: {new Date(election.startTime * 1000).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Ends: {new Date(election.endTime * 1000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
        <Link
          to={`/elections/${election.electionId}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          Details & Audit
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {election.phase === "ACTIVE" && (
          <Link
            to={`/voting?electionId=${election.electionId}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Cast Vote
          </Link>
        )}
      </div>
    </div>
  );
}
