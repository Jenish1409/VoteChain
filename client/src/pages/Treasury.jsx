import React, { useState } from "react";
import { Landmark, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import {
  txDepositTreasury,
  txWithdrawTreasury,
  parseBlockchainError,
} from "../services/blockchain";
import TransactionTable from "../components/TransactionTable";

export default function Treasury() {
  const {
    wallet,
    treasury,
    notify,
    refreshBlockchainData,
    recordTransactionReceipt,
  } = useWeb3();

  const [depositEth, setDepositEth] = useState("1.0");
  const [depositMemo, setDepositMemo] = useState(
    "Election observer & campus logistics test fund"
  );

  const [recipientAddr, setRecipientAddr] = useState("");
  const [withdrawEth, setWithdrawEth] = useState("0.25");
  const [withdrawMemo, setWithdrawMemo] = useState(
    "Disbursement to polling booth coordinator EOA"
  );

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      const receipt = await txDepositTreasury(depositEth, depositMemo);
      recordTransactionReceipt(`Treasury Deposit (${depositEth} ETH)`, receipt);
      notify(
        "success",
        "Test Ether Deposited",
        `Deposited ${depositEth} ETH into ElectionManager treasury.`,
        receipt.hash
      );
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Treasury Deposit Failed", parseBlockchainError(err));
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const receipt = await txWithdrawTreasury(
        recipientAddr,
        withdrawEth,
        withdrawMemo
      );
      recordTransactionReceipt(
        `Treasury Withdrawal (${withdrawEth} ETH -> ${recipientAddr.slice(0, 6)}...)`,
        receipt
      );
      notify(
        "success",
        "Contract-to-Account Transfer Complete",
        `Transferred ${withdrawEth} ETH from smart contract to ${recipientAddr}.`,
        receipt.hash
      );
      setRecipientAddr("");
      await refreshBlockchainData();
    } catch (err) {
      notify("error", "Treasury Withdrawal Reverted", parseBlockchainError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Administrative Test-Ether Treasury (Contract-to-Account)
        </h1>
        <p className="text-xs text-slate-400">
          Demonstrates payable deposits and reentrancy-protected Ether transfers
          from <span className="font-mono">ElectionManager.sol</span> to an
          Externally Owned Account (EOA). Completely separate from voter ballot
          casting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Current Contract Balance</span>
            <Landmark className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {Number(treasury.balanceEth).toFixed(4)} ETH
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Deposited</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {Number(treasury.totalDepositedEth).toFixed(4)} ETH
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Disbursed to EOAs</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {Number(treasury.totalWithdrawnEth).toFixed(4)} ETH
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleDeposit}
          className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-100">
            Fund Contract Treasury (`payable` Deposit)
          </h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Deposit Amount (Test ETH)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={depositEth}
              onChange={(e) => setDepositEth(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Purpose / Memo
            </label>
            <input
              type="text"
              required
              value={depositMemo}
              onChange={(e) => setDepositMemo(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={!wallet.connected}
            className="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
          >
            Deposit Test ETH to Contract
          </button>
        </form>

        <form
          onSubmit={handleWithdraw}
          className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-100">
            Withdraw Ether to Recipient EOA (`onlyAdmin` Contract-to-Account)
          </h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Recipient EOA Wallet Address (0x...)
            </label>
            <input
              type="text"
              required
              value={recipientAddr}
              onChange={(e) => setRecipientAddr(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Amount (Test ETH)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={withdrawEth}
                onChange={(e) => setWithdrawEth(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Disbursement Memo
              </label>
              <input
                type="text"
                required
                value={withdrawMemo}
                onChange={(e) => setWithdrawMemo(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!wallet.connected}
            className="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50"
          >
            Execute Contract-to-Account ETH Transfer
          </button>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-200">
          On-Chain Treasury Ledger (`getAllTreasuryTransactions`)
        </h2>
        <TransactionTable records={treasury.transactions} mode="treasury" />
      </section>
    </div>
  );
}
