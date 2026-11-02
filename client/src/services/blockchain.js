import {
  BrowserProvider,
  Contract,
  formatEther,
  parseEther,
  isAddress,
} from "ethers";
import ElectionManagerArtifact from "../contracts/ElectionManager.json";
import AuditLoggerArtifact from "../contracts/AuditLogger.json";

/**
 * VoteChain 2.0 — Ethers.js v6 Blockchain Integration Layer
 *
 * Encapsulates:
 * - MetaMask connection, account & network listeners
 * - Dynamic contract address resolution from Truffle network artifacts
 * - Structured read calls (elections, candidates, voters, results, audit logs, treasury)
 * - State-changing transactions with human-friendly revert message extraction
 */

let providerInstance = null;
let signerInstance = null;
let electionManagerContract = null;
let auditLoggerContract = null;

/**
 * Resolves the deployed contract address for the active Chain ID / Network ID
 * from the Truffle artifact JSON, or falls back to the most recent deployed network entry.
 */
function resolveArtifactAddress(artifact, chainIdString) {
  const networks = artifact.networks || {};
  if (networks[chainIdString] && networks[chainIdString].address) {
    return networks[chainIdString].address;
  }
  // Prefer Ganache CLI (1337) over old Ganache GUI (5777)
  if (networks["1337"] && networks["1337"].address) {
    return networks["1337"].address;
  }
  if (networks["5777"] && networks["5777"].address) {
    return networks["5777"].address;
  }
  const keys = Object.keys(networks);
  if (keys.length > 0) {
    return networks[keys[keys.length - 1]].address;
  }
  throw new Error(
    `Contract ${artifact.contractName} is not deployed on network ${chainIdString}. Run "truffle migrate --reset".`
  );
}

/**
 * Extracts a clean, user-readable revert reason from Ethers.js v6 / MetaMask RPC errors.
 */
export function parseBlockchainError(error) {
  if (!error) return "Unknown blockchain error occurred.";
  if (error.code === "ACTION_REJECTED" || error.code === 4001) {
    return "Transaction signature was rejected in MetaMask.";
  }

  const rawMessage =
    error.shortMessage || error.info?.error?.message || error.message || "";

  // Detect nonce mismatch (happens after Ganache restart)
  if (
    /nonce/i.test(rawMessage) ||
    /already known/i.test(rawMessage) ||
    /replacement transaction underpriced/i.test(rawMessage) ||
    /the tx doesn't have the correct nonce/i.test(rawMessage)
  ) {
    return (
      "Nonce mismatch — Ganache was restarted but MetaMask cached old nonces. " +
      "Fix: In MetaMask → ⋮ (three dots) → Settings → Advanced → scroll down → " +
      '"Clear activity and nonce data", then reconnect.'
    );
  }

  // Detect "already pending" permission errors
  if (/already pending/i.test(rawMessage)) {
    return (
      "MetaMask has a pending request. Close any MetaMask popups, " +
      "then hard-refresh (Ctrl+Shift+R) and try again."
    );
  }

  if (error.reason) {
    return error.reason;
  }
  const revertMatch = rawMessage.match(
    /(?:reverted with reason string|revert)\s*['"]?([^'"]+)['"]?/i
  );
  if (revertMatch && revertMatch[1]) {
    return revertMatch[1].trim();
  }
  return rawMessage || "Transaction failed on the blockchain.";
}

/**
 * Connects to MetaMask using Ethers.js v6 BrowserProvider and initializes contract instances.
 * Automatically switches MetaMask to the Ganache CLI network if not already connected.
 */
export async function connectMetaMaskWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "MetaMask extension not detected. Please install MetaMask and connect to Ganache CLI (127.0.0.1:8545)."
    );
  }

  // Auto-switch MetaMask to Ganache CLI network (chain ID 1337 = 0x539)
  const GANACHE_CHAIN_ID_HEX = "0x539";
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GANACHE_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // Error code 4902 = chain not added yet, so add it
    if (switchError.code === 4902 || switchError.code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: GANACHE_CHAIN_ID_HEX,
            chainName: "Ganache CLI (Localhost)",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }

  providerInstance = new BrowserProvider(window.ethereum);
  const accounts = await providerInstance.send("eth_requestAccounts", []);
  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet accounts returned by MetaMask.");
  }

  signerInstance = await providerInstance.getSigner();
  const address = await signerInstance.getAddress();
  const network = await providerInstance.getNetwork();
  const chainId = network.chainId.toString();
  console.log("[VoteChain] Connected wallet:", address, "chainId:", chainId);

  const balanceWei = await providerInstance.getBalance(address);

  const electionManagerAddress = resolveArtifactAddress(
    ElectionManagerArtifact,
    chainId
  );
  const auditLoggerAddress = resolveArtifactAddress(
    AuditLoggerArtifact,
    chainId
  );
  console.log("[VoteChain] ElectionManager address:", electionManagerAddress);
  console.log("[VoteChain] AuditLogger address:", auditLoggerAddress);

  electionManagerContract = new Contract(
    electionManagerAddress,
    ElectionManagerArtifact.abi,
    signerInstance
  );

  auditLoggerContract = new Contract(
    auditLoggerAddress,
    AuditLoggerArtifact.abi,
    signerInstance
  );

  console.log("[VoteChain] Calling admin()...");
  const adminAddress = await electionManagerContract.admin();
  console.log("[VoteChain] Admin address:", adminAddress);

  return {
    account: address,
    chainId,
    networkName:
      chainId === "1337" || chainId === "5777"
        ? "Ganache Local Network"
        : network.name || `Chain #${chainId}`,
    balanceEth: formatEther(balanceWei),
    adminAddress,
    isAdmin: address.toLowerCase() === adminAddress.toLowerCase(),
    electionManagerAddress,
    auditLoggerAddress,
  };
}

