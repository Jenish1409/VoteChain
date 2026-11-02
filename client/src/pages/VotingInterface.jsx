import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import {
  fetchElectionDetailsBundle,
  txCastVote,
  parseBlockchainError,
} from "../services/blockchain";
import CandidateCard from "../components/CandidateCard";
import ConfirmationModal from "../components/ConfirmationModal";

export default function VotingInterface() {
  const [searchParams] = useSearchParams();
  const initialId = Number(searchParams.get("electionId")) || 1;

  const {
    wallet,
    elections,
    notify,
    refreshBlockchainData,
    recordTransactionReceipt,
  } = useWeb3();

  const [selectedElectionId, setSelectedElectionId] = useState(initialId);
  const [bundle, setBundle] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState("");

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
        if (active) {
          setBundle(b);
          setSelectedCandidate(null);
        }
      } catch {
        if (active) setBundle(null);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [wallet.connected, wallet.account, selectedElectionId]);

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;
    try {
      setSubmitting(true);
      const receipt = await txCastVote(
        selectedElectionId,
        selectedCandidate.candidateId
      );
      setLastTxHash(receipt.hash);
      recordTransactionReceipt(
        `Vote Cast in Election #${selectedElectionId}`,
        receipt
      );
      notify(
        "success",
        "Ballot Recorded On-Chain",
        `Successfully cast vote for ${selectedCandidate.name}.`,
        receipt.hash
      );
      setConfirmOpen(false);
      await refreshBlockchainData();
      const updated = await fetchElectionDetailsBundle(
        selectedElectionId,
        wallet.account
      );
      setBundle(updated);
    } catch (err) {
      notify("error", "Vote Transaction Reverted", parseBlockchainError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Secure Web3 Voting Booth
          </h1>
          <p className="text-xs text-slate-400">
            Authenticate with MetaMask and cast a single verifiable ballot per
            election
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
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-indigo-400">
                Election #{bundle.election.electionId} • Phase:{" "}
                {bundle.election.phase}
              </div>
              <h2 className="text-lg font-semibold text-slate-100">
                {bundle.election.title}
              </h2>
              <p className="text-xs text-slate-400">
                Connected Voter Wallet:{" "}
                <span className="font-mono text-slate-200">
                  {wallet.account}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {bundle.currentVoterInfo.hasVoted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Ballot Already Cast (Candidate #
                  {bundle.currentVoterInfo.votedCandidateId})
                </span>
              ) : bundle.currentVoterInfo.isRegistered ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Eligible & Whitelisted to Vote
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  Wallet Not Whitelisted for This Election
                </span>
              )}
            </div>
          </div>

          {lastTxHash && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-4 text-xs font-mono text-emerald-200">
              Latest Ballot Transaction Confirmed — Tx Hash: {lastTxHash}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundle.candidates.map((cand) => (
              <CandidateCard
                key={cand.candidateId}
                candidate={cand}
                totalVotes={bundle.election.totalVotes}
                canVote={
                  bundle.election.phase === "ACTIVE" &&
                  bundle.currentVoterInfo.isRegistered &&
                  !bundle.currentVoterInfo.hasVoted
                }
                isSelected={
                  selectedCandidate?.candidateId === cand.candidateId
                }
                onSelect={(c) => setSelectedCandidate(c)}
                isWinner={bundle.resultsSummary.winningCandidateIds.includes(
                  cand.candidateId
                )}
              />
            ))}
          </div>

          {selectedCandidate && (
            <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/50 p-5 flex items-center justify-between">
              <div className="text-xs space-y-0.5">
                <div className="text-slate-400">Selected Ballot Choice</div>
                <div className="text-sm font-semibold text-slate-100">
                  #{selectedCandidate.candidateId} — {selectedCandidate.name} (
                  {selectedCandidate.partyName})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                Sign & Submit Vote in MetaMask
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        open={confirmOpen}
        title="Confirm On-Chain Ballot Submission"
        description={
          selectedCandidate
            ? `You are casting your irreversible ballot for ${selectedCandidate.name} (${selectedCandidate.partyName}) in "${bundle?.election?.title}". Once mined, your wallet cannot vote again in this election.`
            : ""
        }
        confirmLabel="Cast Ballot Now"
        onConfirm={handleConfirmVote}
        onCancel={() => setConfirmOpen(false)}
        busy={submitting}
      />
    </div>
  );
}
