import React from "react";
import { Link } from "react-router-dom";
import { Vote, Users, FileCheck2, Landmark } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import ElectionCard from "../components/ElectionCard";
import TransactionTable from "../components/TransactionTable";

export default function Dashboard() {
  const { wallet, elections, auditLogs, treasury } = useWeb3();

  const totalVotesCast = elections.reduce((acc, e) => acc + e.totalVotes, 0);
  const activeCount = elections.filter((e) => e.phase === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Platform Overview Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Live metrics fetched directly from ElectionManager.sol &
            AuditLogger.sol
          </p>
        </div>
        {wallet.isAdmin && (
          <Link
            to="/admin"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition self-start"
          >
            + Manage Elections & Voters
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Elections</span>
            <Vote className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {elections.length}
          </div>
          <div className="text-xs text-emerald-400 mt-1">
            {activeCount} currently active
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Votes Recorded</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {totalVotesCast}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Verified via VoterInfo structs
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Audit Trail Entries</span>
            <FileCheck2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {auditLogs.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Logged in AuditLogger.sol
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Contract Treasury</span>
            <Landmark className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {Number(treasury.balanceEth).toFixed(3)} ETH
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {treasury.transactions.length} treasury transfers
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200">
            Recent Elections
          </h2>
          <Link
            to="/elections"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            View All Elections →
          </Link>
        </div>
        {elections.length === 0 ? (
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-8 text-center text-sm text-slate-400">
            No elections found on-chain. Connect your MetaMask administrator
            wallet and open the Admin Console to create an election.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {elections.slice(0, 3).map((e) => (
              <ElectionCard key={e.electionId} election={e} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200">
            Latest On-Chain Audit Events
          </h2>
          <Link
            to="/audit"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Full Audit Log →
          </Link>
        </div>
        <TransactionTable records={auditLogs.slice(0, 5)} mode="audit" />
      </section>
    </div>
  );
}
