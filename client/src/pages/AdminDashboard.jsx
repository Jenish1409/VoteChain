import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import {
  txCreateElection,
  txRegisterCandidate,
  txRegisterVoter,
  txRegisterVotersBatch,
  txSetElectionActiveStatus,
  txCloseElection,
  parseBlockchainError,
} from "../services/blockchain";
import ProtectedAdminRoute from "../components/ProtectedAdminRoute";

export default function AdminDashboard() {
  const {
    elections,
    notify,
    refreshBlockchainData,
    recordTransactionReceipt,
  } = useWeb3();

  // 1. Create Election state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startOffsetMin, setStartOffsetMin] = useState("2");
  const [durationMin, setDurationMin] = useState("60");

  // 2. Register Candidate state
  const [candElectionId, setCandElectionId] = useState(1);
  const [candName, setCandName] = useState("");
  const [candParty, setCandParty] = useState("");
  const [candBio, setCandBio] = useState("");

  // 3. Register Voter state
  const [voterElectionId, setVoterElectionId] = useState(1);
  const [singleVoterAddr, setSingleVoterAddr] = useState("");
  const [batchVoterText, setBatchVoterText] = useState("");

  const handleCreateElection = async (e) => {
    e.preventDefault();
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const startSec = nowSec + Number(startOffsetMin) * 60;
      const endSec = startSec + Number(durationMin) * 60;
      const receipt = await txCreateElection(
        title,
        description,
        startSec,
        endSec
      );
      recordTransactionReceipt(`Created Election "${title}"`, receipt);
      notify(
        "success",
        "Election Created",
        `Election "${title}" written to ElectionManager.sol & AuditLogger.sol.`,
        receipt.hash
      );
      setTitle("");
      setDescription("");
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Create Election Failed", parseBlockchainError(err));
    }
  };

  const handleRegisterCandidate = async (e) => {
    e.preventDefault();
    try {
      const receipt = await txRegisterCandidate(
        candElectionId,
        candName,
        candParty,
        candBio
      );
      recordTransactionReceipt(`Registered Candidate ${candName}`, receipt);
      notify(
        "success",
        "Candidate Registered",
        `${candName} (${candParty}) added to Election #${candElectionId}.`,
        receipt.hash
      );
      setCandName("");
      setCandParty("");
      setCandBio("");
      await refreshBlockchainData();
    } catch (err) {
      notify(
        "error",
        "Candidate Registration Reverted",
        parseBlockchainError(err)
      );
    }
  };

  const handleRegisterSingleVoter = async (e) => {
    e.preventDefault();
    try {
      const receipt = await txRegisterVoter(voterElectionId, singleVoterAddr);
      recordTransactionReceipt(`Whitelisted Voter ${singleVoterAddr}`, receipt);
      notify(
        "success",
        "Voter Whitelisted",
        `Wallet ${singleVoterAddr} registered for Election #${voterElectionId}.`,
        receipt.hash
      );
      setSingleVoterAddr("");
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Voter Registration Failed", parseBlockchainError(err));
    }
  };

  const handleRegisterBatch = async (e) => {
    e.preventDefault();
    try {
      const list = batchVoterText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const receipt = await txRegisterVotersBatch(voterElectionId, list);
      recordTransactionReceipt(
        `Batch Whitelisted ${list.length} Voters`,
        receipt
      );
      notify(
        "success",
        "Batch Voter Registration Complete",
        `Whitelisted ${list.length} wallets for Election #${voterElectionId}.`,
        receipt.hash
      );
      setBatchVoterText("");
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Batch Registration Failed", parseBlockchainError(err));
    }
  };

  const handleToggleActive = async (electionId, nextActive) => {
    try {
      const receipt = await txSetElectionActiveStatus(electionId, nextActive);
      recordTransactionReceipt(
        `Election #${electionId} Active=${nextActive}`,
        receipt
      );
      notify(
        "success",
        "Election Status Updated",
        `Election #${electionId} isActive set to ${nextActive}.`,
        receipt.hash
      );
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Status Update Failed", parseBlockchainError(err));
    }
  };

  const handleCloseElection = async (electionId) => {
    try {
      const receipt = await txCloseElection(electionId);
      recordTransactionReceipt(`Closed Election #${electionId}`, receipt);
      notify(
        "success",
        "Election Closed Permanently",
        `Election #${electionId} has been finalized on-chain.`,
        receipt.hash
      );
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Close Election Failed", parseBlockchainError(err));
    }
  };

  return (
    <ProtectedAdminRoute>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Election Administrator Console
          </h1>
          <p className="text-xs text-slate-400">
            Protected by <span className="font-mono">onlyAdmin</span> modifier in
            ElectionManager.sol
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Create Election Form */}
          <form
            onSubmit={handleCreateElection}
            className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-slate-100">
              1. Create New Election
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Election Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., University Student Council Election 2026"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Purpose and eligibility rules for this election..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Starts In (Minutes from now)
                </label>
                <input
                  type="number"
                  value={startOffsetMin}
                  onChange={(e) => setStartOffsetMin(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Voting Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Deploy Election to Smart Contract
            </button>
          </form>

          {/* 2. Register Candidate Form */}
          <form
            onSubmit={handleRegisterCandidate}
            className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-slate-100">
              2. Register Candidate (Locked Once Voting Starts)
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Target Election ID
              </label>
              <input
                type="number"
                min="1"
                required
                value={candElectionId}
                onChange={(e) => setCandElectionId(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Candidate Full Name
                </label>
                <input
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="e.g., Aarav Mehta"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Party / Slate Name
                </label>
                <input
                  type="text"
                  required
                  value={candParty}
                  onChange={(e) => setCandParty(e.target.value)}
                  placeholder="e.g., Student Progress Front"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Manifesto / Candidate Description
              </label>
              <input
                type="text"
                required
                value={candBio}
                onChange={(e) => setCandBio(e.target.value)}
                placeholder="Key manifesto points..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              Register Candidate On-Chain
            </button>
          </form>
        </div>

        {/* 3. Voter Whitelisting */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleRegisterSingleVoter}
            className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-slate-100">
              3A. Whitelist Single Voter Wallet
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Target Election ID
              </label>
              <input
                type="number"
                min="1"
                required
                value={voterElectionId}
                onChange={(e) => setVoterElectionId(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Voter Ethereum Wallet Address (0x...)
              </label>
              <input
                type="text"
                required
                value={singleVoterAddr}
                onChange={(e) => setSingleVoterAddr(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Whitelist Voter Wallet
            </button>
          </form>

          <form
            onSubmit={handleRegisterBatch}
            className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-slate-100">
              3B. Batch Whitelist Voter Wallets
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Comma or Newline Separated Ganache Wallet Addresses
              </label>
              <textarea
                rows={4}
                required
                value={batchVoterText}
                onChange={(e) => setBatchVoterText(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8&#10;0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 transition"
            >
              Execute Batch Voter Whitelist
            </button>
          </form>
        </div>

        {/* 4. Lifecycle Controls */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-100">
            4. Election Lifecycle Controls (Pause / Resume / Finalize)
          </h2>
          {elections.length === 0 ? (
            <p className="text-xs text-slate-400">No elections created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Phase</th>
                    <th className="py-2.5 px-3">Candidates</th>
                    <th className="py-2.5 px-3">Voters</th>
                    <th className="py-2.5 px-3">Votes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {elections.map((e) => (
                    <tr key={e.electionId}>
                      <td className="py-2.5 px-3 font-mono">#{e.electionId}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {e.title}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{e.phase}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {e.candidateCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {e.registeredVoters}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{e.totalVotes}</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        {!e.isClosed && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleActive(e.electionId, !e.isActive)
                              }
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                              {e.isActive ? "Pause" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCloseElection(e.electionId)}
                              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30"
                            >
                              Close Permanently
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedAdminRoute>
  );
}
