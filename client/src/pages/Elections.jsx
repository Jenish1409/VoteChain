import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import ElectionCard from "../components/ElectionCard";

const FILTERS = ["ALL", "ACTIVE", "UPCOMING", "PAUSED", "ENDED", "CLOSED"];

export default function Elections() {
  const { elections } = useWeb3();
  const [phaseFilter, setPhaseFilter] = useState("ALL");

  const filtered =
    phaseFilter === "ALL"
      ? elections
      : elections.filter((e) => e.phase === phaseFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            On-Chain Elections Directory
          </h1>
          <p className="text-xs text-slate-400">
            Browse all elections managed by ElectionManager.sol
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPhaseFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                phaseFilter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-8 text-center text-sm text-slate-400">
          No elections match the filter <span className="font-mono">{phaseFilter}</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((election) => (
            <ElectionCard key={election.electionId} election={election} />
          ))}
        </div>
      )}
    </div>
  );
}
