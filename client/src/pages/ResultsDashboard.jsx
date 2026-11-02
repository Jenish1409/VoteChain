import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, Scale } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { fetchElectionDetailsBundle } from "../services/blockchain";
import ResultsChart from "../components/ResultsChart";
import CandidateTable from "../components/CandidateTable";

export default function ResultsDashboard() {
  const [searchParams] = useSearchParams();
  const initialId = Number(searchParams.get("electionId")) || 1;
  const { wallet, elections } = useWeb3();

  const [selectedElectionId, setSelectedElectionId] = useState(initialId);
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    if (elections.length > 0 && !elections.some((e) => e.electionId === selectedElectionId)) {
      setSelectedElectionId(elections[0].electionId);
    }
  }, [elections, selectedElectionId]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!wallet.connected || !selectedElectionId) return;
      try {
        const b = await fetchElectionDetailsBundle(
          selectedElectionId,
          wallet.account
        );
        if (active) setBundle(b);
      } catch {
        if (active) setBundle(null);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [wallet.connected, wallet.account, selectedElectionId]);

  const winningCandidates = bundle
    ? bundle.candidates.filter((c) =>
        bundle.resultsSummary.winningCandidateIds.includes(c.candidateId)
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Election Results & Turnout Analytics
          </h1>
          <p className="text-xs text-slate-400">
            Calculated deterministically on-chain via{" "}
            <span className="font-mono">getElectionResultsSummary</span> &{" "}
            <span className="font-mono">calculateTurnoutBasisPoints</span>
          </p>
        </div>

        {elections.length > 0 && (
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
          >
            {elections.map((e) => (
              <option key={e.electionId} value={e.electionId}>
                Election #{e.electionId}: {e.title} ({e.phase})
              </option>
            ))}
          </select>
        )}
      </div>

      {bundle && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 block">
                Election Status
              </span>
              <span className="text-lg font-mono font-bold text-indigo-400">
                {bundle.election.phase}
              </span>
            </div>
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 block">
                Registered Voters
              </span>
              <span className="text-lg font-mono font-bold text-slate-100">
                {bundle.election.registeredVoters}
              </span>
            </div>
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 block">
                Total Votes Cast
              </span>
              <span className="text-lg font-mono font-bold text-slate-100">
                {bundle.election.totalVotes}
              </span>
            </div>
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 block">
                Turnout Percentage
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {bundle.resultsSummary.turnoutPercentage}%
              </span>
            </div>
          </div>

          {!bundle.resultsSummary.hasVotes ? (
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6 text-center text-sm text-slate-400">
              No votes have been cast in this election yet.
            </div>
          ) : bundle.resultsSummary.isTie ? (
            <div className="rounded-xl bg-amber-950/30 border border-amber-500/40 p-5 flex items-start gap-3">
              <Scale className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-200">
                  On-Chain Tie Detected ({bundle.resultsSummary.winningVoteCount}{" "}
                  Votes Each)
                </h3>
                <p className="text-xs text-slate-300">
                  Tied Top Candidates:{" "}
                  {winningCandidates
                    .map((c) => `${c.name} (${c.partyName})`)
                    .join(" • ")}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-5 flex items-start gap-3">
              <Award className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-200">
                  {bundle.election.phase === "ENDED" ||
                  bundle.election.phase === "CLOSED"
                    ? "Confirmed Election Winner"
                    : "Current Leading Candidate"}
                </h3>
                {winningCandidates[0] && (
                  <p className="text-xs text-slate-200">
                    <span className="font-semibold">
                      {winningCandidates[0].name}
                    </span>{" "}
                    ({winningCandidates[0].partyName}) —{" "}
                    <span className="font-mono">
                      {bundle.resultsSummary.winningVoteCount} votes
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          <ResultsChart
            candidates={bundle.candidates}
            totalVotes={bundle.election.totalVotes}
            winningCandidateIds={bundle.resultsSummary.winningCandidateIds}
          />

          <CandidateTable
            candidates={bundle.candidates}
            totalVotes={bundle.election.totalVotes}
          />
        </>
      )}
    </div>
  );
}
