# 📚 VoteChain 2.0 — Complete Viva Preparation Guide

> **Blockchain Technology Project — Semester 7**
> This guide maps **every project requirement** to the exact code that fulfills it, with line-by-line explanations you can use in your viva.

---

## Table of Contents

1. [Requirement 1: Properly Written Smart Contract](#requirement-1-properly-written-smart-contract)
2. [Requirement 2: Connect Wallet (MetaMask)](#requirement-2-connect-wallet-metamask)
3. [Requirement 3: At Least One Function](#requirement-3-at-least-one-function)
4. [Requirement 4: One Constructor](#requirement-4-one-constructor)
5. [Requirement 5: Table Function (struct + mapping)](#requirement-5-table-function-struct--mapping)
6. [Requirement 6: Contract-to-Account / Contract-to-Contract](#requirement-6-contract-to-account--contract-to-contract)
7. [Requirement 7: require Keyword](#requirement-7-require-keyword)
8. [Requirement 8: pure or view Keyword](#requirement-8-pure-or-view-keyword)
9. [Requirement 9: Truffle Framework](#requirement-9-truffle-framework)
10. [Architecture Overview](#architecture-overview)
11. [Solidity Concepts Cheat Sheet](#solidity-concepts-cheat-sheet)
12. [Possible Viva Questions & Answers](#possible-viva-questions--answers)

---

## Requirement 1: Properly Written Smart Contract

### What the evaluator expects:
A well-structured Solidity contract with appropriate **variables**, **functions**, and **access control**.

### VoteChain has TWO smart contracts:

#### Contract 1: `ElectionManager.sol` (845 lines)
**File:** `contracts/ElectionManager.sol`

This is the primary contract. It manages:
- Election lifecycle (create, activate, pause, close)
- Candidate registration
- Voter eligibility (whitelist)
- Secure vote casting
- Ether treasury (deposit/withdraw)
- Results calculation with tie detection

#### Contract 2: `AuditLogger.sol` (168 lines)
**File:** `contracts/AuditLogger.sol`

This is the secondary contract. It provides:
- Immutable, tamper-evident on-chain audit trail
- Only accepts logs from the authorized `ElectionManager` contract
- Records every state-changing action with timestamps

### State Variables:

```solidity
// ElectionManager.sol — Lines 61–69
address public admin;                        // stores deployer's wallet
IAuditLogger public auditLogger;             // reference to AuditLogger contract
uint256 public electionCount;                // total elections created
uint256 public treasuryTxCount;              // total treasury transactions
uint256 public totalTreasuryDeposited;       // cumulative ETH deposited
uint256 public totalTreasuryWithdrawn;       // cumulative ETH withdrawn
bool private locked;                         // reentrancy guard flag
```

```solidity
// AuditLogger.sol — Lines 20–22
address public owner;              // deployer of AuditLogger
address public authorizedCaller;   // only ElectionManager can log
uint256 public auditCount;         // total audit records
```

### Access Control (Modifiers):

```solidity
// ElectionManager.sol — Lines 138–144
modifier onlyAdmin() {
    require(msg.sender == admin, "ElectionManager: Restricted to administrator");
    _;
}
```
- **What it does:** Only the deployer (Account #0) can call admin functions like `createElection`, `registerCandidate`, `withdrawTreasury`, etc.
- **How `_` works:** The underscore is a placeholder for the function body. The `require` runs first; if it passes, the function body executes.

```solidity
// ElectionManager.sol — Lines 146–154
modifier electionExists(uint256 _electionId) {
    require(
        _electionId > 0 && _electionId <= electionCount && elections[_electionId].exists,
        "ElectionManager: Election does not exist"
    );
    _;
}
```
- Validates that the election ID is valid before any operation.

```solidity
// ElectionManager.sol — Lines 156–161
modifier nonReentrant() {
    require(!locked, "ElectionManager: Reentrant call detected");
    locked = true;
    _;
    locked = false;
}
```
- **Reentrancy Guard:** Prevents a malicious contract from recursively calling `withdrawTreasury` during an Ether transfer. The `locked` flag is set to `true` before the function runs and reset to `false` after.

```solidity
// AuditLogger.sol — Lines 49–55
modifier onlyAuthorizedCaller() {
    require(
        msg.sender == authorizedCaller,
        "AuditLogger: Caller is not the authorized ElectionManager contract"
    );
    _;
}
```
- Only `ElectionManager` can write audit logs — no one else can tamper with the audit trail.

---

## Requirement 2: Connect Wallet (MetaMask)

### What the evaluator expects:
Connect MetaMask to the project frontend to interact with the smart contract.

### Code Location: `client/src/services/blockchain.js` — Lines 77–163

```javascript
export async function connectMetaMaskWallet() {
  // 1. Check if MetaMask extension is installed
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask extension not detected...");
  }

  // 2. Auto-switch MetaMask to Ganache network (chain ID 1337)
  const GANACHE_CHAIN_ID_HEX = "0x539";  // 1337 in hexadecimal
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GANACHE_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // If chain doesn't exist in MetaMask, add it automatically
    if (switchError.code === 4902 || switchError.code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: GANACHE_CHAIN_ID_HEX,
          chainName: "Ganache CLI (Localhost)",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["http://127.0.0.1:8545"],
        }],
      });
    }
  }

  // 3. Create Ethers.js provider from MetaMask
  providerInstance = new BrowserProvider(window.ethereum);

  // 4. Request user to connect accounts
  const accounts = await providerInstance.send("eth_requestAccounts", []);

  // 5. Get signer for transactions
  signerInstance = await providerInstance.getSigner();
  const address = await signerInstance.getAddress();

  // 6. Get network info (chain ID)
  const network = await providerInstance.getNetwork();
  const chainId = network.chainId.toString();

  // 7. Initialize contract instances with ABI + Address + Signer
  electionManagerContract = new Contract(
    electionManagerAddress,
    ElectionManagerArtifact.abi,
    signerInstance
  );
}
```

### Key Concepts to Explain:

| Term | Meaning |
|------|---------|
| `window.ethereum` | Injected by MetaMask into every webpage; gives access to the Ethereum provider |
| `BrowserProvider` | Ethers.js v6 class that wraps MetaMask's `window.ethereum` into a standard provider |
| `eth_requestAccounts` | RPC method that triggers the MetaMask popup asking user to connect |
| `getSigner()` | Returns a Signer object that can sign transactions (spend ETH, call state-changing functions) |
| `Contract(address, abi, signer)` | Creates a JavaScript object representing the deployed smart contract — you can call its functions |
| `wallet_switchEthereumChain` | Asks MetaMask to switch to a specific network (chain ID) |
| `wallet_addEthereumChain` | Adds a custom network to MetaMask if it doesn't exist |

### Event Listeners for Account/Network Changes:

```javascript
// blockchain.js — Lines 169–188
export function subscribeToWalletEvents(onAccountsChanged, onChainChanged) {
  window.ethereum.on("accountsChanged", handleAccounts);
  window.ethereum.on("chainChanged", handleChain);
}
```
- When the user switches accounts in MetaMask, the app auto-reconnects.
- When the network changes, the app re-initializes contracts.

---

## Requirement 3: At Least One Function

### What the evaluator expects:
Implement at least one function to perform an operation, such as storing or updating data.

### VoteChain has **15+ functions**. Here are the key state-changing ones:

### Function: `createElection()` — ElectionManager.sol Line 183

```solidity
function createElection(
    string calldata _title,
    string calldata _description,
    uint256 _startTime,
    uint256 _endTime
) external onlyAdmin returns (uint256 newElectionId) {
    // Validation
    require(bytes(_title).length > 0, "Election title cannot be empty");
    require(_endTime > _startTime, "End time must be after start time");
    require(_endTime > block.timestamp, "End time must be in the future");

    // Store election data
    electionCount += 1;
    newElectionId = electionCount;
    elections[newElectionId] = Election({
        electionId: newElectionId,
        title: _title,
        description: _description,
        startTime: _startTime,
        endTime: _endTime,
        isActive: true,
        isClosed: false,
        exists: true,
        candidateCount: 0,
        registeredVoters: 0,
        totalVotes: 0
    });

    // Emit event (for frontend listeners)
    emit ElectionCreated(newElectionId, _title, _startTime, _endTime, msg.sender);

    // Log to AuditLogger (contract-to-contract call)
    auditLogger.logAction(newElectionId, "ELECTION_CREATED", msg.sender, "Created election...");

    return newElectionId;
}
```

**Explain to evaluator:**
- `external` → can only be called from outside the contract (by MetaMask/frontend)
- `onlyAdmin` → modifier that checks `msg.sender == admin`
- `calldata` → gas-efficient way to pass string arguments (read-only, not copied to memory)
- `returns (uint256)` → returns the new election's ID
- `emit` → fires an Ethereum event that the frontend can listen to
- `auditLogger.logAction(...)` → **contract-to-contract interaction**

### Function: `castVote()` — ElectionManager.sol Line 456

```solidity
function castVote(uint256 _electionId, uint256 _candidateId) external electionExists(_electionId) {
    Election storage election = elections[_electionId];

    // Multiple require checks (Requirement 7)
    require(election.isActive && !election.isClosed, "Election is not active");
    require(block.timestamp >= election.startTime, "Voting has not started yet");
    require(block.timestamp <= election.endTime, "Voting period has ended");
    require(voter.isRegistered, "Wallet is not registered to vote");
    require(!voter.hasVoted, "Wallet has already voted");  // prevents double voting!
    require(candidates[_electionId][_candidateId].exists, "Invalid candidate ID");

    // Update state (Checks-Effects-Interactions pattern)
    voter.hasVoted = true;
    voter.votedCandidateId = _candidateId;
    voter.votedAt = block.timestamp;
    candidates[_electionId][_candidateId].voteCount += 1;
    election.totalVotes += 1;

    emit VoteCast(_electionId, _candidateId, msg.sender, block.timestamp);

    // Audit log (does NOT reveal which candidate — privacy feature)
    auditLogger.logAction(_electionId, "VOTE_CAST", msg.sender,
        "Verified eligible wallet cast ballot on-chain");
}
```

**Key point for viva:** The audit log does NOT record which candidate the voter chose — only that a vote was cast. This preserves ballot secrecy while maintaining audit transparency.

### Function: `registerCandidate()` — ElectionManager.sol Line 244

```solidity
function registerCandidate(
    uint256 _electionId, string calldata _name,
    string calldata _partyName, string calldata _description
) external onlyAdmin electionExists(_electionId) returns (uint256 newCandidateId) {
    require(block.timestamp < election.startTime && election.totalVotes == 0,
        "Cannot modify candidates after voting starts");

    // Prevent duplicate candidate names using keccak256 hash
    bytes32 nameHash = keccak256(abi.encodePacked(_name));
    require(!candidateNameExists[_electionId][nameHash],
        "Candidate already registered");

    candidateNameExists[_electionId][nameHash] = true;
    // ... store candidate ...
}
```

---

## Requirement 4: One Constructor

### What the evaluator expects:
Use a `constructor()` to initialize values when the contract is deployed. It executes only once.

### Constructor 1: `ElectionManager.sol` — Line 167

```solidity
constructor(address _auditLoggerAddress) {
    require(
        _auditLoggerAddress != address(0),
        "ElectionManager: Invalid AuditLogger address"
    );
    admin = msg.sender;                              // deployer becomes admin
    auditLogger = IAuditLogger(_auditLoggerAddress); // link to AuditLogger
}
```

**Explain:**
- `msg.sender` inside the constructor is the account that deployed the contract (Account #0)
- `admin = msg.sender` → sets the deployer as the permanent admin
- Takes `_auditLoggerAddress` as a parameter → this is the address of the already-deployed `AuditLogger` contract
- `IAuditLogger(...)` → casts the address to the `IAuditLogger` interface so we can call its functions
- The `require` prevents deploying with an invalid zero address

### Constructor 2: `AuditLogger.sol` — Line 57

```solidity
constructor() {
    owner = msg.sender;   // deployer becomes owner
    auditCount = 0;       // start with zero audit records
}
```

**Explain:**
- Simpler constructor — no parameters needed
- `owner` is the deployer (Account #0), who can later call `setAuthorizedCaller()`

### How Constructors Work Together (Deployment Sequence):

The migration script (`2_deploy_contracts.js`) shows the deployment order:

```javascript
// Step 1: Deploy AuditLogger first (no dependencies)
await deployer.deploy(AuditLogger, { from: adminAccount });

// Step 2: Deploy ElectionManager, passing AuditLogger's address
await deployer.deploy(ElectionManager, auditLoggerInstance.address, {
    from: adminAccount,
});

// Step 3: Authorize ElectionManager to write audit logs
await auditLoggerInstance.setAuthorizedCaller(
    electionManagerInstance.address, { from: adminAccount }
);
```

**Why this order?**
- AuditLogger must exist first because ElectionManager's constructor needs its address
- After both are deployed, we must authorize ElectionManager as the only contract allowed to write audit logs
- This creates a **one-way trust relationship**: ElectionManager → AuditLogger

---

## Requirement 5: Table Function (struct + mapping)

### What the evaluator expects:
Store and display contract data in a table, such as user details, transactions, or records. Use a struct and mapping or array if needed.

### Structs Defined:

```solidity
// ElectionManager.sol — Lines 20–32
struct Election {
    uint256 electionId;
    string title;
    string description;
    uint256 startTime;       // Unix timestamp (seconds since 1970)
    uint256 endTime;
    bool isActive;
    bool isClosed;
    bool exists;
    uint256 candidateCount;
    uint256 registeredVoters;
    uint256 totalVotes;
}

// Lines 34–42
struct Candidate {
    uint256 candidateId;
    uint256 electionId;
    string name;
    string partyName;
    string description;
    uint256 voteCount;
    bool exists;
}

// Lines 44–50
struct VoterInfo {
    address voterAddress;
    bool isRegistered;
    bool hasVoted;
    uint256 votedCandidateId;
    uint256 votedAt;            // timestamp when vote was cast
}

// Lines 52–59
struct TreasuryTransaction {
    uint256 txId;
    string txType;              // "DEPOSIT" or "WITHDRAWAL"
    address counterparty;
    uint256 amount;
    string purpose;
    uint256 timestamp;
}

// AuditLogger.sol — Lines 11–18
struct AuditRecord {
    uint256 auditId;
    uint256 electionId;
    string actionType;          // "ELECTION_CREATED", "VOTE_CAST", etc.
    address actor;
    uint256 timestamp;
    string details;
}
```

### Mappings (On-Chain Storage):

```solidity
// ElectionManager.sol — Lines 72–87
mapping(uint256 => Election) private elections;                         // electionId → Election
mapping(uint256 => mapping(uint256 => Candidate)) private candidates;  // electionId → candidateId → Candidate
mapping(uint256 => mapping(bytes32 => bool)) private candidateNameExists; // prevents duplicate names
mapping(uint256 => mapping(address => VoterInfo)) private voters;      // electionId → voterAddress → VoterInfo
mapping(uint256 => address[]) private electionVoterList;               // electionId → array of voter addresses
mapping(uint256 => TreasuryTransaction) private treasuryHistory;       // txId → TreasuryTransaction

// AuditLogger.sol — Lines 25–28
mapping(uint256 => AuditRecord) private auditRecords;      // auditId → AuditRecord
mapping(uint256 => uint256[]) private electionAuditIds;     // electionId → array of auditIds
```

### Table Data Retrieval Functions:

```solidity
// Get ALL elections → rendered in Elections page table
function getAllElections() external view returns (Election[] memory) {
    Election[] memory list = new Election[](electionCount);
    for (uint256 i = 1; i <= electionCount; i++) {
        list[i - 1] = elections[i];
    }
    return list;
}

// Get ALL voters for an election → rendered in Voter table
function getElectionVoters(uint256 _electionId) external view returns (VoterInfo[] memory) { ... }

// Get ALL audit records → rendered in Audit Trail table
function getAllAuditRecords() external view returns (AuditRecord[] memory) { ... }

// Get ALL treasury transactions → rendered in Treasury ledger table
function getAllTreasuryTransactions() external view returns (TreasuryTransaction[] memory) { ... }
```

### Frontend Table Rendering:

The data from these functions is fetched in `blockchain.js` and displayed in React components:

| Smart Contract Function | Frontend Page | What's Displayed |
|------------------------|---------------|------------------|
| `getAllElections()` + `getElectionPhase()` | `/elections` | Election cards with ID, title, phase, voter count |
| `getElectionCandidates()` | `/results` | Candidate table with name, party, vote count, % |
| `getElectionVoters()` | `/elections/:id` | Voter table with address, registration status, vote status |
| `getAllAuditRecords()` | `/audit` | Audit trail table with ID, action, actor, timestamp |
| `getAllTreasuryTransactions()` | `/treasury` | Treasury ledger with type, amount, counterparty, memo |

---

## Requirement 6: Contract-to-Account / Contract-to-Contract

### What the evaluator expects:
- **Contract-to-Account**: Transfer Ether or interact with an externally owned account (EOA).
- **Contract-to-Contract**: Call a function of another deployed smart contract.

### Contract-to-Account: `withdrawTreasury()` — ElectionManager.sol Line 584

```solidity
function withdrawTreasury(
    address payable _recipient,    // EOA wallet address
    uint256 _amount,
    string calldata _purpose
) external onlyAdmin nonReentrant {
    require(_recipient != address(0), "Recipient cannot be zero address");
    require(_amount > 0, "Withdrawal amount must be greater than zero");
    require(address(this).balance >= _amount, "Insufficient treasury balance");

    // Effects before Interaction (CEI Pattern)
    treasuryTxCount += 1;
    totalTreasuryWithdrawn += _amount;
    treasuryHistory[currentTxId] = TreasuryTransaction({ ... });

    // THE KEY LINE — Contract sends Ether to EOA wallet
    (bool success, ) = _recipient.call{value: _amount}("");
    require(success, "ElectionManager: Ether transfer failed");

    emit TreasuryWithdrawn(currentTxId, _recipient, _amount, ...);
}
```

**Explain to evaluator:**
- `_recipient.call{value: _amount}("")` → this is a **low-level Ether transfer** from the smart contract to an external wallet (EOA)
- `address payable` → the recipient must be marked `payable` to receive Ether
- `nonReentrant` modifier → prevents a malicious contract from re-calling `withdrawTreasury` during the transfer
- `address(this).balance` → the contract's current Ether balance
- **CEI Pattern** (Checks-Effects-Interactions): We update state variables BEFORE making the external call to prevent reentrancy attacks

Also, the contract can **receive** ETH via:

```solidity
// Lines 521–530 — payable function
function depositTreasury(string calldata _purpose) external payable {
    require(msg.value > 0, "Deposit amount must be greater than zero");
    // msg.value = amount of ETH sent with the transaction
}

// Lines 535–545 — receive function for direct transfers
receive() external payable {
    require(msg.value > 0, "Direct deposit must be greater than zero");
}
```

### Contract-to-Contract: Every function that calls `auditLogger.logAction()`

```solidity
// ElectionManager.sol — Example from createElection() — Line 231
auditLogger.logAction(
    newElectionId,           // which election
    "ELECTION_CREATED",      // action type
    msg.sender,              // who did it
    string(abi.encodePacked("Created election: ", _title))  // details
);
```

This is a **cross-contract function call**:
- `ElectionManager` (Contract A) calls `logAction()` on `AuditLogger` (Contract B)
- The call happens **atomically** — if either contract reverts, both revert
- AuditLogger verifies the caller using `onlyAuthorizedCaller` modifier

**All 7 contract-to-contract calls in VoteChain:**

| Triggered By | Action Logged |
|-------------|---------------|
| `createElection()` | `ELECTION_CREATED` |
| `registerCandidate()` | `CANDIDATE_REGISTERED` |
| `registerVoter()` | `VOTER_REGISTERED` |
| `registerVotersBatch()` | `VOTER_BATCH_REGISTERED` |
| `setElectionActiveStatus()` | `ELECTION_ACTIVATED` / `ELECTION_PAUSED` |
| `closeElection()` | `ELECTION_CLOSED` |
| `castVote()` | `VOTE_CAST` |
| `depositTreasury()` | `TREASURY_DEPOSIT` |
| `withdrawTreasury()` | `TREASURY_WITHDRAWAL` |

### Interface for Cross-Contract Communication:

```solidity
// ElectionManager.sol — Lines 4–11
interface IAuditLogger {
    function logAction(
        uint256 _electionId,
        string calldata _actionType,
        address _actor,
        string calldata _details
    ) external returns (uint256);
}
```

**Explain:** An **interface** in Solidity is like a contract "blueprint" — it defines the function signatures that exist in another contract. ElectionManager uses this interface to call `logAction()` on AuditLogger without needing the full source code.

---

## Requirement 7: require Keyword

### What the evaluator expects:
Validate conditions and revert transactions if a condition fails.

### VoteChain uses **25+ require statements**. Key examples:

```solidity
// Access control — only admin can call
require(msg.sender == admin, "ElectionManager: Restricted to administrator");

// Prevent double voting
require(!voter.hasVoted, "ElectionManager: Wallet has already voted in this election");

// Time-based validation
require(block.timestamp >= election.startTime, "Voting has not started yet");
require(block.timestamp <= election.endTime, "Voting period has ended");

// Prevent zero-address attacks
require(_voter != address(0), "Voter cannot be zero address");

// Financial validation
require(msg.value > 0, "Deposit amount must be greater than zero");
require(address(this).balance >= _amount, "Insufficient contract treasury balance");

// Reentrancy guard
require(!locked, "ElectionManager: Reentrant call detected");

// Cross-contract authorization
require(msg.sender == authorizedCaller,
    "AuditLogger: Caller is not the authorized ElectionManager contract");

// Ether transfer success check
(bool success, ) = _recipient.call{value: _amount}("");
require(success, "ElectionManager: Ether transfer failed");
```

**What happens when `require` fails?**
- The entire transaction is **reverted** — all state changes in that transaction are undone
- The error message string is returned to the frontend
- Any gas already consumed is lost (except remaining gas is refunded)
- The frontend catches it via `parseBlockchainError()` and shows the message

---

## Requirement 8: pure or view Keyword

### What the evaluator expects:
- `view`: Reads contract state without modifying it
- `pure`: Neither reads nor modifies contract state

### `view` Functions (Read-Only — No Gas Cost):

```solidity
// ElectionManager.sol — Line 647
function getElection(uint256 _electionId) external view returns (Election memory) {
    return elections[_electionId];  // READS from storage
}

// Line 656
function getAllElections() external view returns (Election[] memory) { ... }

// Line 667 — Complex view function
function getElectionPhase(uint256 _electionId) public view returns (string memory) {
    Election storage election = elections[_electionId];
    if (election.isClosed) return "CLOSED";
    if (!election.isActive) return "PAUSED";
    if (block.timestamp < election.startTime) return "UPCOMING";
    if (block.timestamp <= election.endTime) return "ACTIVE";
    return "ENDED";
}

// Line 767 — Results summary with tie detection
function getElectionResultsSummary(uint256 _electionId) external view
    returns (uint256 winningVoteCount, uint256[] memory winningCandidateIds,
             bool isTie, bool hasVotes, uint256 turnoutBasisPoints) { ... }

// Line 825
function getTreasuryBalance() external view returns (uint256) {
    return address(this).balance;  // READS the contract's Ether balance
}

// AuditLogger.sol — Line 130
function getAuditRecord(uint256 _auditId) external view returns (AuditRecord memory) { ... }

// Line 143
function getAllAuditRecords() external view returns (AuditRecord[] memory) { ... }
```

**Explain:** `view` functions can read state variables like `elections`, `candidates`, `voters` but CANNOT modify them. They cost zero gas when called externally (from the frontend) because they don't create a transaction.

### `pure` Function (No State Access):

```solidity
// ElectionManager.sol — Line 754
function calculateTurnoutBasisPoints(
    uint256 _votesCast,
    uint256 _registeredVoters
) public pure returns (uint256) {
    if (_registeredVoters == 0) {
        return 0;
    }
    return (_votesCast * 10000) / _registeredVoters;
}
```

**Explain:**
- `pure` means this function does NOT read any contract state variables (`elections`, `admin`, etc.)
- It only uses the input parameters to calculate a result
- **Basis Points**: 10000 = 100.00%. So if 2 out of 3 voters voted: `(2 * 10000) / 3 = 6666` → 66.66%
- Also costs zero gas when called externally

### Difference Between `view` and `pure`:

| Keyword | Can Read State? | Can Modify State? | Gas Cost (external call) |
|---------|----------------|-------------------|------------------------|
| `view` | ✅ Yes | ❌ No | Free (no tx needed) |
| `pure` | ❌ No | ❌ No | Free (no tx needed) |
| (none) | ✅ Yes | ✅ Yes | Costs gas (creates tx) |

---

## Requirement 9: Truffle Framework

### What the evaluator expects:
Use Truffle to compile, test, and deploy the smart contract. Configure `truffle-config.js` and write migration scripts.

### `truffle-config.js`:

```javascript
const path = require("path");
module.exports = {
  contracts_directory: "./contracts",
  // Output ABI + deployment info directly into React app
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,                    // Ganache CLI port
      network_id: "*",               // Match any network ID
      gas: 6721975,                  // Block gas limit
      gasPrice: 20000000000,         // 20 gwei
    },
  },
  compilers: {
    solc: {
      version: "0.8.20",            // Solidity compiler version
      settings: {
        optimizer: { enabled: true, runs: 200 },  // Optimize for deployment
        evmVersion: "paris",         // EVM version target
      },
    },
  },
};
```

**Key point:** `contracts_build_directory` outputs compiled ABI JSON files directly into `client/src/contracts/` so the React frontend can import them.

### Migration Scripts:

**`1_initial_migration.js`** — Standard Truffle setup:
```javascript
const Migrations = artifacts.require("Migrations");
module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
```

**`2_deploy_contracts.js`** — Custom deployment:
```javascript
const AuditLogger = artifacts.require("AuditLogger");
const ElectionManager = artifacts.require("ElectionManager");

module.exports = async function (deployer, network, accounts) {
  const adminAccount = accounts[0];

  // Step 1: Deploy AuditLogger
  await deployer.deploy(AuditLogger, { from: adminAccount });
  const auditLoggerInstance = await AuditLogger.deployed();

  // Step 2: Deploy ElectionManager with AuditLogger's address
  await deployer.deploy(ElectionManager, auditLoggerInstance.address, {
    from: adminAccount,
  });
  const electionManagerInstance = await ElectionManager.deployed();

  // Step 3: Authorize ElectionManager to write audit logs
  await auditLoggerInstance.setAuthorizedCaller(
    electionManagerInstance.address,
    { from: adminAccount }
  );
};
```

### Truffle Commands Used:

| Command | What It Does |
|---------|-------------|
| `truffle compile` | Compiles `.sol` files → generates ABI JSON in `client/src/contracts/` |
| `truffle migrate --reset` | Deploys contracts to Ganache, runs migration scripts |
| `truffle test` | Runs Mocha/Chai test suite against contracts |
| `truffle console` | Opens interactive REPL to test contract functions |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ MetaMask      │  │ Ethers.js v6 │  │ blockchain.js │  │
│  │ (Wallet)      │──│ (Provider)   │──│ (Service)     │  │
│  └──────┬───────┘  └──────────────┘  └───────┬───────┘  │
│         │                                     │          │
│  ┌──────┴─────────────────────────────────────┴───────┐  │
│  │              Web3Context.jsx (Global State)         │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                              │
│  ┌────────┬───────┬───────┼───────┬──────┬──────────┐    │
│  │ Home   │Elections│Admin │Voting │Results│Audit│Treasury│   │
│  └────────┴───────┴───────┴───────┴──────┴──────────┘    │
└─────────────────────────────┬───────────────────────────┘
                              │ JSON-RPC over HTTP
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 GANACHE CLI (Local Blockchain)            │
│                  Port 8545 • Chain ID 1337               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           ElectionManager.sol (Main Contract)        │ │
│  │  • createElection()    • registerCandidate()         │ │
│  │  • castVote()          • withdrawTreasury()          │ │
│  │  • getElectionPhase()  • getElectionResultsSummary() │ │
│  └────────────────────────┬────────────────────────────┘ │
│                           │ Contract-to-Contract Call    │
│  ┌────────────────────────▼────────────────────────────┐ │
│  │           AuditLogger.sol (Audit Contract)           │ │
│  │  • logAction()         • getAllAuditRecords()         │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Solidity Concepts Cheat Sheet

| Concept | Where in Code | Quick Explanation |
|---------|--------------|-------------------|
| `msg.sender` | Throughout | The wallet address that called the function |
| `msg.value` | `depositTreasury()` | Amount of ETH sent with the transaction (in wei) |
| `block.timestamp` | `castVote()`, `getElectionPhase()` | Current block's Unix timestamp |
| `address(this).balance` | `withdrawTreasury()` | Contract's current ETH balance |
| `mapping` | Lines 72–87 | Key-value hash table stored on-chain |
| `struct` | Lines 20–59 | Custom data type grouping multiple fields |
| `event` / `emit` | Lines 89–136 | Logs data to blockchain (frontend can listen) |
| `modifier` | Lines 138–161 | Reusable pre/post-condition for functions |
| `external` | Most functions | Only callable from outside the contract |
| `internal` | `_registerSingleVoter()` | Only callable within the contract or derived contracts |
| `public` | `getElectionPhase()` | Callable both internally and externally |
| `private` | Storage mappings | Only accessible within this contract |
| `storage` | `Election storage e = ...` | Points directly to on-chain storage (modifiable) |
| `memory` | `return Election memory` | Temporary copy in RAM (returned to caller) |
| `calldata` | String parameters | Read-only, gas-efficient parameter location |
| `payable` | `depositTreasury()` | Function can receive ETH |
| `abi.encodePacked` | Audit log details | Concatenates values into raw bytes (for hashing or string building) |
| `keccak256` | `registerCandidate()` | Solidity's built-in hash function (SHA-3 family) |

---

## Possible Viva Questions & Answers

### Q1: What is the difference between `msg.sender` and `tx.origin`?
**A:** `msg.sender` is the immediate caller of the function (could be a contract or EOA). `tx.origin` is always the original EOA that initiated the transaction. In VoteChain, we use `msg.sender` because it's more secure — using `tx.origin` for auth is vulnerable to phishing attacks where a malicious contract calls your contract on behalf of the user.

### Q2: Why do you have two contracts instead of one?
**A:** Separation of concerns. `ElectionManager` handles business logic (elections, votes, treasury). `AuditLogger` handles audit recording. This demonstrates **contract-to-contract interaction** (Requirement 6) and follows the Single Responsibility Principle. If we need to upgrade the election logic, the audit trail remains intact in a separate contract.

### Q3: What is a reentrancy attack? How do you prevent it?
**A:** A reentrancy attack happens when an external call (like sending ETH) allows the recipient contract to call back into your function before the first call finishes. In VoteChain, we prevent it with:
1. **`nonReentrant` modifier** — uses a `locked` boolean flag
2. **CEI Pattern** (Checks-Effects-Interactions) — we update state variables BEFORE making the external `call{value}`. So even if someone re-enters, the state already shows the withdrawal happened.

### Q4: What does `(bool success, ) = _recipient.call{value: _amount}("")` mean?
**A:** This is a low-level Ether transfer in Solidity:
- `_recipient.call{value: _amount}("")` — sends `_amount` wei to `_recipient`
- `{value: _amount}` — specifies how much ETH to send
- `("")` — empty calldata (we're not calling any function, just transferring ETH)
- `(bool success, )` — destructures the return value; `success` is `true` if transfer worked
- We then `require(success, ...)` to revert if the transfer failed

### Q5: What is the `payable` keyword?
**A:** `payable` allows a function or address to receive Ether. In VoteChain:
- `function depositTreasury(...) external payable` — this function can receive ETH via `msg.value`
- `address payable _recipient` — this address can receive ETH via `.call{value}`
- `receive() external payable` — special function that handles direct ETH transfers to the contract

### Q6: What is the difference between `storage` and `memory`?
**A:** 
- `storage` — points directly to on-chain persistent data. Changes to a `storage` variable are permanently written to the blockchain. Like a database write.
- `memory` — temporary copy that exists only during function execution. Cheaper to use but data is lost after the function returns. Like RAM.
- Example: `Election storage election = elections[_electionId]` — this gives a direct reference. When we do `election.totalVotes += 1`, it updates the actual on-chain data.

### Q7: Why use `calldata` instead of `memory` for string parameters?
**A:** `calldata` is read-only and cheaper in gas because it doesn't copy the data. Since our function parameters for strings (like `_title`, `_description`) are only read and never modified inside the function, `calldata` is the optimal choice. `memory` would waste gas by copying the data unnecessarily.

### Q8: How does `getElectionPhase()` determine the election state?
**A:** It uses `block.timestamp` (the current block's time) compared against `startTime` and `endTime`:
```
if (isClosed)                        → "CLOSED"
if (!isActive)                       → "PAUSED"
if (block.timestamp < startTime)     → "UPCOMING"
if (block.timestamp <= endTime)      → "ACTIVE"
else                                 → "ENDED"
```
This is a `view` function — it reads state but doesn't modify it.

### Q9: What is `keccak256` and why do you use it?
**A:** `keccak256` is Solidity's built-in cryptographic hash function (from the SHA-3 family). In `registerCandidate()`, we hash the candidate's name: `bytes32 nameHash = keccak256(abi.encodePacked(_name))` and store it in a mapping to prevent duplicate candidate names. Comparing hashes is much cheaper in gas than comparing full strings.

### Q10: What are events in Solidity? Why use `emit`?
**A:** Events are logs stored on the blockchain that the frontend can listen to. They're cheaper than storing data in state variables. Example:
```solidity
event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address indexed voter, uint256 timestamp);
emit VoteCast(_electionId, _candidateId, msg.sender, block.timestamp);
```
The `indexed` keyword allows filtering events by those parameters. The frontend uses Ethers.js to listen for these events in real-time.

### Q11: What is Truffle and why use it?
**A:** Truffle is a development framework for Ethereum that provides:
- **Compilation** — converts Solidity to EVM bytecode + ABI
- **Migration** — deploys contracts to the blockchain in a specific order
- **Testing** — Mocha/Chai test framework for smart contracts
- **Console** — interactive REPL to manually test contract functions
- **Network management** — configure multiple deployment targets (local, testnet, mainnet)

### Q12: What is Ganache?
**A:** Ganache is a personal Ethereum blockchain for development. It creates 10 accounts with 100 ETH each, mines blocks instantly, and runs on `localhost:8545`. When you restart it, all data is lost (fresh blockchain). This is why we need `truffle migrate --reset` after every restart.

### Q13: What is an ABI?
**A:** ABI (Application Binary Interface) is a JSON file generated by the Solidity compiler that describes a contract's functions, their parameters, and return types. The frontend (Ethers.js) uses the ABI to know how to encode function calls and decode return values. It's the "instruction manual" for talking to the contract.

### Q14: How do you prevent double voting?
**A:**
```solidity
require(!voter.hasVoted, "Wallet has already voted in this election");
voter.hasVoted = true;  // immediately mark as voted
```
Each voter's `VoterInfo` struct has a `hasVoted` boolean. Once set to `true`, any subsequent `castVote()` call from the same wallet for the same election will revert.

### Q15: What is the Checks-Effects-Interactions pattern?
**A:** It's a security best practice:
1. **Checks** — validate all conditions with `require`
2. **Effects** — update your contract's state variables
3. **Interactions** — make external calls (like sending ETH or calling other contracts)
This order prevents reentrancy attacks because by the time an external call happens, your state is already updated.

### Q16: What is `basis points` and why use it instead of percentage?
**A:** Basis points (bps) allow representing percentages with decimal precision using only integers (Solidity doesn't have floating-point numbers). 10000 bps = 100.00%. So `6666 bps = 66.66%`. The frontend divides by 100 to get the percentage: `(turnoutBasisPoints / 100).toFixed(2)`.

### Q17: What happens if MetaMask is on the wrong network?
**A:** The `connectMetaMaskWallet()` function automatically calls `wallet_switchEthereumChain` to switch MetaMask to chain ID 1337 (Ganache). If the chain doesn't exist, it calls `wallet_addEthereumChain` to add it. The user just needs to approve the popup.

### Q18: What is `address(0)` and why check for it?
**A:** `address(0)` is `0x0000000000000000000000000000000000000000` — the "zero address". It's an invalid/burn address. Sending ETH to it means losing it forever. We check `require(_voter != address(0))` to prevent accidentally registering a non-existent wallet.
