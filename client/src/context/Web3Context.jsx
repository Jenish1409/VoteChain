import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  connectMetaMaskWallet,
  subscribeToWalletEvents,
  fetchAllElectionsWithPhase,
  fetchAllAuditLogs,
  fetchTreasuryOverview,
  parseBlockchainError,
} from "../services/blockchain";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [wallet, setWallet] = useState({
    connected: false,
    account: "",
    chainId: "",
    networkName: "Not Connected",
    balanceEth: "0.0",
    adminAddress: "",
    isAdmin: false,
    electionManagerAddress: "",
    auditLoggerAddress: "",
  });

  const [elections, setElections] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [treasury, setTreasury] = useState({
    balanceEth: "0.0",
    totalDepositedEth: "0.0",
    totalWithdrawnEth: "0.0",
    transactions: [],
  });
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = useCallback((type, title, message, txHash = "") => {
    setNotification({
      id: Date.now(),
      type,
      title,
      message,
      txHash,
    });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const refreshBlockchainData = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      setLoading(true);
      const [electionsList, logsList, treasuryData] = await Promise.all([
        fetchAllElectionsWithPhase(),
        fetchAllAuditLogs(),
        fetchTreasuryOverview(),
      ]);
      setElections(electionsList);
      setAuditLogs(logsList);
      setTreasury(treasuryData);
    } catch (err) {
      notify("error", "Sync Error", parseBlockchainError(err));
    } finally {
      setLoading(false);
    }
  }, [wallet.connected, notify]);

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      const info = await connectMetaMaskWallet();
      setWallet({
        connected: true,
        ...info,
      });
      const [electionsList, logsList, treasuryData] = await Promise.all([
        fetchAllElectionsWithPhase(),
        fetchAllAuditLogs(),
        fetchTreasuryOverview(),
      ]);
      setElections(electionsList);
      setAuditLogs(logsList);
      setTreasury(treasuryData);
      notify(
        "success",
        "Wallet Connected",
        `Connected as ${info.isAdmin ? "Administrator" : "Voter"} (${info.account.slice(0, 6)}...${info.account.slice(-4)})`
      );
    } catch (err) {
      notify("error", "Wallet Connection Failed", parseBlockchainError(err));
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const recordTransactionReceipt = useCallback((label, txResult) => {
    if (!txResult || !txResult.hash) return;
    setRecentReceipts((prev) => [
      {
        id: Date.now(),
        label,
        hash: txResult.hash,
        blockNumber: txResult.blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
      },
      ...prev,
    ]);
  }, []);

  // Auto-refresh elections every 15 seconds so phases update (UPCOMING → ACTIVE → ENDED)
  useEffect(() => {
    if (!wallet.connected) return;
    const interval = setInterval(() => {
      refreshBlockchainData();
    }, 15000);
    return () => clearInterval(interval);
  }, [wallet.connected, refreshBlockchainData]);

  useEffect(() => {
    const unsubscribe = subscribeToWalletEvents(
      (accounts) => {
        if (!accounts || accounts.length === 0) {
          setWallet((prev) => ({ ...prev, connected: false, account: "" }));
        } else {
          connectWallet();
        }
      },
      () => {
        connectWallet();
      }
    );
    return unsubscribe;
  }, [connectWallet]);

  return (
    <Web3Context.Provider
      value={{
        wallet,
        elections,
        auditLogs,
        treasury,
        recentReceipts,
        loading,
        notification,
        notify,
        clearNotification,
        connectWallet,
        refreshBlockchainData,
        recordTransactionReceipt,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return ctx;
}
