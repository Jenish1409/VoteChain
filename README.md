# VoteChain 2.0 — Decentralized, Transparent & Auditable Election Management System

## 1. Project Introduction & Problem Statement

### Problem Statement
Traditional online voting systems rely on centralized relational databases controlled by a single system administrator. Centralization introduces critical vulnerabilities: privileged insiders can alter candidate records, inject synthetic ballots, modify vote tallies without detection, or retroactively delete audit logs. Conversely, naive blockchain voting prototypes often lack proper election time-window enforcement, allow candidate tampering after voting begins, omit separated audit trails, or fail to handle tied election outcomes deterministically.

### Proposed Solution: VoteChain 2.0
**VoteChain 2.0** is a decentralized election management platform built on **Solidity (`^0.8.20`)**, **Truffle Framework**, **Ganache**, **Ethers.js v6**, and **React + Vite + Tailwind CSS**. All election rules, candidate registration locks, wallet-level voter whitelists, single-ballot enforcement, tie-aware results calculation, and administrative test-Ether treasury operations are executed deterministically by smart contracts on the Ethereum Virtual Machine (EVM). Every state-changing operation in `ElectionManager.sol` invokes a dedicated `AuditLogger.sol` contract atomically via a contract-to-contract call, producing a tamper-evident on-chain audit trail.

### Academic Prototype Scope & Honest Security Framing
- **Wallet Eligibility vs. Civil Identity**: VoteChain 2.0 enforces *wallet-level cryptographic eligibility* (`msg.sender` signature verification via MetaMask). A wallet address proves control of a private key, not real-world biometric or government identity.
- **Pseudonymity vs. Zero-Knowledge Anonymity**: Blockchain transactions are publicly verifiable and pseudonymous. To minimize unnecessary on-chain exposure, `AuditLogger.sol` records voter participation (`"VOTE_CAST"`) without writing the chosen candidate ID into the audit detail string, and no off-chain PII (names, national IDs, passwords) is ever stored on-chain.

## 2. Mandatory College Assignment Requirements Mapping

This table maps all 9 mandatory college evaluation criteria to exact files, line numbers, and functions in VoteChain 2.0:

| # | College Requirement | Implementation Location | Contract / Component Function & Explanation |
| :--- | :--- | :--- | :--- |
| **1** | **Properly Written Smart Contract** | `contracts/ElectionManager.sol` & `contracts/AuditLogger.sol` | Two modular Solidity `^0.8.20` smart contracts using `struct`, nested `mapping`, arrays, custom `modifier` guards (`onlyAdmin`, `electionExists`, `nonReentrant`, `onlyOwner`, `onlyAuthorizedCaller`), and indexed `event` emissions. |
| **2** | **Connect Wallet** | `client/src/services/blockchain.js` & `client/src/components/WalletConnect.jsx` | Connects MetaMask via `new BrowserProvider(window.ethereum)`, requests accounts (`eth_requestAccounts`), detects Ganache network/chain ID, and subscribes to `accountsChanged` and `chainChanged`. |
| **3** | **One Function (State-Changing)** | `contracts/ElectionManager.sol` | Implements 9 state-changing operations: `createElection`, `registerCandidate`, `registerVoter`, `registerVotersBatch`, `setElectionActiveStatus`, `closeElection`, `castVote`, `depositTreasury`, and `withdrawTreasury`. |
| **4** | **One Constructor** | `contracts/AuditLogger.sol` & `contracts/ElectionManager.sol` | `AuditLogger.constructor()` initializes `owner = msg.sender`; `ElectionManager.constructor(address _auditLoggerAddress)` validates non-zero address, initializes `admin = msg.sender`, and binds the `IAuditLogger` contract interface. |
| **5** | **Table Function (Structs & Mappings)** | `contracts/ElectionManager.sol` & `client/src/components/{CandidateTable,VoterTable,TransactionTable}.jsx` | Solidity `view` functions (`getElectionCandidates`, `getElectionVoters`, `getAllAuditRecords`, `getAllTreasuryTransactions`) return struct arrays rendered directly in React tables. |
| **6** | **Contract-to-Account & Contract-to-Contract** | `contracts/ElectionManager.sol` & `contracts/AuditLogger.sol` | **Contract-to-Account**: `withdrawTreasury` transfers test Ether from `ElectionManager` to a recipient EOA via `.call{value: _amount}("")`. **Contract-to-Contract**: `ElectionManager` calls `auditLogger.logAction(...)` atomically on every state change. |
| **7** | **`require` Keyword** | `contracts/ElectionManager.sol` & `contracts/AuditLogger.sol` | 28+ descriptive `require(...)` statements enforcing admin access, candidate registration locks prior to `startTime`, voter whitelist verification, duplicate vote rejection, valid candidate IDs, zero-address rejection, and treasury balance checks. |
| **8** | **`pure` or `view` Keyword** | `contracts/ElectionManager.sol` | `pure` function `calculateTurnoutBasisPoints(uint256, uint256)` computes voter turnout percentage in basis points; `view` functions (`getAllElections`, `getElectionPhase`, `getElectionResultsSummary`, `getTreasuryBalance`) query state without gas cost. |
| **9** | **Truffle Framework** | `truffle-config.js`, `migrations/2_deploy_contracts.js`, `test/votechain.test.js` | Full Truffle configuration for Ganache (`127.0.0.1:7545`), ordered 3-step contract deployment & authorization migration, and a Mocha/Chai automated test suite (`truffle test`). |

