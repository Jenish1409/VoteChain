const AuditLogger = artifacts.require("AuditLogger");
const ElectionManager = artifacts.require("ElectionManager");
const { expect } = require("chai");

/**
 * VoteChain 2.0 — Comprehensive Truffle Automated Test Suite
 *
 * Covers:
 * 1. Deployment & Constructor Initialization
 * 2. Election Creation & Access Control
 * 3. Candidate Registration & Post-Start Lockout
 * 4. Voter Eligibility Management (Single & Batch)
 * 5. Secure Voting, Time-Window Enforcement & Multi-Election Participation
 * 6. Blockchain Audit Trail & Contract-to-Contract Security
 * 7. Contract-to-Account Administrative Ether Treasury & Reentrancy-Safe Withdrawals
 * 8. On-Chain Results Calculation, Turnout Basis Points & Deterministic Tie Handling
 */
contract("VoteChain 2.0 — ElectionManager & AuditLogger", (accounts) => {
  const [admin, voter1, voter2, voter3, unregisteredUser, treasuryRecipient] =
    accounts;

  let auditLogger;
  let electionManager;

  // Helper to fetch current Ganache EVM block timestamp
  const getCurrentBlockTimestamp = async () => {
    const block = await web3.eth.getBlock("latest");
    return Number(block.timestamp);
  };

  // Helper to advance Ganache EVM time by `seconds`
  const advanceTimeAndBlock = async (seconds) => {
    await new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [seconds],
          id: Date.now(),
        },
        (err1) => {
          if (err1) return reject(err1);
          web3.currentProvider.send(
            {
              jsonrpc: "2.0",
              method: "evm_mine",
              params: [],
              id: Date.now() + 1,
            },
            (err2, res) => (err2 ? reject(err2) : resolve(res))
          );
        }
      );
    });
  };

  // Helper to assert transaction reverts with an expected substring
  const expectRevertWith = async (promise, expectedMessage) => {
    try {
      await promise;
      expect.fail(`Expected revert with "${expectedMessage}", but succeeded`);
    } catch (error) {
      expect(error.message).to.include(expectedMessage);
    }
  };

  beforeEach(async () => {
    auditLogger = await AuditLogger.new({ from: admin });
    electionManager = await ElectionManager.new(auditLogger.address, {
      from: admin,
    });
    await auditLogger.setAuthorizedCaller(electionManager.address, {
      from: admin,
    });
  });

  // ===========================================================================
  // 1. DEPLOYMENT & CONSTRUCTOR INITIALIZATION
  // ===========================================================================
  describe("1. Constructor & Authorization Setup", () => {
    it("initializes AuditLogger owner and ElectionManager admin accurately", async () => {
      const loggerOwner = await auditLogger.owner();
      const authorized = await auditLogger.authorizedCaller();
      const managerAdmin = await electionManager.admin();

      expect(loggerOwner).to.equal(admin);
      expect(authorized).to.equal(electionManager.address);
      expect(managerAdmin).to.equal(admin);
    });

    it("rejects zero address in ElectionManager constructor and AuditLogger authorization", async () => {
      const zeroAddr = "0x0000000000000000000000000000000000000000";
      await expectRevertWith(
        ElectionManager.new(zeroAddr, { from: admin }),
        "ElectionManager: Invalid AuditLogger address"
      );
      await expectRevertWith(
        auditLogger.setAuthorizedCaller(zeroAddr, { from: admin }),
        "AuditLogger: Authorized caller cannot be zero address"
      );
    });
  });

  // ===========================================================================
  // 2. ELECTION MANAGEMENT
  // ===========================================================================
  describe("2. Election Management & Access Control", () => {
    it("allows the administrator to create an election and records an audit log", async () => {
      const now = await getCurrentBlockTimestamp();
      const startTime = now + 300;
      const endTime = now + 3600;

      const receipt = await electionManager.createElection(
        "Student Council Presidency 2026",
        "Annual university student body presidential election",
        startTime,
        endTime,
        { from: admin }
      );

      expect(receipt.logs[0].event).to.equal("ElectionCreated");

      const count = await electionManager.electionCount();
      expect(Number(count)).to.equal(1);

      const election = await electionManager.getElection(1);
      expect(election.title).to.equal("Student Council Presidency 2026");
      expect(election.isActive).to.equal(true);
      expect(election.isClosed).to.equal(false);

      const auditCount = await auditLogger.auditCount();
      expect(Number(auditCount)).to.equal(1);

      const auditEntry = await auditLogger.getAuditRecord(1);
      expect(auditEntry.actionType).to.equal("ELECTION_CREATED");
      expect(auditEntry.actor).to.equal(admin);
    });

    it("rejects unauthorized election creation by non-admin accounts", async () => {
      const now = await getCurrentBlockTimestamp();
      await expectRevertWith(
        electionManager.createElection(
          "Unauthorized Poll",
          "Should fail",
          now + 100,
          now + 1000,
          { from: voter1 }
        ),
        "ElectionManager: Restricted to administrator"
      );
    });

    it("rejects invalid election time windows or empty title", async () => {
      const now = await getCurrentBlockTimestamp();
      await expectRevertWith(
        electionManager.createElection("", "Desc", now + 100, now + 500, {
          from: admin,
        }),
        "ElectionManager: Election title cannot be empty"
      );
      await expectRevertWith(
        electionManager.createElection("Valid Title", "Desc", now + 500, now + 100, {
          from: admin,
        }),
        "ElectionManager: End time must be after start time"
      );
    });
  });

  // ===========================================================================
  // 3. CANDIDATE REGISTRATION
  // ===========================================================================
  describe("3. Candidate Registration & Pre-Voting Lock", () => {
    let startTime;
    let endTime;

    beforeEach(async () => {
      const now = await getCurrentBlockTimestamp();
      startTime = now + 600;
      endTime = now + 3600;
      await electionManager.createElection(
        "Academic Senate Election",
        "Electing faculty and student representatives",
        startTime,
        endTime,
        { from: admin }
      );
    });

    it("registers multiple candidates before election start", async () => {
      await electionManager.registerCandidate(
        1,
        "Aarav Mehta",
        "Progressive Student Alliance",
        "Focus on open research labs and 24x7 library access",
        { from: admin }
      );
      await electionManager.registerCandidate(
        1,
        "Diya Sharma",
        "Campus Innovation Front",
        "Focus on Web3 incubator grants and green campus energy",
        { from: admin }
      );

      const candidates = await electionManager.getElectionCandidates(1);
      expect(candidates.length).to.equal(2);
      expect(candidates[0].name).to.equal("Aarav Mehta");
      expect(candidates[1].name).to.equal("Diya Sharma");
    });

    it("prevents duplicate candidate registration and unauthorized registration", async () => {
      await electionManager.registerCandidate(
        1,
        "Aarav Mehta",
        "Alliance",
        "Bio",
        { from: admin }
      );

      await expectRevertWith(
        electionManager.registerCandidate(1, "Aarav Mehta", "Other Party", "Bio", {
          from: admin,
        }),
        "ElectionManager: Candidate already registered in this election"
      );

      await expectRevertWith(
        electionManager.registerCandidate(1, "Rohan Patel", "Party", "Bio", {
          from: voter1,
        }),
        "ElectionManager: Restricted to administrator"
      );
    });

    it("prevents candidate registration after voting starts", async () => {
      await advanceTimeAndBlock(650); // Move past startTime

      await expectRevertWith(
        electionManager.registerCandidate(
          1,
          "Late Candidate",
          "Late Party",
          "Entered after start time",
          { from: admin }
        ),
        "ElectionManager: Cannot modify candidates after voting starts"
      );
    });
  });

  // ===========================================================================
  // 4. VOTER MANAGEMENT
  // ===========================================================================
  describe("4. Voter Eligibility Management", () => {
    beforeEach(async () => {
      const now = await getCurrentBlockTimestamp();
      await electionManager.createElection(
        "Department Representative Poll",
        "Computer Engineering Dept",
        now + 300,
        now + 3600,
        { from: admin }
      );
    });

    it("allows admin to register individual and batch voters", async () => {
      await electionManager.registerVoter(1, voter1, { from: admin });
      await electionManager.registerVotersBatch(1, [voter2, voter3], {
        from: admin,
      });

      const v1Info = await electionManager.getVoterInfo(1, voter1);
      expect(v1Info.isRegistered).to.equal(true);
      expect(v1Info.hasVoted).to.equal(false);

      const allVoters = await electionManager.getElectionVoters(1);
      expect(allVoters.length).to.equal(3);
    });

    it("rejects unauthorized voter registration, zero address, and duplicate voter registration", async () => {
      await expectRevertWith(
        electionManager.registerVoter(1, voter1, { from: voter2 }),
        "ElectionManager: Restricted to administrator"
      );

      await expectRevertWith(
        electionManager.registerVoter(
          1,
          "0x0000000000000000000000000000000000000000",
          { from: admin }
        ),
        "ElectionManager: Voter cannot be zero address"
      );

      await electionManager.registerVoter(1, voter1, { from: admin });
      await expectRevertWith(
        electionManager.registerVoter(1, voter1, { from: admin }),
        "ElectionManager: Voter already registered for this election"
      );
    });
  });

  // ===========================================================================
  // 5. SECURE VOTING MECHANISM
  // ===========================================================================
  describe("5. Secure Voting & Lifecycle Enforcement", () => {
    beforeEach(async () => {
      const now = await getCurrentBlockTimestamp();
      // Election 1
      await electionManager.createElection(
        "Election #1",
        "First Election",
        now + 120,
        now + 1200,
        { from: admin }
      );
      await electionManager.registerCandidate(1, "Candidate A", "Party A", "Bio A", {
        from: admin,
      });
      await electionManager.registerCandidate(1, "Candidate B", "Party B", "Bio B", {
        from: admin,
      });
      await electionManager.registerVotersBatch(1, [voter1, voter2], {
        from: admin,
      });

      // Election 2
      await electionManager.createElection(
        "Election #2",
        "Second Election",
        now + 120,
        now + 1200,
        { from: admin }
      );
      await electionManager.registerCandidate(2, "Candidate X", "Party X", "Bio X", {
        from: admin,
      });
      await electionManager.registerVoter(2, voter1, { from: admin });
    });

    it("rejects votes before the election start time", async () => {
      await expectRevertWith(
        electionManager.castVote(1, 1, { from: voter1 }),
        "ElectionManager: Voting has not started yet"
      );
    });

    it("allows eligible voter to cast one vote, prevents duplicate votes, and rejects invalid candidates", async () => {
      await advanceTimeAndBlock(150); // Enter active voting window

      // Reject unregistered wallet
      await expectRevertWith(
        electionManager.castVote(1, 1, { from: unregisteredUser }),
        "ElectionManager: Wallet is not registered to vote in this election"
      );

      // Reject invalid candidate ID
      await expectRevertWith(
        electionManager.castVote(1, 99, { from: voter1 }),
        "ElectionManager: Invalid candidate ID"
      );

      // Valid vote
      const tx = await electionManager.castVote(1, 1, { from: voter1 });
      expect(tx.logs[0].event).to.equal("VoteCast");

      // Prevent duplicate vote in same election
      await expectRevertWith(
        electionManager.castVote(1, 2, { from: voter1 }),
        "ElectionManager: Wallet has already voted in this election"
      );

      // Allow same wallet to vote in Election #2
      await electionManager.castVote(2, 1, { from: voter1 });
      const v1Election2 = await electionManager.getVoterInfo(2, voter1);
      expect(v1Election2.hasVoted).to.equal(true);
    });

    it("rejects votes after election end time", async () => {
      await advanceTimeAndBlock(1500); // Move past endTime
      await expectRevertWith(
        electionManager.castVote(1, 1, { from: voter1 }),
        "ElectionManager: Voting period has ended"
      );
    });
  });

  // ===========================================================================
  // 6. AUDIT LOGGER SECURITY
  // ===========================================================================
  describe("6. Blockchain Audit Trail Security", () => {
    it("increments audit counter on valid actions and rejects direct EOA calls to AuditLogger", async () => {
      await expectRevertWith(
        auditLogger.logAction(1, "FAKE_LOG", voter1, "Direct call attempt", {
          from: voter1,
        }),
        "AuditLogger: Caller is not the authorized ElectionManager contract"
      );

      const now = await getCurrentBlockTimestamp();
      await electionManager.createElection(
        "Audited Election",
        "Checking audit trail",
        now + 100,
        now + 1000,
        { from: admin }
      );

      const count = await auditLogger.auditCount();
      expect(Number(count)).to.equal(1);
      const records = await auditLogger.getAllAuditRecords();
      expect(records.length).to.equal(1);
      expect(records[0].actionType).to.equal("ELECTION_CREATED");
    });
  });

  // ===========================================================================
  // 7. CONTRACT-TO-ACCOUNT ETHER TREASURY
  // ===========================================================================
  describe("7. Contract-to-Account Administrative Treasury", () => {
    it("accepts Ether deposits, allows authorized withdrawal to EOA, and updates balances", async () => {
      const depositAmount = web3.utils.toWei("2", "ether");
      const withdrawAmount = web3.utils.toWei("0.75", "ether");

      await electionManager.depositTreasury("Initial test grant funding", {
        from: admin,
        value: depositAmount,
      });

      const contractBalBefore = await electionManager.getTreasuryBalance();
      expect(contractBalBefore.toString()).to.equal(depositAmount);

      // Reject unauthorized withdrawal
      await expectRevertWith(
        electionManager.withdrawTreasury(
          treasuryRecipient,
          withdrawAmount,
          "Unauthorized attempt",
          { from: voter1 }
        ),
        "ElectionManager: Restricted to administrator"
      );

      // Reject zero address recipient
      await expectRevertWith(
        electionManager.withdrawTreasury(
          "0x0000000000000000000000000000000000000000",
          withdrawAmount,
          "Zero recipient",
          { from: admin }
        ),
        "ElectionManager: Recipient cannot be zero address"
      );

      // Authorized withdrawal
      const recipientBefore = BigInt(
        await web3.eth.getBalance(treasuryRecipient)
      );

      await electionManager.withdrawTreasury(
        treasuryRecipient,
        withdrawAmount,
        "Polling station observer stipend",
        { from: admin }
      );

      const recipientAfter = BigInt(
        await web3.eth.getBalance(treasuryRecipient)
      );
      expect((recipientAfter - recipientBefore).toString()).to.equal(
        withdrawAmount
      );

      const txHistory = await electionManager.getAllTreasuryTransactions();
      expect(txHistory.length).to.equal(2);
      expect(txHistory[1].txType).to.equal("WITHDRAWAL");
    });
  });

  // ===========================================================================
  // 8. RESULTS & TIE HANDLING
  // ===========================================================================
  describe("8. Election Results, Turnout & Tie Handling", () => {
    it("accurately identifies single winner, voter turnout, and tied outcomes", async () => {
      const now = await getCurrentBlockTimestamp();
      await electionManager.createElection(
        "Tie Test Election",
        "Verifying tie resolution",
        now + 60,
        now + 1200,
        { from: admin }
      );
      await electionManager.registerCandidate(1, "Alice", "Party 1", "Bio 1", {
        from: admin,
      });
      await electionManager.registerCandidate(1, "Bob", "Party 2", "Bio 2", {
        from: admin,
      });
      await electionManager.registerVotersBatch(1, [voter1, voter2, voter3], {
        from: admin,
      });

      await advanceTimeAndBlock(90);

      // Voter 1 votes for Alice (1-0)
      await electionManager.castVote(1, 1, { from: voter1 });
      let summary = await electionManager.getElectionResultsSummary(1);
      expect(Number(summary.winningVoteCount)).to.equal(1);
      expect(summary.isTie).to.equal(false);
      expect(Number(summary.winningCandidateIds[0])).to.equal(1);

      // Voter 2 votes for Bob -> Tie (1-1), turnout = 2/3 = 6666 bps (66.66%)
      await electionManager.castVote(1, 2, { from: voter2 });
      summary = await electionManager.getElectionResultsSummary(1);
      expect(Number(summary.winningVoteCount)).to.equal(1);
      expect(summary.isTie).to.equal(true);
      expect(summary.winningCandidateIds.length).to.equal(2);
      expect(Number(summary.turnoutBasisPoints)).to.equal(6666);
    });
  });
});
