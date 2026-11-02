import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  FileSearch,
  Landmark,
  ArrowRight,
  Info,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function Home() {
  const { wallet, connectWallet } = useWeb3();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 p-8 md:p-10">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Solidity ^0.8.20 • Truffle • Ganache • Ethers.js v6
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight">
            VoteChain 2.0 — Decentralized, Transparent & Auditable Election
            Management
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            VoteChain 2.0 enforces election rules, candidate registration locks,
            single-ballot voter whitelists, and real-time contract-to-contract
            audit trails directly on the Ethereum Virtual Machine.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!wallet.connected ? (
              <button
                type="button"
                onClick={connectWallet}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                Connect MetaMask Wallet
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                Open Live Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              to="/audit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Inspect On-Chain Audit Trail
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Tamper-Evident Smart Contracts
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Candidate lists lock automatically once voting starts. Every state
            transition is validated by Solidity modifiers and require guards.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <Lock className="w-6 h-6 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            One-Wallet-One-Vote per Election
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nested mappings verify wallet whitelisting in O(1) gas, preventing
            duplicate votes while allowing participation across separate
            elections.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <FileSearch className="w-6 h-6 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Contract-to-Contract AuditLogger
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            ElectionManager invokes AuditLogger.sol atomically on every action,
            rejecting direct unauthorized calls from external accounts.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <Landmark className="w-6 h-6 text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Contract-to-Account Ether Treasury
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Includes a dedicated administrative test-Ether treasury with
            reentrancy-protected EOA withdrawals, separate from free voting.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-amber-300">
            Academic Prototype Scope & Wallet Eligibility Disclaimer
          </div>
          <p>
            VoteChain 2.0 demonstrates wallet-level cryptographic authorization
            on a local Ganache EVM network. An Ethereum wallet address proves
            possession of a private key rather than real-world civil identity,
            and public blockchain transactions are pseudonymous rather than
            zero-knowledge anonymous.
          </p>
        </div>
      </div>
    </div>
  );
}