## 3. Project Folder Structure

```text
votechain-2.0/
├── contracts/
│   ├── AuditLogger.sol              # Immutable on-chain audit trail smart contract
│   ├── ElectionManager.sol          # Primary election, voting, results & treasury contract
│   └── Migrations.sol               # Truffle deployment state tracking contract
├── migrations/
│   ├── 1_initial_migration.js       # Deploys Migrations.sol
│   └── 2_deploy_contracts.js        # Deploys AuditLogger, ElectionManager & links authorization
├── test/
│   └── votechain.test.js            # Automated Mocha/Chai test suite for `truffle test`
├── client/                          # React 18 + Vite + Tailwind CSS + Ethers.js v6 Frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── contracts/               # Truffle ABI & network deployment artifacts
│       │   ├── AuditLogger.json
│       │   └── ElectionManager.json
│       ├── services/
│       │   └── blockchain.js        # Ethers.js v6 BrowserProvider, Signer & contract wrappers
│       ├── context/
│       │   └── Web3Context.jsx      # Global wallet, role, notification & state sync context
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── WalletConnect.jsx
│       │   ├── ElectionCard.jsx
│       │   ├── CandidateCard.jsx
│       │   ├── CandidateTable.jsx
│       │   ├── VoterTable.jsx
│       │   ├── ResultsChart.jsx
│       │   ├── TransactionTable.jsx
│       │   ├── ProtectedAdminRoute.jsx
│       │   ├── Notification.jsx
│       │   └── ConfirmationModal.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── Dashboard.jsx
│           ├── Elections.jsx
│           ├── ElectionDetails.jsx
│           ├── VotingInterface.jsx
│           ├── ResultsDashboard.jsx
│           ├── AdminDashboard.jsx
│           ├── AuditHistory.jsx
│           └── Treasury.jsx
├── truffle-config.js                # Truffle compiler (0.8.20) & Ganache network configuration
├── package.json                     # Root scripts & Truffle devDependencies
└── README.md                        # Complete project documentation & viva guide
```

## 4. Step-by-Step Installation & Execution (Windows PowerShell)

### Prerequisites
- **Node.js** (v18+ LTS recommended)
- **Truffle** (`npm install -g truffle`)
- **Ganache GUI** (running on `http://127.0.0.1:7545`)
- **MetaMask Browser Extension**

### Step 1: Configure Ganache Local Blockchain
1. Open **Ganache GUI** and click **New Workspace (Ethereum)**.
2. Navigate to the **Server** tab and set:
   - **Host Name**: `127.0.0.1`
   - **Port Number**: `7545`
   - **Network ID**: `5777` (or `1337`)
3. Save and start the workspace. Note **Account #0** (this will be the `admin` deployer account) and **Accounts #1–#4** (test voter and treasury recipient accounts).

### Step 2: Install Dependencies, Compile & Deploy Smart Contracts (PowerShell)

Open **Windows PowerShell** in the `votechain-2.0` project root and run:

```powershell
# 1. Install root Truffle & Chai testing dependencies
npm install

# 2. Compile AuditLogger.sol and ElectionManager.sol with Solidity 0.8.20
npx truffle compile

# 3. Deploy contracts to Ganache and authorize ElectionManager inside AuditLogger
npx truffle migrate --reset --network development

# 4. Run the automated Mocha/Chai test suite
npx truffle test
```

### Step 3: Configure MetaMask for Ganache
1. Open MetaMask in your browser → **Networks** → **Add Network** → **Add a network manually**:
   - **Network Name**: `Ganache Localhost 7545`
   - **New RPC URL**: `http://127.0.0.1:7545`
   - **Chain ID**: `1337` (if Ganache prompts a chain ID mismatch, use `5777`)
   - **Currency Symbol**: `ETH`
