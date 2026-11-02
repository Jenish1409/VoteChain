import React from "react";
import { Wallet, Shield, Network } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function WalletConnect() {
  const { wallet, loading, connectWallet } = useWeb3();

  if (!wallet.connected) {
    return (
      <button
        type="button"
        onClick={connectWallet}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
      >
        <Wallet className="w-4 h-4" />
        {loading ? "Connecting..." : "Connect MetaMask"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
        <Network className="w-3.5 h-3.5 text-indigo-400" />
        <span>{wallet.networkName}</span>
        <span className="text-slate-500 font-mono">(#{wallet.chainId})</span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
        <span
          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${
            wallet.isAdmin
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          }`}
        >
          {wallet.isAdmin ? "ADMIN" : "VOTER"}
        </span>
        <span className="font-mono text-slate-200">
          {wallet.account.slice(0, 6)}...{wallet.account.slice(-4)}
        </span>
        <span className="hidden sm:inline text-slate-400 font-mono">
          ({Number(wallet.balanceEth).toFixed(2)} ETH)
        </span>
      </div>
    </div>
  );
}
