import React from "react";
import { ShieldAlert, Wallet } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function ProtectedAdminRoute({ children }) {
  const { wallet, connectWallet } = useWeb3();

  if (!wallet.connected) {
    return (
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-8 text-center max-w-lg mx-auto my-8 space-y-4">
        <Wallet className="w-10 h-10 text-indigo-400 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-100">
          Administrator Authentication Required
        </h2>
        <p className="text-sm text-slate-400">
          Connect the Ganache deployer / administrator wallet in MetaMask to
          manage elections, candidates, voter whitelists, and the contract
          treasury.
        </p>
        <button
          type="button"
          onClick={connectWallet}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
        >
          Connect MetaMask
        </button>
      </div>
    );
  }

  if (!wallet.isAdmin) {
    return (
      <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-8 text-center max-w-lg mx-auto my-8 space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-semibold text-rose-200">
          Restricted Access — Administrator Only
        </h2>
        <p className="text-sm text-slate-300">
          Your connected wallet (<span className="font-mono">{wallet.account}</span>)
          does not match the <span className="font-mono">onlyAdmin</span>{" "}
          contract owner (<span className="font-mono">{wallet.adminAddress}</span>).
        </p>
        <p className="text-xs text-slate-400">
          Switch to Account #0 in MetaMask to perform administrative operations,
          or use the read-only forms below to test smart contract revert behavior.
        </p>
      </div>
    );
  }

  return children;
}