/**
 * Registers MetaMask account and network change listeners.
 */
export function subscribeToWalletEvents(onAccountsChanged, onChainChanged) {
  if (typeof window === "undefined" || !window.ethereum) return () => {};

  const handleAccounts = (accounts) => {
    if (onAccountsChanged) onAccountsChanged(accounts);
  };
  const handleChain = (chainIdHex) => {
    if (onChainChanged) onChainChanged(chainIdHex);
  };

  window.ethereum.on("accountsChanged", handleAccounts);
  window.ethereum.on("chainChanged", handleChain);

  return () => {
    if (window.ethereum.removeListener) {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChain);
    }
  };
}

// ============================================================================
// READ-ONLY (VIEW / PURE) CONTRACT QUERIES
// ============================================================================

export async function fetchAllElectionsWithPhase() {
  if (!electionManagerContract) return [];
  const rawElections = await electionManagerContract.getAllElections();
  const formatted = await Promise.all(
    rawElections.map(async (e) => {
      const id = Number(e.electionId);
      const phase = await electionManagerContract.getElectionPhase(id);
      const turnoutBps =
        await electionManagerContract.calculateTurnoutBasisPoints(
          e.totalVotes,
          e.registeredVoters
        );
      return {
        electionId: id,
        title: e.title,
        description: e.description,
        startTime: Number(e.startTime),
        endTime: Number(e.endTime),
        isActive: Boolean(e.isActive),
        isClosed: Boolean(e.isClosed),
        exists: Boolean(e.exists),
        candidateCount: Number(e.candidateCount),
        registeredVoters: Number(e.registeredVoters),
        totalVotes: Number(e.totalVotes),
        phase,
        turnoutPercent: (Number(turnoutBps) / 100).toFixed(2),
      };
    })
  );
  return formatted;
}

export async function fetchElectionDetailsBundle(electionId, currentAccount) {
  if (!electionManagerContract) return null;
  const [rawElection, phase, rawCandidates, rawVoters, rawSummary] =
    await Promise.all([
      electionManagerContract.getElection(electionId),
      electionManagerContract.getElectionPhase(electionId),
      electionManagerContract.getElectionCandidates(electionId),
      electionManagerContract.getElectionVoters(electionId),
      electionManagerContract.getElectionResultsSummary(electionId),
    ]);

  let currentVoterInfo = {
    voterAddress: currentAccount || "",
    isRegistered: false,
    hasVoted: false,
    votedCandidateId: 0,
    votedAt: 0,
  };

  if (currentAccount && isAddress(currentAccount)) {
    const vInfo = await electionManagerContract.getVoterInfo(
      electionId,
      currentAccount
    );
    currentVoterInfo = {
      voterAddress: vInfo.voterAddress,
      isRegistered: Boolean(vInfo.isRegistered),
      hasVoted: Boolean(vInfo.hasVoted),
      votedCandidateId: Number(vInfo.votedCandidateId),
      votedAt: Number(vInfo.votedAt),
    };
  }

  return {
    election: {
      electionId: Number(rawElection.electionId),
      title: rawElection.title,
      description: rawElection.description,
      startTime: Number(rawElection.startTime),
      endTime: Number(rawElection.endTime),
      isActive: Boolean(rawElection.isActive),
      isClosed: Boolean(rawElection.isClosed),
      candidateCount: Number(rawElection.candidateCount),
      registeredVoters: Number(rawElection.registeredVoters),
      totalVotes: Number(rawElection.totalVotes),
      phase,
    },
    candidates: rawCandidates.map((c) => ({
      candidateId: Number(c.candidateId),
      electionId: Number(c.electionId),
      name: c.name,
      partyName: c.partyName,
      description: c.description,
      voteCount: Number(c.voteCount),
    })),
    voters: rawVoters.map((v) => ({
      voterAddress: v.voterAddress,
      isRegistered: Boolean(v.isRegistered),
      hasVoted: Boolean(v.hasVoted),
      votedCandidateId: Number(v.votedCandidateId),
      votedAt: Number(v.votedAt),
    })),
    resultsSummary: {
      winningVoteCount: Number(rawSummary.winningVoteCount),
      winningCandidateIds: rawSummary.winningCandidateIds.map((id) =>
        Number(id)
      ),
      isTie: Boolean(rawSummary.isTie),
      hasVotes: Boolean(rawSummary.hasVotes),
      turnoutBasisPoints: Number(rawSummary.turnoutBasisPoints),
      turnoutPercentage: (Number(rawSummary.turnoutBasisPoints) / 100).toFixed(
        2
      ),
    },
    currentVoterInfo,
  };
}

