import React from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import WalletConnect from "./WalletConnect";

export default function Navbar() {
  const { wallet, loading, refreshBlockchainData } = useWeb3();

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 tracking-tight">
              VoteChain 2.0
            </span>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Solidity ^0.8.20
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Decentralized, Transparent & Auditable Election Management System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {wallet.connected && (
          <button
            type="button"
            onClick={refreshBlockchainData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Sync state from Ganache Smart Contracts"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
            />
            <span className="hidden md:inline">Sync Chain</span>
          </button>
        )}
        <WalletConnect />
      </div>
    </header>
  );
}
