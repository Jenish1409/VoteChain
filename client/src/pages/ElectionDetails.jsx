import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import {
  fetchElectionDetailsBundle,
  parseBlockchainError,
} from "../services/blockchain";
import CandidateTable from "../components/CandidateTable";
import VoterTable from "../components/VoterTable";
import ResultsChart from "../components/ResultsChart";

export default function ElectionDetails() {
  const { id } = useParams();
  const electionId = Number(id) || 1;
  const { wallet, notify } = useWeb3();
  const [bundle, setBundle] = useState(null);
  const [loadingLocal, setLoadingLocal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!wallet.connected) return;
      try {
        setLoadingLocal(true);
        const data = await fetchElectionDetailsBundle(
          electionId,
          wallet.account
        );
        if (mounted) setBundle(data);
      } catch (err) {
        notify("error", "Failed to Load Election", parseBlockchainError(err));
      } finally {
        if (mounted) setLoadingLocal(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [electionId, wallet.connected, wallet.account, notify]);

  if (!wallet.connected) {
    return (
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-8 text-center text-sm text-slate-400">
        Connect MetaMask to inspect Election #{electionId} state from Ganache.
      </div>
    );
  }

  if (loadingLocal || !bundle) {
    return (
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-8 text-center text-sm text-slate-400">
        Fetching Election #{electionId} structs and mappings from smart
        contract...
      </div>
    );
  }

  const { election, candidates, voters, resultsSummary, currentVoterInfo } =
    bundle;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono text-indigo-400">
            Election ID #{election.electionId} • Phase: {election.phase}
          </span>
          <div className="flex items-center gap-2">
            <Link
              to={`/voting?electionId=${election.electionId}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Go to Voting Booth
            </Link>
            <Link
              to={`/results?electionId=${election.electionId}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Full Results View
            </Link>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-100">{election.title}</h1>
        <p className="text-sm text-slate-300">{election.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Your Wallet Eligibility</span>
            <span className="font-mono font-semibold text-slate-200">
              {currentVoterInfo.isRegistered ? "Whitelisted" : "Not Registered"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Your Ballot Status</span>
            <span className="font-mono font-semibold text-indigo-400">
              {currentVoterInfo.hasVoted
                ? `Voted (Candidate #${currentVoterInfo.votedCandidateId})`
                : "Not Cast"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Registered Voters</span>
            <span className="font-mono font-semibold text-slate-200">
              {election.registeredVoters}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Voter Turnout</span>
            <span className="font-mono font-semibold text-emerald-400">
              {resultsSummary.turnoutPercentage}% ({election.totalVotes} votes)
            </span>
          </div>
        </div>
      </div>

      <ResultsChart
        candidates={candidates}
        totalVotes={election.totalVotes}
        winningCandidateIds={resultsSummary.winningCandidateIds}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-200">
          Registered Candidates Table (Solidity Struct Array)
        </h2>
        <CandidateTable
          candidates={candidates}
          totalVotes={election.totalVotes}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-200">
          Whitelisted Voter Wallets Table (Solidity Struct Array)
        </h2>
        <VoterTable voters={voters} currentAccount={wallet.account} />
      </section>
    </div>
  );
}