2. In Ganache, click the **Key icon** next to **Account #0** (Admin) and **Account #1 / #2** (Voters), copy each Private Key, and import them into MetaMask via **Add account or hardware wallet → Import account**.

### Step 4: Launch the React + Vite Frontend (PowerShell)

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser and click **Connect MetaMask**.

## 5. End-to-End College Evaluation Demonstration Workflow

1. **Connect as Administrator (Account #0)**:
   - Connect MetaMask using Account #0. Notice the top badge displays `ADMIN`.
   - Open **Admin Console** (`/admin`) and create an election (e.g., *Student Council Presidency 2026*, starting in 1 minute, duration 60 minutes).
   - Register 2–3 candidates while the election is still in the `UPCOMING` phase.
   - Whitelist Voter Accounts #1, #2, and #3 using either single or batch voter registration.
2. **Verify Pre-Vote & Post-Start Security Guards**:
   - Once the start time arrives (phase changes to `ACTIVE`), try registering another candidate in Admin Console — `ElectionManager.sol` reverts with `"ElectionManager: Cannot modify candidates after voting starts"`.
3. **Switch to Voter Accounts (#1 & #2) & Cast Votes**:
   - Switch MetaMask to Account #1 (`VOTER` badge). Open **Voting Booth** (`/voting`), select a candidate, confirm in the modal, and sign in MetaMask.
   - Observe the transaction hash banner and live tally update. Try voting a second time from Account #1 — `ElectionManager.sol` reverts with `"ElectionManager: Wallet has already voted in this election"`.
   - Switch to Account #2 and vote for another candidate to demonstrate **Tie Detection** (`isTie == true`) on the **Results & Analytics** (`/results`) page.
4. **Demonstrate Contract-to-Contract Audit Trail**:
   - Navigate to **Audit Trail** (`/audit`) and inspect all chronological `AuditRecord` entries written from `ElectionManager.sol` to `AuditLogger.sol`.
5. **Demonstrate Contract-to-Account Ether Treasury**:
   - Switch back to Account #0 (`ADMIN`), open **Ether Treasury** (`/treasury`), deposit `2.0 ETH` into the contract, and then withdraw `0.5 ETH` to Account #4's address. Verify both the recipient wallet's ETH balance increase and the new `WITHDRAWAL` record in the treasury table.

## 6. Viva Voce Questions & Answers for Evaluation

1. **Q: Why did you separate `ElectionManager.sol` and `AuditLogger.sol` instead of keeping everything in a single contract?**
   - **A:** Separating `AuditLogger.sol` demonstrates modular smart contract architecture and real **Contract-to-Contract** interaction via the `IAuditLogger` interface. `AuditLogger` enforces `onlyAuthorizedCaller` so external users cannot forge audit entries, while keeping audit storage and indexing cleanly decoupled from election logic.
2. **Q: How did you avoid circular dependencies during Truffle deployment?**
   - **A:** In `migrations/2_deploy_contracts.js`, we deploy `AuditLogger` first, pass `auditLogger.address` into the `ElectionManager` constructor, and then call `auditLogger.setAuthorizedCaller(electionManager.address)` in step 3.
3. **Q: Why do you use nested mappings (`mapping(uint256 => mapping(address => VoterInfo))`) AND an address array (`mapping(uint256 => address[])`)?**
   - **A:** Solidity mappings do not support iteration, which is needed to display the `VoterTable` in React. However, iterating over an array inside `castVote` would cost $O(N)$ gas and risk hitting the block gas limit. Using the nested mapping gives $O(1)$ constant-time gas lookups for security checks inside `castVote`, while the address array is only looped inside `getElectionVoters`, which is a free `view` call.
4. **Q: How is the treasury withdrawal protected against Reentrancy attacks?**
   - **A:** `withdrawTreasury` uses a `nonReentrant` mutex modifier and strictly follows the **Checks-Effects-Interactions (CEI)** pattern: it validates the balance and recipient (`Checks`), updates `treasuryTxCount`, `totalTreasuryWithdrawn`, and calls `AuditLogger` (`Effects`), and only then executes `(bool success, ) = _recipient.call{value: _amount}("")` (`Interactions`).
5. **Q: Where are `view` and `pure` functions used in your contracts?**
   - **A:** `calculateTurnoutBasisPoints(uint256 _votesCast, uint256 _registeredVoters)` is a `pure` function because it neither reads nor modifies contract storage—it computes `(votesCast * 10000) / registeredVoters` purely from its parameters. Functions like `getAllElections()`, `getElectionResultsSummary()`, and `getAllAuditRecords()` are `view` functions because they read state variables without modifying them.
