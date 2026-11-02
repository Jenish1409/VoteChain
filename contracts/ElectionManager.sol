// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAuditLogger {
    function logAction(
        uint256 _electionId,
        string calldata _actionType,
        address _actor,
        string calldata _details
    ) external returns (uint256);
}

/**
 * @title ElectionManager
 * @notice Primary smart contract for VoteChain 2.0 managing multiple elections, candidate registration,
 *         wallet-level voter eligibility, tamper-evident vote casting, tie-aware results calculation,
 *         contract-to-contract audit logging, and an administrative test-Ether treasury.
 */
contract ElectionManager {
    struct Election {
        uint256 electionId;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isClosed;
        bool exists;
        uint256 candidateCount;
        uint256 registeredVoters;
        uint256 totalVotes;
    }

    struct Candidate {
        uint256 candidateId;
        uint256 electionId;
        string name;
        string partyName;
        string description;
        uint256 voteCount;
        bool exists;
    }

    struct VoterInfo {
        address voterAddress;
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
        uint256 votedAt;
    }

    struct TreasuryTransaction {
        uint256 txId;
        string txType;
        address counterparty;
        uint256 amount;
        string purpose;
        uint256 timestamp;
    }

    address public admin;
    IAuditLogger public auditLogger;

    uint256 public electionCount;
    uint256 public treasuryTxCount;
    uint256 public totalTreasuryDeposited;
    uint256 public totalTreasuryWithdrawn;

    bool private locked;

    // electionId => Election
    mapping(uint256 => Election) private elections;

    // electionId => candidateId => Candidate
    mapping(uint256 => mapping(uint256 => Candidate)) private candidates;

    // electionId => keccak256(name) => bool (prevents duplicate candidate registration in same election)
    mapping(uint256 => mapping(bytes32 => bool)) private candidateNameExists;

    // electionId => voterAddress => VoterInfo
    mapping(uint256 => mapping(address => VoterInfo)) private voters;

    // electionId => array of registered voter addresses (for table rendering)
    mapping(uint256 => address[]) private electionVoterList;

    // txId => TreasuryTransaction
    mapping(uint256 => TreasuryTransaction) private treasuryHistory;

    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        uint256 startTime,
        uint256 endTime,
        address indexed admin
    );

    event CandidateRegistered(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        string name,
        string partyName
    );

    event VoterRegistered(
        uint256 indexed electionId,
        address indexed voter
    );

    event ElectionStatusUpdated(
        uint256 indexed electionId,
        bool isActive,
        bool isClosed
    );

    event VoteCast(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        address indexed voter,
        uint256 timestamp
    );

    event TreasuryDeposited(
        uint256 indexed txId,
        address indexed sender,
        uint256 amount,
        string purpose,
        uint256 newBalance
    );

    event TreasuryWithdrawn(
        uint256 indexed txId,
        address indexed recipient,
        uint256 amount,
        string purpose,
        uint256 newBalance
    );

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "ElectionManager: Restricted to administrator"
        );
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(
            _electionId > 0 &&
                _electionId <= electionCount &&
                elections[_electionId].exists,
            "ElectionManager: Election does not exist"
        );
        _;
    }

    modifier nonReentrant() {
        require(!locked, "ElectionManager: Reentrant call detected");
        locked = true;
        _;
        locked = false;
    }

    /**
     * @notice Initializes ElectionManager with the administrator account and linked AuditLogger contract.
     * @param _auditLoggerAddress Deployed address of AuditLogger.sol
     */
    constructor(address _auditLoggerAddress) {
        require(
            _auditLoggerAddress != address(0),
            "ElectionManager: Invalid AuditLogger address"
        );
        admin = msg.sender;
        auditLogger = IAuditLogger(_auditLoggerAddress);
    }

    // =========================================================================
    // 1. ELECTION MANAGEMENT
    // =========================================================================

    /**
     * @notice Creates a new election with specified start and end timestamps.
     */
    function createElection(
        string calldata _title,
        string calldata _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin returns (uint256 newElectionId) {
        require(
            bytes(_title).length > 0,
            "ElectionManager: Election title cannot be empty"
        );
        require(
            bytes(_description).length > 0,
            "ElectionManager: Election description cannot be empty"
        );
        require(
            _endTime > _startTime,
            "ElectionManager: End time must be after start time"
        );
        require(
            _endTime > block.timestamp,
            "ElectionManager: End time must be in the future"
        );

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

        emit ElectionCreated(
            newElectionId,
            _title,
            _startTime,
            _endTime,
            msg.sender
        );

        auditLogger.logAction(
            newElectionId,
            "ELECTION_CREATED",
            msg.sender,
            string(abi.encodePacked("Created election: ", _title))
        );

        return newElectionId;
    }

    /**
     * @notice Registers a candidate for a specific election prior to the start of voting.
     */
    function registerCandidate(
        uint256 _electionId,
        string calldata _name,
        string calldata _partyName,
        string calldata _description
    )
        external
        onlyAdmin
        electionExists(_electionId)
        returns (uint256 newCandidateId)
    {
        Election storage election = elections[_electionId];
        require(
            !election.isClosed,
            "ElectionManager: Election is closed"
        );
        require(
            block.timestamp < election.startTime && election.totalVotes == 0,
            "ElectionManager: Cannot modify candidates after voting starts"
        );
        require(
            bytes(_name).length > 0,
            "ElectionManager: Candidate name cannot be empty"
        );
        require(
            bytes(_partyName).length > 0,
            "ElectionManager: Party name cannot be empty"
        );

        bytes32 nameHash = keccak256(abi.encodePacked(_name));
        require(
            !candidateNameExists[_electionId][nameHash],
            "ElectionManager: Candidate already registered in this election"
        );

        candidateNameExists[_electionId][nameHash] = true;
        election.candidateCount += 1;
        newCandidateId = election.candidateCount;

        candidates[_electionId][newCandidateId] = Candidate({
            candidateId: newCandidateId,
            electionId: _electionId,
            name: _name,
            partyName: _partyName,
            description: _description,
            voteCount: 0,
            exists: true
        });

        emit CandidateRegistered(
            _electionId,
            newCandidateId,
            _name,
            _partyName
        );

        auditLogger.logAction(
            _electionId,
            "CANDIDATE_REGISTERED",
            msg.sender,
            string(
                abi.encodePacked(
                    "Registered candidate: ",
                    _name,
                    " (",
                    _partyName,
                    ")"
                )
            )
        );

        return newCandidateId;
    }

    /**
     * @notice Enables or pauses an election (cannot reopen a permanently closed election).
     */
    function setElectionActiveStatus(
        uint256 _electionId,
        bool _isActive
    ) external onlyAdmin electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(
            !election.isClosed,
            "ElectionManager: Cannot change status of a closed election"
        );

        election.isActive = _isActive;
        emit ElectionStatusUpdated(_electionId, _isActive, election.isClosed);

        auditLogger.logAction(
            _electionId,
            _isActive ? "ELECTION_ACTIVATED" : "ELECTION_PAUSED",
            msg.sender,
            _isActive
                ? "Administrator activated election"
                : "Administrator paused election"
        );
    }

    /**
     * @notice Permanently closes an election and finalizes results.
     */
    function closeElection(
        uint256 _electionId
    ) external onlyAdmin electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(
            !election.isClosed,
            "ElectionManager: Election is already closed"
        );

        election.isClosed = true;
        election.isActive = false;

        emit ElectionStatusUpdated(_electionId, false, true);

        auditLogger.logAction(
            _electionId,
            "ELECTION_CLOSED",
            msg.sender,
            "Administrator permanently closed election"
        );
    }

    // =========================================================================
    // 2. VOTER ELIGIBILITY MANAGEMENT
    // =========================================================================

    /**
     * @notice Whitelists an eligible voter wallet address for a specific election.
     */
    function registerVoter(
        uint256 _electionId,
        address _voter
    ) external onlyAdmin electionExists(_electionId) {
        _registerSingleVoter(_electionId, _voter);

        auditLogger.logAction(
            _electionId,
            "VOTER_REGISTERED",
            msg.sender,
            "Registered eligible voter wallet address"
        );
    }

    /**
     * @notice Whitelists multiple voter wallet addresses in a single transaction.
     */
    function registerVotersBatch(
        uint256 _electionId,
        address[] calldata _voterAddresses
    ) external onlyAdmin electionExists(_electionId) {
        require(
            _voterAddresses.length > 0,
            "ElectionManager: Voter batch cannot be empty"
        );
        for (uint256 i = 0; i < _voterAddresses.length; i++) {
            _registerSingleVoter(_electionId, _voterAddresses[i]);
        }

        auditLogger.logAction(
            _electionId,
            "VOTER_BATCH_REGISTERED",
            msg.sender,
            "Registered batch of eligible voter wallet addresses"
        );
    }

    function _registerSingleVoter(
        uint256 _electionId,
        address _voter
    ) internal {
        Election storage election = elections[_electionId];
        require(
            !election.isClosed,
            "ElectionManager: Election is closed"
        );
        require(
            block.timestamp < election.endTime,
            "ElectionManager: Election has already ended"
        );
        require(
            _voter != address(0),
            "ElectionManager: Voter cannot be zero address"
        );
        require(
            !voters[_electionId][_voter].isRegistered,
            "ElectionManager: Voter already registered for this election"
        );

        voters[_electionId][_voter] = VoterInfo({
            voterAddress: _voter,
            isRegistered: true,
            hasVoted: false,
            votedCandidateId: 0,
            votedAt: 0
        });

        electionVoterList[_electionId].push(_voter);
        election.registeredVoters += 1;

        emit VoterRegistered(_electionId, _voter);
    }

    // =========================================================================
    // 3. SECURE VOTING MECHANISM
    // =========================================================================

    /**
     * @notice Casts a single tamper-evident vote for a candidate in an active election.
     */
    function castVote(
        uint256 _electionId,
        uint256 _candidateId
    ) external electionExists(_electionId) {
        Election storage election = elections[_electionId];

        require(
            election.isActive && !election.isClosed,
            "ElectionManager: Election is not active"
        );
        require(
            block.timestamp >= election.startTime,
            "ElectionManager: Voting has not started yet"
        );
        require(
            block.timestamp <= election.endTime,
            "ElectionManager: Voting period has ended"
        );
        require(
            election.candidateCount > 0,
            "ElectionManager: No candidates registered"
        );

        VoterInfo storage voter = voters[_electionId][msg.sender];
        require(
            voter.isRegistered,
            "ElectionManager: Wallet is not registered to vote in this election"
        );
        require(
            !voter.hasVoted,
            "ElectionManager: Wallet has already voted in this election"
        );
        require(
            _candidateId > 0 &&
                _candidateId <= election.candidateCount &&
                candidates[_electionId][_candidateId].exists,
            "ElectionManager: Invalid candidate ID"
        );

        // Update state prior to external AuditLogger call (Checks-Effects-Interactions)
        voter.hasVoted = true;
        voter.votedCandidateId = _candidateId;
        voter.votedAt = block.timestamp;

        candidates[_electionId][_candidateId].voteCount += 1;
        election.totalVotes += 1;

        emit VoteCast(_electionId, _candidateId, msg.sender, block.timestamp);

        // Record vote participation in AuditLogger without exposing candidate choice in audit string
        auditLogger.logAction(
            _electionId,
            "VOTE_CAST",
            msg.sender,
            "Verified eligible wallet cast ballot on-chain"
        );
    }

    // =========================================================================
    // 4. CONTRACT-TO-ACCOUNT INTERACTION (ADMINISTRATIVE ETHER TREASURY)
    // =========================================================================

    /**
     * @notice Allows depositing test Ether into the administrative treasury with a memo.
     */
    function depositTreasury(string calldata _purpose) external payable {
        require(
            msg.value > 0,
            "ElectionManager: Deposit amount must be greater than zero"
        );
        string memory memo = bytes(_purpose).length > 0
            ? _purpose
            : "Administrative test fund deposit";
        _recordTreasuryDeposit(msg.sender, msg.value, memo);
    }

    /**
     * @notice Accepts direct test Ether transfers to the contract.
     */
    receive() external payable {
        require(
            msg.value > 0,
            "ElectionManager: Direct deposit must be greater than zero"
        );
        _recordTreasuryDeposit(
            msg.sender,
            msg.value,
            "Direct Ether transfer to treasury"
        );
    }

    function _recordTreasuryDeposit(
        address _sender,
        uint256 _amount,
        string memory _purpose
    ) internal {
        treasuryTxCount += 1;
        totalTreasuryDeposited += _amount;

        treasuryHistory[treasuryTxCount] = TreasuryTransaction({
            txId: treasuryTxCount,
            txType: "DEPOSIT",
            counterparty: _sender,
            amount: _amount,
            purpose: _purpose,
            timestamp: block.timestamp
        });

        emit TreasuryDeposited(
            treasuryTxCount,
            _sender,
            _amount,
            _purpose,
            address(this).balance
        );

        auditLogger.logAction(
            0,
            "TREASURY_DEPOSIT",
            _sender,
            _purpose
        );
    }

    /**
     * @notice Transfers test Ether from the contract treasury to a specified recipient EOA.
     * @dev Demonstrates Contract-to-Account Ether transfer protected by onlyAdmin and nonReentrant.
     */
    function withdrawTreasury(
        address payable _recipient,
        uint256 _amount,
        string calldata _purpose
    ) external onlyAdmin nonReentrant {
        require(
            _recipient != address(0),
            "ElectionManager: Recipient cannot be zero address"
        );
        require(
            _amount > 0,
            "ElectionManager: Withdrawal amount must be greater than zero"
        );
        require(
            address(this).balance >= _amount,
            "ElectionManager: Insufficient contract treasury balance"
        );

        string memory memo = bytes(_purpose).length > 0
            ? _purpose
            : "Administrative treasury disbursement";

        // Effects before interaction
        treasuryTxCount += 1;
        uint256 currentTxId = treasuryTxCount;
        totalTreasuryWithdrawn += _amount;

        treasuryHistory[currentTxId] = TreasuryTransaction({
            txId: currentTxId,
            txType: "WITHDRAWAL",
            counterparty: _recipient,
            amount: _amount,
            purpose: memo,
            timestamp: block.timestamp
        });

        auditLogger.logAction(
            0,
            "TREASURY_WITHDRAWAL",
            msg.sender,
            memo
        );

        // External call to transfer Ether to recipient EOA
        (bool success, ) = _recipient.call{value: _amount}("");
        require(success, "ElectionManager: Ether transfer failed");

        emit TreasuryWithdrawn(
            currentTxId,
            _recipient,
            _amount,
            memo,
            address(this).balance
        );
    }

    // =========================================================================
    // 5. VIEW & PURE FUNCTIONS (DASHBOARD, TABLES & RESULTS)
    // =========================================================================

    /**
     * @notice Returns full details of a single election.
     */
    function getElection(
        uint256 _electionId
    ) external view electionExists(_electionId) returns (Election memory) {
        return elections[_electionId];
    }

    /**
     * @notice Returns all elections created on the platform.
     */
    function getAllElections() external view returns (Election[] memory) {
        Election[] memory list = new Election[](electionCount);
        for (uint256 i = 1; i <= electionCount; i++) {
            list[i - 1] = elections[i];
        }
        return list;
    }

    /**
     * @notice Computes the current human-readable lifecycle phase of an election.
     */
    function getElectionPhase(
        uint256 _electionId
    ) public view electionExists(_electionId) returns (string memory) {
        Election storage election = elections[_electionId];
        if (election.isClosed) {
            return "CLOSED";
        }
        if (!election.isActive) {
            return "PAUSED";
        }
        if (block.timestamp < election.startTime) {
            return "UPCOMING";
        }
        if (block.timestamp <= election.endTime) {
            return "ACTIVE";
        }
        return "ENDED";
    }

    /**
     * @notice Returns a specific candidate in an election.
     */
    function getCandidate(
        uint256 _electionId,
        uint256 _candidateId
    ) external view electionExists(_electionId) returns (Candidate memory) {
        require(
            _candidateId > 0 &&
                _candidateId <= elections[_electionId].candidateCount &&
                candidates[_electionId][_candidateId].exists,
            "ElectionManager: Invalid candidate ID"
        );
        return candidates[_electionId][_candidateId];
    }

    /**
     * @notice Returns all registered candidates for an election.
     */
    function getElectionCandidates(
        uint256 _electionId
    ) external view electionExists(_electionId) returns (Candidate[] memory) {
        uint256 count = elections[_electionId].candidateCount;
        Candidate[] memory list = new Candidate[](count);
        for (uint256 i = 1; i <= count; i++) {
            list[i - 1] = candidates[_electionId][i];
        }
        return list;
    }

    /**
     * @notice Returns voter registration and voting status for a given wallet address.
     */
    function getVoterInfo(
        uint256 _electionId,
        address _voter
    ) external view electionExists(_electionId) returns (VoterInfo memory) {
        VoterInfo memory info = voters[_electionId][_voter];
        if (!info.isRegistered) {
            return
                VoterInfo({
                    voterAddress: _voter,
                    isRegistered: false,
                    hasVoted: false,
                    votedCandidateId: 0,
                    votedAt: 0
                });
        }
        return info;
    }

    /**
     * @notice Returns all registered voters for an election to populate the React VoterTable.
     */
    function getElectionVoters(
        uint256 _electionId
    ) external view electionExists(_electionId) returns (VoterInfo[] memory) {
        address[] storage addrList = electionVoterList[_electionId];
        VoterInfo[] memory list = new VoterInfo[](addrList.length);
        for (uint256 i = 0; i < addrList.length; i++) {
            list[i] = voters[_electionId][addrList[i]];
        }
        return list;
    }

    /**
     * @notice Pure function to compute voter turnout in basis points (10000 = 100.00%).
     */
    function calculateTurnoutBasisPoints(
        uint256 _votesCast,
        uint256 _registeredVoters
    ) public pure returns (uint256) {
        if (_registeredVoters == 0) {
            return 0;
        }
        return (_votesCast * 10000) / _registeredVoters;
    }

    /**
     * @notice Computes election results, winner(s), tie status, and turnout directly from on-chain tallies.
     */
    function getElectionResultsSummary(
        uint256 _electionId
    )
        external
        view
        electionExists(_electionId)
        returns (
            uint256 winningVoteCount,
            uint256[] memory winningCandidateIds,
            bool isTie,
            bool hasVotes,
            uint256 turnoutBasisPoints
        )
    {
        Election storage election = elections[_electionId];
        turnoutBasisPoints = calculateTurnoutBasisPoints(
            election.totalVotes,
            election.registeredVoters
        );

        if (election.candidateCount == 0 || election.totalVotes == 0) {
            return (0, new uint256[](0), false, false, turnoutBasisPoints);
        }

        uint256 highestVotes = 0;
        uint256 winnerCount = 0;

        for (uint256 i = 1; i <= election.candidateCount; i++) {
            uint256 cVotes = candidates[_electionId][i].voteCount;
            if (cVotes > highestVotes) {
                highestVotes = cVotes;
                winnerCount = 1;
            } else if (cVotes == highestVotes && highestVotes > 0) {
                winnerCount += 1;
            }
        }

        uint256[] memory winners = new uint256[](winnerCount);
        uint256 idx = 0;
        for (uint256 i = 1; i <= election.candidateCount; i++) {
            if (candidates[_electionId][i].voteCount == highestVotes) {
                winners[idx] = i;
                idx += 1;
            }
        }

        return (
            highestVotes,
            winners,
            winnerCount > 1,
            true,
            turnoutBasisPoints
        );
    }

    /**
     * @notice Returns the current Ether balance held in the ElectionManager treasury.
     */
    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns all treasury deposit and withdrawal records for the React TransactionTable.
     */
    function getAllTreasuryTransactions()
        external
        view
        returns (TreasuryTransaction[] memory)
    {
        TreasuryTransaction[] memory list = new TreasuryTransaction[](
            treasuryTxCount
        );
        for (uint256 i = 1; i <= treasuryTxCount; i++) {
            list[i - 1] = treasuryHistory[i];
        }
        return list;
    }
}