export async function fetchAllAuditLogs() {
  if (!auditLoggerContract) return [];
  const rawLogs = await auditLoggerContract.getAllAuditRecords();
  return rawLogs
    .map((r) => ({
      auditId: Number(r.auditId),
      electionId: Number(r.electionId),
      actionType: r.actionType,
      actor: r.actor,
      timestamp: Number(r.timestamp),
      details: r.details,
    }))
    .sort((a, b) => b.auditId - a.auditId);
}

export async function fetchTreasuryOverview() {
  if (!electionManagerContract) {
    return {
      balanceEth: "0.0",
      totalDepositedEth: "0.0",
      totalWithdrawnEth: "0.0",
      transactions: [],
    };
  }
  const [balanceWei, depositedWei, withdrawnWei, rawTxs] = await Promise.all([
    electionManagerContract.getTreasuryBalance(),
    electionManagerContract.totalTreasuryDeposited(),
    electionManagerContract.totalTreasuryWithdrawn(),
    electionManagerContract.getAllTreasuryTransactions(),
  ]);

  return {
    balanceEth: formatEther(balanceWei),
    totalDepositedEth: formatEther(depositedWei),
    totalWithdrawnEth: formatEther(withdrawnWei),
    transactions: rawTxs
      .map((tx) => ({
        txId: Number(tx.txId),
        txType: tx.txType,
        counterparty: tx.counterparty,
        amountEth: formatEther(tx.amount),
        purpose: tx.purpose,
        timestamp: Number(tx.timestamp),
      }))
      .sort((a, b) => b.txId - a.txId),
  };
}

// ============================================================================
// STATE-CHANGING SMART CONTRACT TRANSACTIONS
// ============================================================================

export async function txCreateElection(title, description, startTime, endTime) {
  const tx = await electionManagerContract.createElection(
    title,
    description,
    BigInt(startTime),
    BigInt(endTime)
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txRegisterCandidate(
  electionId,
  name,
  partyName,
  description
) {
  const tx = await electionManagerContract.registerCandidate(
    BigInt(electionId),
    name,
    partyName,
    description
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txRegisterVoter(electionId, voterAddress) {
  if (!isAddress(voterAddress)) {
    throw new Error("Invalid Ethereum wallet address format.");
  }
  const tx = await electionManagerContract.registerVoter(
    BigInt(electionId),
    voterAddress
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txRegisterVotersBatch(electionId, addressList) {
  const cleaned = addressList.map((a) => a.trim()).filter(Boolean);
  for (const addr of cleaned) {
    if (!isAddress(addr)) {
      throw new Error(`Invalid Ethereum wallet address in batch: ${addr}`);
    }
  }
  const tx = await electionManagerContract.registerVotersBatch(
    BigInt(electionId),
    cleaned
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txSetElectionActiveStatus(electionId, isActive) {
  const tx = await electionManagerContract.setElectionActiveStatus(
    BigInt(electionId),
    Boolean(isActive)
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txCloseElection(electionId) {
  const tx = await electionManagerContract.closeElection(BigInt(electionId));
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txCastVote(electionId, candidateId) {
  const tx = await electionManagerContract.castVote(
    BigInt(electionId),
    BigInt(candidateId)
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txDepositTreasury(amountEth, purpose) {
  const valueWei = parseEther(amountEth.toString());
  const tx = await electionManagerContract.depositTreasury(purpose, {
    value: valueWei,
  });
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function txWithdrawTreasury(recipientAddress, amountEth, purpose) {
  if (!isAddress(recipientAddress)) {
    throw new Error("Invalid recipient wallet address.");
  }
  const valueWei = parseEther(amountEth.toString());
  const tx = await electionManagerContract.withdrawTreasury(
    recipientAddress,
    valueWei,
    purpose
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}
